// Day 60 — Unit tests for interviewResult.service.js
// Tests pipeline stage advancement when interview result is recorded

require("dotenv").config();
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongod;

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

// mock sockets — no real server needed
jest.mock("../src/sockets", () => ({
  emitStageMoved: jest.fn(),
  emitApplicationRejected: jest.fn(),
}));

const {
  advancePipelineOnResult,
  NEXT_STAGE_MAP,
} = require("../src/services/interviewResult.service");
const Application = require("../src/models/Application");
const User = require("../src/models/User");
const Student = require("../src/models/Student");
const Company = require("../src/models/Company");
const Drive = require("../src/models/Drive");
const Resume = require("../src/models/Resume");

// ── seed helpers ──────────────────────────────────────────────

const seedApplication = async (status = "interview_1") => {
  const user = await User.create({
    name: "Test Student",
    email: "ts@college.edu",
    password: "hashed",
    role: "student",
    isEmailVerified: true,
  });
  const student = await Student.create({
    user: user._id,
    rollNumber: "CSE001",
    branch: "CSE",
    cgpa: 8,
    graduationYear: 2025,
    backlogs: 0,
    placementStatus: "unplaced",
  });
  const company = await Company.create({
    name: "Test Corp",
    sector: "Technology",
    createdBy: user._id,
  });
  const drive = await Drive.create({
    title: "Drive",
    company: company._id,
    roles: [{ title: "SDE", ctc: 12 }],
    eligibility: {
      allowedBranches: ["CSE"],
      minCGPA: 6,
      maxBacklogs: 0,
      graduationYear: [2025],
    },
    status: "open",
    applicationDeadline: new Date(Date.now() + 86400000),
    createdBy: user._id,
    settings: { oneOfferPolicy: true, dreamPackageLPA: 10 },
  });
  const resume = await Resume.create({
    user: user._id,
    student: student._id,
    label: "CV",
    cloudinaryUrl: "https://x.com/cv.pdf",
    cloudinaryPublicId: "x",
    isPrimary: true,
    publicId: "x",
  });
  const app = await Application.create({
    student: student._id,
    drive: drive._id,
    resume: resume._id,
    status,
  });
  return { app, student, drive, user };
};

const buildInterview = (app, drive, student, round) => ({
  _id: new mongoose.Types.ObjectId(),
  application: app._id,
  drive: { _id: drive._id, toString: () => drive._id.toString() },
  student: { _id: student._id, user: { name: "Test Student" } },
  round,
  scheduledAt: new Date(),
});

const MOVER = { _id: new mongoose.Types.ObjectId(), name: "TPO User" };

// ── NEXT_STAGE_MAP tests ──────────────────────────────────────

describe("NEXT_STAGE_MAP", () => {
  test("interview_1 pass → interview_2", () => {
    expect(NEXT_STAGE_MAP.interview_1.pass).toBe("interview_2");
  });
  test("interview_1 fail → rejected", () => {
    expect(NEXT_STAGE_MAP.interview_1.fail).toBe("rejected");
  });
  test("interview_1 no_show → rejected", () => {
    expect(NEXT_STAGE_MAP.interview_1.no_show).toBe("rejected");
  });
  test("interview_2 pass → hr", () => {
    expect(NEXT_STAGE_MAP.interview_2.pass).toBe("hr");
  });
  test("hr pass → offered", () => {
    expect(NEXT_STAGE_MAP.hr.pass).toBe("offered");
  });
  test("hr fail → rejected", () => {
    expect(NEXT_STAGE_MAP.hr.fail).toBe("rejected");
  });
});

// ── advancePipelineOnResult — pass cases ─────────────────────

describe("advancePipelineOnResult — pass", () => {
  test("interview_1 pass moves application to interview_2", async () => {
    const { app, student, drive } = await seedApplication("interview_1");
    const interview = buildInterview(app, drive, student, "interview_1");

    const result = await advancePipelineOnResult(
      interview,
      "pass",
      "Good candidate",
      MOVER._id,
      MOVER.name,
    );

    expect(result.moved).toBe(true);
    expect(result.previousStage).toBe("interview_1");
    expect(result.currentStage).toBe("interview_2");

    const updated = await Application.findById(app._id);
    expect(updated.status).toBe("interview_2");
    expect(updated.stageHistory).toHaveLength(1);
    expect(updated.stageHistory[0].stage).toBe("interview_2");
    expect(updated.stageHistory[0].note).toContain("Good candidate");
  });

  test("interview_2 pass moves application to hr", async () => {
    const { app, student, drive } = await seedApplication("interview_2");
    const interview = buildInterview(app, drive, student, "interview_2");

    const result = await advancePipelineOnResult(
      interview,
      "pass",
      "",
      MOVER._id,
      MOVER.name,
    );

    expect(result.moved).toBe(true);
    expect(result.currentStage).toBe("hr");

    const updated = await Application.findById(app._id);
    expect(updated.status).toBe("hr");
  });

  test("hr pass moves application to offered", async () => {
    const { app, student, drive } = await seedApplication("hr");
    const interview = buildInterview(app, drive, student, "hr");

    const result = await advancePipelineOnResult(
      interview,
      "pass",
      "Excellent",
      MOVER._id,
      MOVER.name,
    );

    expect(result.moved).toBe(true);
    expect(result.currentStage).toBe("offered");

    const updated = await Application.findById(app._id);
    expect(updated.status).toBe("offered");
  });
});

