require("dotenv").config();
const request = require("supertest");
const app = require("../src/app");
const User = require("../src/models/User");
const Company = require("../src/models/Company");
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
    name: "TPO",
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

const makeStudent = async () => {
  await request(app).post("/api/v1/auth/register").send({
    name: "Student",
    email: "student@test.com",
    password: "test123",
    role: "student",
  });
  const u = await User.findOne({ email: "student@test.com" }).select(
    "+emailVerifyOTP",
  );
  await request(app)
    .post("/api/v1/auth/verify-email")
    .send({ email: "student@test.com", otp: u.emailVerifyOTP });
  const res = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: "student@test.com", password: "test123" });
  return res.body.accessToken;
};

const makeCompany = async (token) => {
  const res = await request(app)
    .post("/api/v1/companies")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: "Google",
      sector: "Technology",
      location: "Bangalore",
      packageRange: { min: 20, max: 50 },
    });
  return res.body.company._id;
};

const makeDrive = (token, companyId, overrides = {}) =>
  request(app)
    .post("/api/v1/drives")
    .set("Authorization", `Bearer ${token}`)
    .send({
      company: companyId,
      title: "SDE 2025 Drive",
      roles: [{ title: "Software Engineer", ctc: 24, openings: 5 }],
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
      settings: {
        oneOfferPolicy: true,
        dreamPackageLPA: 20,
      },
      ...overrides,
    });

