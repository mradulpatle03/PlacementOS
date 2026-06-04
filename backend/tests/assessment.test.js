require("dotenv").config();
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");
const app = require("../src/app");

const User = require("../src/models/User");
const Student = require("../src/models/Student");
const Company = require("../src/models/Company");
const Drive = require("../src/models/Drive");
const Assessment = require("../src/models/Assessment");
const AssessmentSubmission = require("../src/models/AssessmentSubmission");

let mongod;

// ── DB lifecycle
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  const cols = mongoose.connection.collections;
  for (const key in cols) await cols[key].deleteMany({});
});

// ── seed helpers ──────────────────────────────────────────────

const seedTPO = async () => {
  const user = await User.create({
    name: "TPO User",
    email: "tpo@college.edu",
    password: "hashedpass",
    role: "tpo",
    isEmailVerified: true,
  });
  return user;
};

const seedStudent = async () => {
  const user = await User.create({
    name: "Test Student",
    email: "student@college.edu",
    password: "hashedpass",
    role: "student",
    isEmailVerified: true,
  });
  const student = await Student.create({
    user: user._id,
    rollNumber: "CSE001",
    branch: "CSE",
    cgpa: 8.5,
    graduationYear: 2025,
    backlogs: 0,
    placementStatus: "unplaced",
  });
  return { user, student };
};

const seedDrive = async (tpoId) => {
  const company = await Company.create({
    name: "Test Corp",
    sector: "Technology",
    createdBy: tpoId,
  });
  const drive = await Drive.create({
    title: "SDE Hiring 2025",
    company: company._id,
    roles: [{ title: "SDE", ctc: 12 }],
    eligibility: {
      allowedBranches: ["CSE", "IT"],
      minCGPA: 6.0,
      maxBacklogs: 0,
      graduationYear: [2025],
    },
    status: "open",
    applicationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdBy: tpoId,
    settings: { oneOfferPolicy: true, dreamPackageLPA: 10 },
  });
  return drive;
};

// get a real JWT token by logging in
const loginAndGetToken = async (email) => {
  const user = await User.findOne({ email }).select("+password");

  user.password = "test123";
  user.isEmailVerified = true;
  await user.save();

  const res = await request(app).post("/api/v1/auth/login").send({
    email,
    password: "test123",
  });

  console.log("LOGIN:", res.status, res.body);

  return res.body.accessToken;
};

// ── seed a minimal assessment ─────────────────────────────────
const seedAssessment = async (driveId, tpoId, status = "active") => {
  return Assessment.create({
    drive: driveId,
    title: "Round 1 — Test",
    durationMinutes: 60,
    status,
    createdBy: tpoId,
    totalMarks: 3,
    totalQuestions: 2,
    questions: [
      {
        type: "mcq",
        title: "What is 2+2?",
        marks: 1,
        difficulty: "easy",
        options: [
          { text: "3", isCorrect: false },
          { text: "4", isCorrect: true },
          { text: "5", isCorrect: false },
        ],
        testCases: [],
        allowedLanguages: [],
        order: 0,
      },
      {
        type: "coding",
        title: "Square a number",
        marks: 2,
        difficulty: "easy",
        starterCode: "",
        options: [],
        testCases: [
          { input: "3", expectedOutput: "9", isHidden: false },
          { input: "4", expectedOutput: "16", isHidden: true },
        ],
        allowedLanguages: ["python"],
        order: 1,
      },
    ],
    settings: {
      requireFullscreen: true,
      copyPasteDisabled: true,
      allowTabSwitch: false,
      maxTabSwitches: 3,
      shuffleQuestions: false,
      shuffleOptions: false,
      showResultAfterSubmit: false,
    },
  });
};

// ── POST /assessments ─────────────────────────────────────────