// ── advancePipelineOnResult — fail/no_show cases ─────────────

describe("advancePipelineOnResult — fail/no_show", () => {
  test("interview_1 fail → application rejected", async () => {
    const { app, student, drive } = await seedApplication("interview_1");
    const interview = buildInterview(app, drive, student, "interview_1");

    const result = await advancePipelineOnResult(
      interview,
      "fail",
      "Did not meet bar",
      MOVER._id,
      MOVER.name,
    );

    expect(result.moved).toBe(true);
    expect(result.currentStage).toBe("rejected");

    const updated = await Application.findById(app._id);
    expect(updated.status).toBe("rejected");
    expect(updated.stageAtExit).toBe("interview_1");
    expect(updated.remarks).toContain("Did not meet bar");
  });

  test("hr no_show → application rejected", async () => {
    const { app, student, drive } = await seedApplication("hr");
    const interview = buildInterview(app, drive, student, "hr");

    const result = await advancePipelineOnResult(
      interview,
      "no_show",
      "",
      MOVER._id,
      MOVER.name,
    );

    expect(result.moved).toBe(true);
    expect(result.currentStage).toBe("rejected");

    const updated = await Application.findById(app._id);
    expect(updated.status).toBe("rejected");
  });

  test("stageHistory records correct entry on fail", async () => {
    const { app, student, drive } = await seedApplication("interview_2");
    const interview = buildInterview(app, drive, student, "interview_2");

    await advancePipelineOnResult(
      interview,
      "fail",
      "Poor performance",
      MOVER._id,
      MOVER.name,
    );

    const updated = await Application.findById(app._id);
    expect(updated.stageHistory).toHaveLength(1);
    expect(updated.stageHistory[0].stage).toBe("rejected");
    expect(updated.stageHistory[0].note).toContain("Poor performance");
  });
});

// ── edge cases ────────────────────────────────────────────────

describe("advancePipelineOnResult — edge cases", () => {
  test("returns moved:false for unknown round", async () => {
    const { app, student, drive } = await seedApplication("interview_1");
    const interview = {
      ...buildInterview(app, drive, student, "interview_1"),
      round: "unknown_round",
    };

    const result = await advancePipelineOnResult(
      interview,
      "pass",
      "",
      MOVER._id,
      MOVER.name,
    );

    expect(result.moved).toBe(false);
    expect(result.reason).toMatch(/no pipeline mapping/i);
  });

  test("returns moved:false when application already rejected", async () => {
    const { app, student, drive } = await seedApplication("rejected");
    const interview = buildInterview(app, drive, student, "interview_1");

    const result = await advancePipelineOnResult(
      interview,
      "pass",
      "",
      MOVER._id,
      MOVER.name,
    );

    expect(result.moved).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  test("returns moved:false when application not found", async () => {
    const { student, drive } = await seedApplication("interview_1");
    const fakeApp = { _id: new mongoose.Types.ObjectId() };
    const interview = buildInterview(fakeApp, drive, student, "interview_1");

    const result = await advancePipelineOnResult(
      interview,
      "pass",
      "",
      MOVER._id,
      MOVER.name,
    );

    expect(result.moved).toBe(false);
    expect(result.reason).toMatch(/application not found/i);
  });

  test("works without feedback text", async () => {
    const { app, student, drive } = await seedApplication("interview_1");
    const interview = buildInterview(app, drive, student, "interview_1");

    const result = await advancePipelineOnResult(
      interview,
      "pass",
      "",
      MOVER._id,
      MOVER.name,
    );

    expect(result.moved).toBe(true);
    const updated = await Application.findById(app._id);
    expect(updated.stageHistory[0].note).toContain("pass");
  });

  test("emits socket event on successful move", async () => {
    const { emitStageMoved } = require("../src/sockets");
    const { app, student, drive } = await seedApplication("interview_2");
    const interview = buildInterview(app, drive, student, "interview_2");

    await advancePipelineOnResult(interview, "pass", "", MOVER._id, MOVER.name);

    expect(emitStageMoved).toHaveBeenCalled();
    const [, payload] =
      emitStageMoved.mock.calls[emitStageMoved.mock.calls.length - 1];
    expect(payload.currentStage).toBe("hr");
  });

  test("emits rejection event on fail", async () => {
    const { emitApplicationRejected } = require("../src/sockets");
    const { app, student, drive } = await seedApplication("interview_1");
    const interview = buildInterview(app, drive, student, "interview_1");

    await advancePipelineOnResult(
      interview,
      "fail",
      "Not suitable",
      MOVER._id,
      MOVER.name,
    );

    expect(emitApplicationRejected).toHaveBeenCalled();
    const [, payload] =
      emitApplicationRejected.mock.calls[
        emitApplicationRejected.mock.calls.length - 1
      ];
    expect(payload.rejectedFromStage).toBe("interview_1");
  });
});
