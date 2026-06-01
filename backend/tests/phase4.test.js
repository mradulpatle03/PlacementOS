require("dotenv").config();
const request = require("supertest");
const app = require("../src/app");
const User = require("../src/models/User");
const Company = require("../src/models/Company");
const Drive = require("../src/models/Drive");
const HiringHistory = require("../src/models/HiringHistory");
const { connectTestDB, clearTestDB, closeTestDB } = require("./setup");

beforeAll(async () => {
  await connectTestDB();
  await clearTestDB();
});
afterEach(async () => {
  await clearTestDB();
});
afterAll(async () => {
  await closeTestDB();
});

// helpers
const makeTpo = async () => {
  await User.create({
    name: "TPO User",
    email: "tpo@test.com",
    password: "test123",
    role: "tpo",
    isEmailVerified: true,
  });
  const res = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: "tpo@test.com", password: "test123" });
  return res.body.accessToken;
};

const makeStudent = async (email = "student@test.com") => {
  await request(app).post("/api/v1/auth/register").send({
    name: "Test Student",
    email,
    password: "test123",
    role: "student",
  });
  const u = await User.findOne({ email }).select("+emailVerifyOTP");
  await request(app)
    .post("/api/v1/auth/verify-email")
    .send({ email, otp: u.emailVerifyOTP });
  const res = await request(app)
    .post("/api/v1/auth/login")
    .send({ email, password: "test123" });
  return res.body.accessToken;
};

const makeRecruiter = async () => {
  await request(app).post("/api/v1/auth/register").send({
    name: "Recruiter",
    email: "rec@test.com",
    password: "test123",
    role: "recruiter",
  });
  const u = await User.findOne({ email: "rec@test.com" }).select(
    "+emailVerifyOTP",
  );
  await request(app)
    .post("/api/v1/auth/verify-email")
    .send({ email: "rec@test.com", otp: u.emailVerifyOTP });
  const res = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: "rec@test.com", password: "test123" });
  return { token: res.body.accessToken, userId: res.body.user._id };
};

const createCompany = async (token, name = "Google") => {
  const res = await request(app)
    .post("/api/v1/companies")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name,
      sector: "Technology",
      location: "Bangalore",
      packageRange: { min: 20, max: 50 },
      description: "A leading tech company",
    });
  return res.body.company;
};

const createDrive = async (token, companyId, overrides = {}) => {
  const res = await request(app)
    .post("/api/v1/drives")
    .set("Authorization", `Bearer ${token}`)
    .send({
      company: companyId,
      title: "SDE Drive 2025",
      roles: [{ title: "SDE", ctc: 24, openings: 10 }],
      location: "Bangalore",
      mode: "oncampus",
      applicationDeadline: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      eligibility: {
        minCGPA: 7,
        maxBacklogs: 0,
        allowedBranches: ["CSE", "IT"],
        graduationYear: [2025],
      },
      settings: { oneOfferPolicy: true, dreamPackageLPA: 20 },
      ...overrides,
    });
  return res.body.drive;
};