describe("POST /api/v1/assessments", () => {
  test("TPO can create an assessment for a drive", async () => {
    const tpo = await seedTPO();
    const drive = await seedDrive(tpo._id);
    const token = await loginAndGetToken("tpo@college.edu");

    const res = await request(app)
      .post("/api/v1/assessments")
      .set("Authorization", `Bearer ${token}`)
      .send({
        drive: drive._id.toString(),
        title: "Coding Test",
        durationMinutes: 90,
        questions: [
          {
            type: "mcq",
            title: "What is 2+2?",
            marks: 1,
            difficulty: "easy",
            options: [
              { text: "3", isCorrect: false },
              { text: "4", isCorrect: true },
            ],
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.assessment.title).toBe("Coding Test");
    expect(res.body.data.assessment.status).toBe("draft");
    expect(res.body.data.assessment.totalMarks).toBe(1);
    expect(res.body.data.assessment.totalQuestions).toBe(1);
  });

  test("student cannot create an assessment", async () => {
    const tpo = await seedTPO();
    const drive = await seedDrive(tpo._id);
    const { user } = await seedStudent();
    const token = await loginAndGetToken("student@college.edu");

    const res = await request(app)
      .post("/api/v1/assessments")
      .set("Authorization", `Bearer ${token}`)
      .send({
        drive: drive._id.toString(),
        title: "Hack",
        durationMinutes: 10,
        questions: [],
      });

    expect(res.status).toBe(403);
  });

  test("returns 400 for missing required fields", async () => {
    const tpo = await seedTPO();
    const token = await loginAndGetToken("tpo@college.edu");

    const res = await request(app)
      .post("/api/v1/assessments")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "No drive" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("returns 404 for non-existent drive", async () => {
    await seedTPO();
    const token = await loginAndGetToken("tpo@college.edu");
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .post("/api/v1/assessments")
      .set("Authorization", `Bearer ${token}`)
      .send({
        drive: fakeId.toString(),
        title: "Ghost Drive Test",
        durationMinutes: 30,
        questions: [
          {
            type: "mcq",
            title: "Question 1",
            marks: 1,
            difficulty: "easy",
            options: [
              { text: "Option A", isCorrect: true },
              { text: "Option B", isCorrect: false },
            ],
          },
        ],
      });
    console.log(res.status);
    console.log(res.body);

    expect(res.status).toBe(404);
  });
});

// ── PATCH /assessments/:id/status ────────────────────────────

describe("PATCH /api/v1/assessments/:id/status", () => {
  test("TPO can activate a draft assessment", async () => {
    const tpo = await seedTPO();
    const drive = await seedDrive(tpo._id);
    const assessment = await seedAssessment(drive._id, tpo._id, "draft");
    const token = await loginAndGetToken("tpo@college.edu");

    const res = await request(app)
      .patch(`/api/v1/assessments/${assessment._id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "active" });

    expect(res.status).toBe(200);
    expect(res.body.data.assessment.status).toBe("active");
  });

  test("cannot reopen a closed assessment", async () => {
    const tpo = await seedTPO();
    const drive = await seedDrive(tpo._id);
    const assessment = await seedAssessment(drive._id, tpo._id, "closed");
    const token = await loginAndGetToken("tpo@college.edu");

    const res = await request(app)
      .patch(`/api/v1/assessments/${assessment._id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "active" });

    expect(res.status).toBe(400);
  });
});

// ── POST /assessments/:id/start ───────────────────────────────

describe("POST /api/v1/assessments/:id/start", () => {
  test("student can start an active assessment", async () => {
    const tpo = await seedTPO();
    const drive = await seedDrive(tpo._id);
    const assessment = await seedAssessment(drive._id, tpo._id, "active");
    const { user } = await seedStudent();
    const token = await loginAndGetToken("student@college.edu");

    const res = await request(app)
      .post(`/api/v1/assessments/${assessment._id}/start`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(201);
    expect(res.body.data.submission.status).toBe("in_progress");
    expect(res.body.data.submission.totalMarksPossible).toBe(3);
  });

  test("starting twice returns existing in-progress submission", async () => {
    const tpo = await seedTPO();
    const drive = await seedDrive(tpo._id);
    const assessment = await seedAssessment(drive._id, tpo._id, "active");
    await seedStudent();
    const token = await loginAndGetToken("student@college.edu");

    const first = await request(app)
      .post(`/api/v1/assessments/${assessment._id}/start`)
      .set("Authorization", `Bearer ${token}`);
    const second = await request(app)
      .post(`/api/v1/assessments/${assessment._id}/start`)
      .set("Authorization", `Bearer ${token}`);

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.message).toMatch(/resuming/i);
    expect(second.body.data.submission._id).toBe(
      first.body.data.submission._id,
    );
  });

  test("cannot start a draft assessment", async () => {
    const tpo = await seedTPO();
    const drive = await seedDrive(tpo._id);
    const assessment = await seedAssessment(drive._id, tpo._id, "draft");
    await seedStudent();
    const token = await loginAndGetToken("student@college.edu");

    const res = await request(app)
      .post(`/api/v1/assessments/${assessment._id}/start`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  test("cannot start a closed assessment", async () => {
    const tpo = await seedTPO();
    const drive = await seedDrive(tpo._id);
    const assessment = await seedAssessment(drive._id, tpo._id, "closed");
    await seedStudent();
    const token = await loginAndGetToken("student@college.edu");

    const res = await request(app)
      .post(`/api/v1/assessments/${assessment._id}/start`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});

// ── POST /submissions/:id/submit ──────────────────────────────

describe("POST /api/v1/submissions/:submissionId/submit", () => {
  const buildSubmitPayload = (assessment, selectedOptionIndex = 1) => ({
    autoSubmitted: false,
    answers: [
      {
        questionId: assessment.questions[0]._id.toString(),
        questionType: "mcq",
        selectedOptionIndex,
        code: "",
        language: "",
      },
      {
        questionId: assessment.questions[1]._id.toString(),
        questionType: "coding",
        selectedOptionIndex: null,
        code: "print(int(input())**2)",
        language: "python",
      },
    ],
  });

  test("student can submit an in-progress assessment", async () => {
    const tpo = await seedTPO();
    const drive = await seedDrive(tpo._id);
    const assessment = await seedAssessment(drive._id, tpo._id, "active");
    await seedStudent();
    const token = await loginAndGetToken("student@college.edu");

    // start first
    const startRes = await request(app)
      .post(`/api/v1/assessments/${assessment._id}/start`)
      .set("Authorization", `Bearer ${token}`);
    const submissionId = startRes.body.data.submission._id;

    const res = await request(app)
      .post(`/api/v1/submissions/${submissionId}/submit`)
      .set("Authorization", `Bearer ${token}`)
      .send(buildSubmitPayload(assessment));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("submitted");
    expect(res.body.data.autoSubmitted).toBe(false);
  });

  test("cannot submit twice", async () => {
    const tpo = await seedTPO();
    const drive = await seedDrive(tpo._id);
    const assessment = await seedAssessment(drive._id, tpo._id, "active");
    await seedStudent();
    const token = await loginAndGetToken("student@college.edu");

    const startRes = await request(app)
      .post(`/api/v1/assessments/${assessment._id}/start`)
      .set("Authorization", `Bearer ${token}`);
    const submissionId = startRes.body.data.submission._id;

    await request(app)
      .post(`/api/v1/submissions/${submissionId}/submit`)
      .set("Authorization", `Bearer ${token}`)
      .send(buildSubmitPayload(assessment));

    const second = await request(app)
      .post(`/api/v1/submissions/${submissionId}/submit`)
      .set("Authorization", `Bearer ${token}`)
      .send(buildSubmitPayload(assessment));

    expect(second.status).toBe(400);
    expect(second.body.message).toMatch(/already finalized/i);
  });

  test("auto-submit flag is stored correctly", async () => {
    const tpo = await seedTPO();
    const drive = await seedDrive(tpo._id);
    const assessment = await seedAssessment(drive._id, tpo._id, "active");
    await seedStudent();
    const token = await loginAndGetToken("student@college.edu");

    const startRes = await request(app)
      .post(`/api/v1/assessments/${assessment._id}/start`)
      .set("Authorization", `Bearer ${token}`);
    const submissionId = startRes.body.data.submission._id;

    const res = await request(app)
      .post(`/api/v1/submissions/${submissionId}/submit`)
      .set("Authorization", `Bearer ${token}`)
      .send({ ...buildSubmitPayload(assessment), autoSubmitted: true });

    expect(res.status).toBe(200);
    expect(res.body.data.autoSubmitted).toBe(true);
  });
});

// ── POST /submissions/:id/violation ──────────────────────────

describe("POST /api/v1/submissions/:submissionId/violation", () => {
  test("logs a tab_switch violation", async () => {
    const tpo = await seedTPO();
    const drive = await seedDrive(tpo._id);
    const assessment = await seedAssessment(drive._id, tpo._id, "active");
    await seedStudent();
    const token = await loginAndGetToken("student@college.edu");

    const startRes = await request(app)
      .post(`/api/v1/assessments/${assessment._id}/start`)
      .set("Authorization", `Bearer ${token}`);
    const submissionId = startRes.body.data.submission._id;

    const res = await request(app)
      .post(`/api/v1/submissions/${submissionId}/violation`)
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "tab_switch" });

    expect(res.status).toBe(200);
    expect(res.body.data.violationCount).toBe(1);
    expect(typeof res.body.data.shouldAutoSubmit).toBe("boolean");
  });

  test("shouldAutoSubmit is true after maxTabSwitches violations", async () => {
    const tpo = await seedTPO();
    const drive = await seedDrive(tpo._id);
    const assessment = await seedAssessment(drive._id, tpo._id, "active");
    await seedStudent();
    const token = await loginAndGetToken("student@college.edu");

    const startRes = await request(app)
      .post(`/api/v1/assessments/${assessment._id}/start`)
      .set("Authorization", `Bearer ${token}`);
    const submissionId = startRes.body.data.submission._id;

    // log maxTabSwitches (3) violations
    let lastRes;
    for (let i = 0; i < 3; i++) {
      lastRes = await request(app)
        .post(`/api/v1/submissions/${submissionId}/violation`)
        .set("Authorization", `Bearer ${token}`)
        .send({ type: "tab_switch" });
    }

    expect(lastRes.status).toBe(200);
    expect(lastRes.body.data.shouldAutoSubmit).toBe(true);
  });

  test("rejects invalid violation type", async () => {
    const tpo = await seedTPO();
    const drive = await seedDrive(tpo._id);
    const assessment = await seedAssessment(drive._id, tpo._id, "active");
    await seedStudent();
    const token = await loginAndGetToken("student@college.edu");

    const startRes = await request(app)
      .post(`/api/v1/assessments/${assessment._id}/start`)
      .set("Authorization", `Bearer ${token}`);
    const submissionId = startRes.body.data.submission._id;

    const res = await request(app)
      .post(`/api/v1/submissions/${submissionId}/violation`)
      .set("Authorization", `Bearer ${token}`)
      .send({ type: "hacking_attempt" });

    expect(res.status).toBe(400);
  });
});

// ── GET /assessments/:id/submissions ─────────────────────────

describe("GET /api/v1/assessments/:id/submissions", () => {
  test("TPO can view all submissions for an assessment", async () => {
    const tpo = await seedTPO();
    const drive = await seedDrive(tpo._id);
    const assessment = await seedAssessment(drive._id, tpo._id, "active");
    const { student } = await seedStudent();
    const tpoToken = await loginAndGetToken("tpo@college.edu");
    const studentToken = await loginAndGetToken("student@college.edu");

    // student starts + submits
    const startRes = await request(app)
      .post(`/api/v1/assessments/${assessment._id}/start`)
      .set("Authorization", `Bearer ${studentToken}`);

    await request(app)
      .post(`/api/v1/submissions/${startRes.body.data.submission._id}/submit`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ answers: [], autoSubmitted: false });

    const res = await request(app)
      .get(`/api/v1/assessments/${assessment._id}/submissions`)
      .set("Authorization", `Bearer ${tpoToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.submissions).toHaveLength(1);
    expect(res.body.data.stats.total).toBe(1);
    expect(res.body.data.stats.submitted).toBe(1);
  });

  test("student cannot view all submissions", async () => {
    const tpo = await seedTPO();
    const drive = await seedDrive(tpo._id);
    const assessment = await seedAssessment(drive._id, tpo._id, "active");
    await seedStudent();
    const token = await loginAndGetToken("student@college.edu");

    const res = await request(app)
      .get(`/api/v1/assessments/${assessment._id}/submissions`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});

// ── GET /assessments/:id/export ───────────────────────────────

describe("GET /api/v1/assessments/:id/export", () => {
  test("exports submissions as xlsx", async () => {
    const tpo = await seedTPO();
    const drive = await seedDrive(tpo._id);
    const assessment = await seedAssessment(drive._id, tpo._id, "active");
    await seedStudent();
    const tpoToken = await loginAndGetToken("tpo@college.edu");
    const studentToken = await loginAndGetToken("student@college.edu");

    // create a submission
    const startRes = await request(app)
      .post(`/api/v1/assessments/${assessment._id}/start`)
      .set("Authorization", `Bearer ${studentToken}`);

    await request(app)
      .post(`/api/v1/submissions/${startRes.body.data.submission._id}/submit`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ answers: [], autoSubmitted: false });

    const res = await request(app)
      .get(`/api/v1/assessments/${assessment._id}/export?format=xlsx`)
      .set("Authorization", `Bearer ${tpoToken}`);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("spreadsheetml");
    expect(res.headers["content-disposition"]).toContain(".xlsx");
  });

  test("exports submissions as csv", async () => {
    const tpo = await seedTPO();
    const drive = await seedDrive(tpo._id);
    const assessment = await seedAssessment(drive._id, tpo._id, "active");
    await seedStudent();
    const tpoToken = await loginAndGetToken("tpo@college.edu");
    const studentToken = await loginAndGetToken("student@college.edu");

    const startRes = await request(app)
      .post(`/api/v1/assessments/${assessment._id}/start`)
      .set("Authorization", `Bearer ${studentToken}`);

    await request(app)
      .post(`/api/v1/submissions/${startRes.body.data.submission._id}/submit`)
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ answers: [], autoSubmitted: false });

    const res = await request(app)
      .get(`/api/v1/assessments/${assessment._id}/export?format=csv`)
      .set("Authorization", `Bearer ${tpoToken}`);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.text).toContain("Student Name");
  });

  test("returns 404 when no submissions exist", async () => {
    const tpo = await seedTPO();
    const drive = await seedDrive(tpo._id);
    const assessment = await seedAssessment(drive._id, tpo._id, "active");
    const token = await loginAndGetToken("tpo@college.edu");

    const res = await request(app)
      .get(`/api/v1/assessments/${assessment._id}/export?format=xlsx`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  test("returns 400 for invalid format", async () => {
    const tpo = await seedTPO();
    const drive = await seedDrive(tpo._id);
    const a = await seedAssessment(drive._id, tpo._id, "active");
    const token = await loginAndGetToken("tpo@college.edu");

    const res = await request(app)
      .get(`/api/v1/assessments/${a._id}/export?format=pdf`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  test("student cannot export results", async () => {
    const tpo = await seedTPO();
    const drive = await seedDrive(tpo._id);
    const a = await seedAssessment(drive._id, tpo._id, "active");
    await seedStudent();
    const token = await loginAndGetToken("student@college.edu");

    const res = await request(app)
      .get(`/api/v1/assessments/${a._id}/export?format=xlsx`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});