// tests
describe("Drive CRUD", () => {
  test("TPO can create a drive", async () => {
    const token = await makeTpo();
    const companyId = await makeCompany(token);
    const res = await makeDrive(token, companyId);
    expect(res.status).toBe(201);
    expect(res.body.drive.status).toBe("draft");
    expect(res.body.drive.title).toBe("SDE 2025 Drive");
    expect(res.body.drive.roles).toHaveLength(1);
  });

  test("rejects drive without roles", async () => {
    const token = await makeTpo();
    const companyId = await makeCompany(token);
    const res = await request(app)
      .post("/api/v1/drives")
      .set("Authorization", `Bearer ${token}`)
      .send({
        company: companyId,
        title: "Bad Drive",
        roles: [],
        applicationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
    expect(res.status).toBe(400);
  });

  test("rejects past application deadline", async () => {
    const token = await makeTpo();
    const companyId = await makeCompany(token);
    const res = await makeDrive(token, companyId, {
      applicationDeadline: new Date(Date.now() - 1000).toISOString(),
    });
    expect(res.status).toBe(400);
  });

  test("student cannot create drive", async () => {
    const tpoToken = await makeTpo();
    const studentToken = await makeStudent();
    const companyId = await makeCompany(tpoToken);
    const res = await makeDrive(studentToken, companyId);
    expect(res.status).toBe(403);
  });

  test("students only see published/open drives", async () => {
    const tpoToken = await makeTpo();
    const studentToken = await makeStudent();
    const companyId = await makeCompany(tpoToken);
    await makeDrive(tpoToken, companyId); // draft

    const res = await request(app)
      .get("/api/v1/drives")
      .set("Authorization", `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.drives).toHaveLength(0); // draft not visible
  });

  test("TPO can see draft drives", async () => {
    const token = await makeTpo();
    const companyId = await makeCompany(token);
    await makeDrive(token, companyId);

    const res = await request(app)
      .get("/api/v1/drives")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.drives).toHaveLength(1);
  });
});

describe("Drive State Transitions", () => {
  test("draft → published is valid", async () => {
    const token = await makeTpo();
    const companyId = await makeCompany(token);
    const drive = await makeDrive(token, companyId);
    const id = drive.body.drive._id;

    const res = await request(app)
      .put(`/api/v1/drives/${id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "published" });
    expect(res.status).toBe(200);
    expect(res.body.drive.status).toBe("published");
  });

  test("draft → open is invalid", async () => {
    const token = await makeTpo();
    const companyId = await makeCompany(token);
    const drive = await makeDrive(token, companyId);
    const id = drive.body.drive._id;

    const res = await request(app)
      .put(`/api/v1/drives/${id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "open" });
    expect(res.status).toBe(400);
  });

  test("published → open → closed is valid", async () => {
    const token = await makeTpo();
    const companyId = await makeCompany(token);
    const drive = await makeDrive(token, companyId);
    const id = drive.body.drive._id;

    await request(app)
      .put(`/api/v1/drives/${id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "published" });
    await request(app)
      .put(`/api/v1/drives/${id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "open" });

    const res = await request(app)
      .put(`/api/v1/drives/${id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "closed" });
    expect(res.status).toBe(200);
    expect(res.body.drive.status).toBe("closed");
  });

  test("completed is terminal — no further transitions", async () => {
    const token = await makeTpo();
    const companyId = await makeCompany(token);
    const drive = await makeDrive(token, companyId);
    const id = drive.body.drive._id;

    await request(app)
      .put(`/api/v1/drives/${id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "published" });
    await request(app)
      .put(`/api/v1/drives/${id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "open" });
    await request(app)
      .put(`/api/v1/drives/${id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "closed" });
    await request(app)
      .put(`/api/v1/drives/${id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "completed" });

    const res = await request(app)
      .put(`/api/v1/drives/${id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "draft" });
    expect(res.status).toBe(400);
  });

  test("only draft drives can be deleted", async () => {
    const token = await makeTpo();
    const companyId = await makeCompany(token);
    const drive = await makeDrive(token, companyId);
    const id = drive.body.drive._id;

    await request(app)
      .put(`/api/v1/drives/${id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "published" });

    const res = await request(app)
      .delete(`/api/v1/drives/${id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});


describe('Drive filters and search', () => {
  test('can filter drives by status', async () => {
    const token = await makeTpo();
    const companyId = await makeCompany(token);
    const drive = await makeDrive(token, companyId);
    const id = drive.body.drive._id;

    await request(app).put(`/api/v1/drives/${id}/status`).set('Authorization', `Bearer ${token}`).send({ status: 'published' });

    const res = await request(app)
      .get('/api/v1/drives?status=published')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.drives.every((d) => d.status === 'published')).toBe(true);
  });

  test('can search drives by title', async () => {
    const token = await makeTpo();
    const companyId = await makeCompany(token);
    await makeDrive(token, companyId);
    await makeDrive(token, companyId, { title: 'Data Engineer Drive' });

    const res = await request(app)
      .get('/api/v1/drives?search=data')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.drives).toHaveLength(1);
    expect(res.body.drives[0].title).toBe('Data Engineer Drive');
  });

  test('drive summary returns correct stats', async () => {
    const token = await makeTpo();
    const companyId = await makeCompany(token);
    const drive = await makeDrive(token, companyId);
    const id = drive.body.drive._id;

    const res = await request(app)
      .get(`/api/v1/drives/${id}/summary`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.summary.totalOpenings).toBe(5);
    expect(res.body.summary.ctcRange.max).toBe(24);
  });

  test('drive stats endpoint works', async () => {
    const token = await makeTpo();
    const companyId = await makeCompany(token);
    await makeDrive(token, companyId);
    await makeDrive(token, companyId, { title: 'Another Drive' });

    const res = await request(app)
      .get('/api/v1/drives/stats')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.stats.total).toBe(2);
    expect(res.body.stats.draft).toBe(2);
  });

  test('cannot change company after drive creation', async () => {
    const token = await makeTpo();
    const companyId = await makeCompany(token);
    const drive = await makeDrive(token, companyId);
    const id = drive.body.drive._id;

    const company2 = await request(app)
      .post('/api/v1/companies')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Microsoft', sector: 'Technology', location: 'Hyderabad', packageRange: { min: 15, max: 40 } });

    const res = await request(app)
      .put(`/api/v1/drives/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ company: company2.body.company._id });
    expect(res.status).toBe(400);
  });
});

describe('Drive listing filters', () => {
  let tpoToken;
  let companyId;

  beforeEach(async () => {
    tpoToken = await makeTpo();
    companyId = await makeCompany(tpoToken);
  });

  test('filter by branch', async () => {
    await makeDrive(tpoToken, companyId, {
      eligibility: { allowedBranches: ['CSE', 'IT'], minCGPA: 0, maxBacklogs: 0, graduationYear: [] },
    });
    await makeDrive(tpoToken, companyId, {
      title: 'ECE Drive',
      eligibility: { allowedBranches: ['ECE'], minCGPA: 0, maxBacklogs: 0, graduationYear: [] },
    });

    const res = await request(app)
      .get('/api/v1/drives?branch=CSE')
      .set('Authorization', `Bearer ${tpoToken}`);

    expect(res.status).toBe(200);
    expect(res.body.drives.every((d) =>
      d.eligibility.allowedBranches.includes('CSE')
    )).toBe(true);
  });

  test('filter by mode', async () => {
    await makeDrive(tpoToken, companyId, { mode: 'oncampus' });
    await makeDrive(tpoToken, companyId, { title: 'Off Campus Drive', mode: 'offcampus' });

    const res = await request(app)
      .get('/api/v1/drives?mode=offcampus')
      .set('Authorization', `Bearer ${tpoToken}`);

    expect(res.status).toBe(200);
    expect(res.body.drives).toHaveLength(1);
    expect(res.body.drives[0].mode).toBe('offcampus');
  });

  test('filter by CTC range', async () => {
    await makeDrive(tpoToken, companyId, {
      roles: [{ title: 'SDE', ctc: 10, openings: 2 }],
    });
    await makeDrive(tpoToken, companyId, {
      title: 'High CTC Drive',
      roles: [{ title: 'SDE', ctc: 40, openings: 2 }],
    });

    const res = await request(app)
      .get('/api/v1/drives?minCTC=30')
      .set('Authorization', `Bearer ${tpoToken}`);

    expect(res.status).toBe(200);
    expect(res.body.drives).toHaveLength(1);
    expect(res.body.drives[0].title).toBe('High CTC Drive');
  });

  test('comma-separated status filter', async () => {
    const d1 = await makeDrive(tpoToken, companyId, { title: 'Drive 1' });
    const d2 = await makeDrive(tpoToken, companyId, { title: 'Drive 2' });

    await request(app)
      .put(`/api/v1/drives/${d1.body.drive._id}/status`)
      .set('Authorization', `Bearer ${tpoToken}`)
      .send({ status: 'published' });

    const res = await request(app)
      .get('/api/v1/drives?status=draft,published')
      .set('Authorization', `Bearer ${tpoToken}`);

    expect(res.status).toBe(200);
    expect(res.body.drives.length).toBe(2);
  });

  test('sort by applicationDeadline ascending', async () => {
    await makeDrive(tpoToken, companyId, {
      title: 'Late Deadline',
      applicationDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    });
    await makeDrive(tpoToken, companyId, {
      title: 'Early Deadline',
      applicationDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    });

    const res = await request(app)
      .get('/api/v1/drives?sortBy=applicationDeadline&sortOrder=asc')
      .set('Authorization', `Bearer ${tpoToken}`);

    expect(res.status).toBe(200);
    expect(res.body.drives[0].title).toBe('Early Deadline');
  });

  test('pagination works', async () => {
    // create 5 drives
    for (let i = 1; i <= 5; i++) {
      await makeDrive(tpoToken, companyId, { title: `Drive ${i}` });
    }

    const res = await request(app)
      .get('/api/v1/drives?page=1&limit=3')
      .set('Authorization', `Bearer ${tpoToken}`);

    expect(res.status).toBe(200);
    expect(res.body.drives).toHaveLength(3);
    expect(res.body.pagination.total).toBe(5);
    expect(res.body.pagination.pages).toBe(2);
  });

  test('upcoming drives endpoint', async () => {
    // drive with deadline in 3 days
    await makeDrive(tpoToken, companyId, {
      title: 'Upcoming Drive',
      applicationDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const d = await makeDrive(tpoToken, companyId, { title: 'Upcoming 2' });
    await request(app)
      .put(`/api/v1/drives/${d.body.drive._id}/status`)
      .set('Authorization', `Bearer ${tpoToken}`)
      .send({ status: 'published' });

    const res = await request(app)
      .get('/api/v1/drives/upcoming')
      .set('Authorization', `Bearer ${tpoToken}`);

    expect(res.status).toBe(200);
    expect(res.body.drives.length).toBeGreaterThanOrEqual(1);
  });
});