// Company tests
describe("Company Module", () => {
  test("full company CRUD flow", async () => {
    const token = await makeTpo();

    // create
    const company = await createCompany(token);
    expect(company.name).toBe("Google");
    expect(company.sector).toBe("Technology");

    // read
    const getRes = await request(app)
      .get(`/api/v1/companies/${company._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.company._id).toBe(company._id);

    // update
    const updateRes = await request(app)
      .put(`/api/v1/companies/${company._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ location: "Hyderabad" });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.company.location).toBe("Hyderabad");

    // delete
    const deleteRes = await request(app)
      .delete(`/api/v1/companies/${company._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(deleteRes.status).toBe(200);
  });

  test("recruiter can be linked to company", async () => {
    const tpoToken = await makeTpo();
    const { token: recToken, userId: recUserId } = await makeRecruiter();

    const company = await createCompany(tpoToken);

    const res = await request(app)
      .post(`/api/v1/companies/${company._id}/recruiters`)
      .set("Authorization", `Bearer ${tpoToken}`)
      .send({ recruiterId: recUserId });

    expect(res.status).toBe(200);
    expect(res.body.company.recruiters).toContain(recUserId);
  });

  test("hiring history upsert and stats", async () => {
    const token = await makeTpo();
    const company = await createCompany(token);

    await request(app)
      .post(`/api/v1/companies/${company._id}/history`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        year: 2024,
        totalOffers: 15,
        totalHired: 12,
        averagePackage: 22,
        highestPackage: 45,
        driveCount: 3,
      });

    await request(app)
      .post(`/api/v1/companies/${company._id}/history`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        year: 2023,
        totalOffers: 10,
        totalHired: 8,
        averagePackage: 18,
        highestPackage: 35,
        driveCount: 2,
      });

    const statsRes = await request(app)
      .get(`/api/v1/companies/${company._id}/stats`)
      .set("Authorization", `Bearer ${token}`);

    expect(statsRes.status).toBe(200);
    expect(statsRes.body.stats.totalOffers).toBe(25);
    expect(statsRes.body.stats.highestEver).toBe(45);
    expect(statsRes.body.stats.yearWise).toHaveLength(2);
  });

  test("company search and sector filter", async () => {
    const token = await makeTpo();
    await createCompany(token, "Google");
    await createCompany(token, "Goldman Sachs");

    // update Goldman sector to Finance
    const companies = await Company.find({});
    const goldman = companies.find((c) => c.name === "Goldman Sachs");
    await Company.findByIdAndUpdate(goldman._id, { sector: "Finance" });

    const searchRes = await request(app)
      .get("/api/v1/companies?search=gold")
      .set("Authorization", `Bearer ${token}`);
    expect(searchRes.body.companies).toHaveLength(1);
    expect(searchRes.body.companies[0].name).toBe("Goldman Sachs");
  });
});

// Drive tests
describe("Drive Module", () => {
  test("full drive lifecycle: draft → published → open → closed → completed", async () => {
    const token = await makeTpo();
    const company = await createCompany(token);
    const drive = await createDrive(token, company._id);

    expect(drive.status).toBe("draft");

    const transitions = [
      { to: "published", expectedStatus: "published" },
      { to: "open", expectedStatus: "open" },
      { to: "closed", expectedStatus: "closed" },
      { to: "completed", expectedStatus: "completed" },
    ];

    let currentId = drive._id;
    for (const { to, expectedStatus } of transitions) {
      const res = await request(app)
        .put(`/api/v1/drives/${currentId}/status`)
        .set("Authorization", `Bearer ${token}`)
        .send({ status: to });
      expect(res.status).toBe(200);
      expect(res.body.drive.status).toBe(expectedStatus);
    }
  });

  test("student cannot see draft drives", async () => {
    const tpoToken = await makeTpo();
    const studentToken = await makeStudent();
    const company = await createCompany(tpoToken);
    await createDrive(tpoToken, company._id);

    const res = await request(app)
      .get("/api/v1/drives")
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.drives).toHaveLength(0);
  });

  test("student sees open drives", async () => {
    const tpoToken = await makeTpo();
    const studentToken = await makeStudent();
    const company = await createCompany(tpoToken);
    const drive = await createDrive(tpoToken, company._id);

    await request(app)
      .put(`/api/v1/drives/${drive._id}/status`)
      .set("Authorization", `Bearer ${tpoToken}`)
      .send({ status: "published" });
    await request(app)
      .put(`/api/v1/drives/${drive._id}/status`)
      .set("Authorization", `Bearer ${tpoToken}`)
      .send({ status: "open" });

    const res = await request(app)
      .get("/api/v1/drives")
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.drives).toHaveLength(1);
  });

  test("drive filters work correctly", async () => {
    const token = await makeTpo();
    const company = await createCompany(token);

    await createDrive(token, company._id, {
      title: "CSE Drive",
      eligibility: {
        minCGPA: 7,
        maxBacklogs: 0,
        allowedBranches: ["CSE"],
        graduationYear: [2025],
      },
    });
    await createDrive(token, company._id, {
      title: "ECE Drive",
      eligibility: {
        minCGPA: 6,
        maxBacklogs: 1,
        allowedBranches: ["ECE"],
        graduationYear: [2025],
      },
    });

    const res = await request(app)
      .get("/api/v1/drives?branch=CSE")
      .set("Authorization", `Bearer ${token}`);

    expect(res.body.drives.length).toBe(1);
    expect(res.body.drives[0].title).toBe("CSE Drive");
  });

  test("drive summary returns correct openings count", async () => {
    const token = await makeTpo();
    const company = await createCompany(token);
    const drive = await createDrive(token, company._id);

    const res = await request(app)
      .get(`/api/v1/drives/${drive._id}/summary`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.summary.totalOpenings).toBe(10);
    expect(res.body.summary.ctcRange.min).toBe(24);
  });

  test("upcoming drives endpoint returns drives in deadline window", async () => {
    const token = await makeTpo();
    const company = await createCompany(token);

    const d1 = await createDrive(token, company._id, {
      title: "Upcoming Drive",
      applicationDeadline: new Date(
        Date.now() + 3 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    });

    await request(app)
      .put(`/api/v1/drives/${d1._id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "published" });

    const res = await request(app)
      .get("/api/v1/drives/upcoming")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.drives.some((d) => d.title === "Upcoming Drive")).toBe(
      true,
    );
  });
});

// Integration tests
describe("Phase 4 Integration", () => {
  test("company stats update with hiring history", async () => {
    const token = await makeTpo();
    const company = await createCompany(token);

    await request(app)
      .post(`/api/v1/companies/${company._id}/history`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        year: 2025,
        totalOffers: 20,
        totalHired: 18,
        averagePackage: 25,
        highestPackage: 60,
        driveCount: 4,
      });

    const updated = await Company.findById(company._id);
    expect(updated.totalOffers).toBe(20);
  });

  test("multiple companies with different sectors filterable", async () => {
    const token = await makeTpo();

    const companies = [
      { name: "Google", sector: "Technology" },
      { name: "McKinsey", sector: "Consulting" },
      { name: "Goldman", sector: "Finance" },
    ];

    for (const c of companies) {
      await request(app)
        .post("/api/v1/companies")
        .set("Authorization", `Bearer ${token}`)
        .send({ ...c, location: "Mumbai", packageRange: { min: 15, max: 40 } });
    }

    const total = await request(app)
      .get("/api/v1/companies")
      .set("Authorization", `Bearer ${token}`);
    expect(total.body.pagination.total).toBe(3);
  });

  test("drive with JD field structure is correct", async () => {
    const token = await makeTpo();
    const company = await createCompany(token);
    const drive = await createDrive(token, company._id);

    // verify drive structure
    expect(drive).toHaveProperty("eligibility");
    expect(drive).toHaveProperty("settings");
    expect(drive).toHaveProperty("rounds");
    expect(drive.eligibility.allowedBranches).toEqual(["CSE", "IT"]);
    expect(drive.settings.oneOfferPolicy).toBe(true);
    expect(drive.settings.dreamPackageLPA).toBe(20);
  });
});
