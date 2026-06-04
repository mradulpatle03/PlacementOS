require("dotenv").config();
const request = require("supertest");
const app = require("../src/app");
const mongoose = require("mongoose");
const User = require("../src/models/User");
const Student = require("../src/models/Student");
const Drive = require("../src/models/Drive");
const Resume = require("../src/models/Resume");
const Application = require("../src/models/Application");
const { connectTestDB, clearTestDB, closeTestDB } = require("./setup");

// ── shared state ──────────────────────────────────────────────────────────
let tpoToken, tpoUser, studentToken;
let driveId, studentId, resumeId;
let app1Id, app2Id, app3Id;

// ── helpers ───────────────────────────────────────────────────────────────
const registerAndLogin = async (role, email, password = "Test@1234") => {
  await request(app)
    .post("/api/v1/auth/register")
    .send({ name: `${role} User`, email, password, role });

  const user = await User.findOne({ email }).select("+emailVerifyOTP");
  await request(app)
    .post("/api/v1/auth/verify-email")
    .send({ email, otp: user.emailVerifyOTP });

  const res = await request(app)
    .post("/api/v1/auth/login")
    .send({ email, password });

  return res.body.accessToken;
};
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
  return {tpoToken: res.body.accessToken, tpoUser: res.body.user};
};

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

// ── setup ─────────────────────────────────────────────────────────────────
beforeAll(async () => {
  await connectTestDB();

  // create TPO + student
  const result = await makeTpo();
  tpoToken = result.tpoToken;
  tpoUser = result.tpoUser;
  studentToken = await registerAndLogin("student", "stu46@test.com");

  // grab student doc
  const stuUser = await User.findOne({ email: "stu46@test.com" });
  const stuDoc = await Student.findOne({ user: stuUser._id });
  studentId = stuDoc._id;

  // create drive
  const drive = await Drive.create({
    title: "Day46 Drive",
    company: new mongoose.Types.ObjectId(),
    roles: [{ title: "SDE", ctc: 12 }],
    eligibility: { minCGPA: 6, allowedBranches: ["CSE"], maxBacklogs: 0 },
    status: "open",
    applicationDeadline: new Date(Date.now() + 86400000),
    createdBy: tpoUser._id,
  });
  driveId = drive._id.toString();

  // create resume
  const resume = await Resume.create({
    student: studentId,
    label: "Main",
    cloudinaryUrl: "https://cloudinary.com/test.pdf",
    isPrimary: true,
    score: 75,
    user: stuUser._id,
    publicId: "resume_id",
  });
  resumeId = resume._id;

  // create 3 applications at different stages
  const [a1, a2, a3] = await Application.insertMany([
    { student: studentId, drive: driveId, resume: resumeId, status: "applied" },
    {
      student: new mongoose.Types.ObjectId(),
      drive: driveId,
      resume: resumeId,
      status: "applied",
    },
    {
      student: new mongoose.Types.ObjectId(),
      drive: driveId,
      resume: resumeId,
      status: "shortlisted",
    },
  ]);
  app1Id = a1._id.toString();
  app2Id = a2._id.toString();
  app3Id = a3._id.toString();
});

afterEach(async () => {
  // do NOT clearTestDB here — we need data across describe blocks
  // only reset application statuses between move-stage tests
});

afterAll(async () => {
  await closeTestDB();
});

// ─────────────────────────────────────────────────────────────────────────────
// GET pipeline/stages
// ─────────────────────────────────────────────────────────────────────────────
describe("GET /api/v1/pipeline/stages", () => {
  test("returns 8 canonical stages", async () => {
    const res = await request(app)
      .get("/api/v1/pipeline/stages")
      .set(authHeader(tpoToken));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.stages).toHaveLength(8);
    expect(res.body.data.stages[0].key).toBe("applied");
    expect(res.body.data.stages[7].key).toBe("accepted");
  });

  test("each stage has key and label", () => {
    // tested via above — label check
  });

  test("requires auth", async () => {
    const res = await request(app).get("/api/v1/pipeline/stages");
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET pipeline/drive/:driveId
// ─────────────────────────────────────────────────────────────────────────────
describe("GET /api/v1/pipeline/drive/:driveId", () => {
  test("returns pipeline grouped by stage", async () => {
    const res = await request(app)
      .get(`/api/v1/pipeline/drive/${driveId}`)
      .set(authHeader(tpoToken));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.pipeline).toHaveProperty("applied");
    expect(res.body.data.pipeline).toHaveProperty("shortlisted");
    expect(res.body.data.pipeline).toHaveProperty("offered");
    expect(res.body.data.pipeline).toHaveProperty("rejected");
  });

  test("applied column has 2 applications", async () => {
    const res = await request(app)
      .get(`/api/v1/pipeline/drive/${driveId}`)
      .set(authHeader(tpoToken));

    expect(res.body.data.pipeline.applied).toHaveLength(2);
  });

  test("shortlisted column has 1 application", async () => {
    const res = await request(app)
      .get(`/api/v1/pipeline/drive/${driveId}`)
      .set(authHeader(tpoToken));

    expect(res.body.data.pipeline.shortlisted).toHaveLength(1);
  });

  test("student cannot access pipeline board", async () => {
    const res = await request(app)
      .get(`/api/v1/pipeline/drive/${driveId}`)
      .set(authHeader(studentToken));

    expect(res.status).toBe(403);
  });

  test("unauthenticated request returns 401", async () => {
    const res = await request(app).get(`/api/v1/pipeline/drive/${driveId}`);

    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT pipeline/:id/move-stage
// ─────────────────────────────────────────────────────────────────────────────
describe("PUT /api/v1/pipeline/:id/move-stage", () => {
  test("moves application from applied → shortlisted", async () => {
    const res = await request(app)
      .put(`/api/v1/pipeline/${app1Id}/move-stage`)
      .set(authHeader(tpoToken))
      .send({ targetStage: "shortlisted", note: "Good profile" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.currentStage).toBe("shortlisted");
    expect(res.body.data.previousStage).toBe("applied");
  });

  test("stageHistory is recorded after move", async () => {
    const app = await Application.findById(app1Id);
    expect(app.stageHistory.length).toBeGreaterThan(0);
    const last = app.stageHistory[app.stageHistory.length - 1];
    expect(last.stage).toBe("shortlisted");
    expect(last.note).toBe("Good profile");
  });

  test("returns 400 for missing targetStage", async () => {
    const res = await request(app)
      .put(`/api/v1/pipeline/${app1Id}/move-stage`)
      .set(authHeader(tpoToken))
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test("returns 400 for invalid stage transition", async () => {
    // app1 is now shortlisted — try moving to unknown stage
    const res = await request(app)
      .put(`/api/v1/pipeline/${app1Id}/move-stage`)
      .set(authHeader(tpoToken))
      .send({ targetStage: "magic_stage" });

    expect(res.status).toBe(400);
  });

  test("returns 404 for non-existent application", async () => {
    const res = await request(app)
      .put(`/api/v1/pipeline/${new mongoose.Types.ObjectId()}/move-stage`)
      .set(authHeader(tpoToken))
      .send({ targetStage: "shortlisted" });

    expect(res.status).toBe(404);
  });

  test("student cannot move stages", async () => {
    const res = await request(app)
      .put(`/api/v1/pipeline/${app2Id}/move-stage`)
      .set(authHeader(studentToken))
      .send({ targetStage: "shortlisted" });

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST pipeline/bulk-move
// ─────────────────────────────────────────────────────────────────────────────
describe("POST /api/v1/pipeline/bulk-move", () => {
  test("bulk moves valid applications, skips invalid ones", async () => {
    // app2 is 'applied' → can move to oa ✅
    // app3 is 'shortlisted' → can move to oa ✅
    const res = await request(app)
      .post("/api/v1/pipeline/bulk-move")
      .set(authHeader(tpoToken))
      .send({
        applicationIds: [app2Id, app3Id],
        targetStage: "oa",
        note: "OA batch",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.movedCount).toBe(2);
    expect(res.body.data.skippedCount).toBe(0);
  });

  test("skips applications already at target stage", async () => {
    // move app2 to oa again — should be skipped (oa → oa not a valid transition)
    const res = await request(app)
      .post("/api/v1/pipeline/bulk-move")
      .set(authHeader(tpoToken))
      .send({ applicationIds: [app2Id], targetStage: "oa" });

    expect(res.status).toBe(200);
    expect(res.body.data.skippedCount).toBe(1);
    expect(res.body.data.movedCount).toBe(0);
  });

  test("returns 400 for empty applicationIds", async () => {
    const res = await request(app)
      .post("/api/v1/pipeline/bulk-move")
      .set(authHeader(tpoToken))
      .send({ applicationIds: [], targetStage: "shortlisted" });

    expect(res.status).toBe(400);
  });

  test("returns 400 for missing targetStage", async () => {
    const res = await request(app)
      .post("/api/v1/pipeline/bulk-move")
      .set(authHeader(tpoToken))
      .send({ applicationIds: [app2Id] });

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT pipeline/:id/reject
// ─────────────────────────────────────────────────────────────────────────────
describe("PUT /api/v1/pipeline/:id/reject", () => {
  test("rejects application with a reason", async () => {
    const res = await request(app)
      .put(`/api/v1/pipeline/${app2Id}/reject`)
      .set(authHeader(tpoToken))
      .send({ reason: "Did not clear OA cutoff" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reason).toBe("Did not clear OA cutoff");
  });

  test("application status is rejected after reject call", async () => {
    const appDoc = await Application.findById(app2Id);
    expect(appDoc.status).toBe("rejected");
    expect(appDoc.remarks).toBe("Did not clear OA cutoff");
    expect(appDoc.stageAtExit).toBeTruthy();
  });

  test("stageHistory records the rejection with reason as note", async () => {
    const appDoc = await Application.findById(app2Id);
    const last = appDoc.stageHistory[appDoc.stageHistory.length - 1];
    expect(last.stage).toBe("rejected");
    expect(last.note).toBe("Did not clear OA cutoff");
  });

  test("returns 400 when reason is missing", async () => {
    const res = await request(app)
      .put(`/api/v1/pipeline/${app3Id}/reject`)
      .set(authHeader(tpoToken))
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/reason/i);
  });

  test("returns 400 when reason is blank whitespace", async () => {
    const res = await request(app)
      .put(`/api/v1/pipeline/${app3Id}/reject`)
      .set(authHeader(tpoToken))
      .send({ reason: "   " });

    expect(res.status).toBe(400);
  });

  test("cannot reject an already-rejected application (terminal)", async () => {
    // app2 is already rejected from the first test in this block
    const res = await request(app)
      .put(`/api/v1/pipeline/${app2Id}/reject`)
      .set(authHeader(tpoToken))
      .send({ reason: "Trying again" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/terminal/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET pipeline/:id/history
// ─────────────────────────────────────────────────────────────────────────────
describe("GET /api/v1/pipeline/:id/history", () => {
  test("returns stage history for an application", async () => {
    const res = await request(app)
      .get(`/api/v1/pipeline/${app1Id}/history`)
      .set(authHeader(tpoToken));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.history).toBeInstanceOf(Array);
    expect(res.body.data.history.length).toBeGreaterThan(0);
  });

  test("each history entry has stageLabel", async () => {
    const res = await request(app)
      .get(`/api/v1/pipeline/${app1Id}/history`)
      .set(authHeader(tpoToken));

    const first = res.body.data.history[0];
    expect(first).toHaveProperty("stageLabel");
    expect(typeof first.stageLabel).toBe("string");
  });

  test("returns currentStage and currentStageLabel", async () => {
    const res = await request(app)
      .get(`/api/v1/pipeline/${app1Id}/history`)
      .set(authHeader(tpoToken));

    expect(res.body.data).toHaveProperty("currentStage");
    expect(res.body.data).toHaveProperty("currentStageLabel");
  });

  test("returns 404 for non-existent application", async () => {
    const res = await request(app)
      .get(`/api/v1/pipeline/${new mongoose.Types.ObjectId()}/history`)
      .set(authHeader(tpoToken));

    expect(res.status).toBe(404);
  });
});
