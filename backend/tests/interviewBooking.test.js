const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../src/app");
const User = require("../src/models/User");
const Student = require("../src/models/Student");
const Company = require("../src/models/Company");
const Drive = require("../src/models/Drive");
const Resume = require("../src/models/Resume");
const Application = require("../src/models/Application");
const Interview = require("../src/models/Interview");
const InterviewSlot = require("../src/models/InterviewSlot");
const { generateAccessToken } = require("../src/utils/jwt");
const { connectTestDB, clearTestDB, closeTestDB } = require("./setup");

beforeAll(async () => {
  await connectTestDB();
});

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

const createBookingFixture = async ({ status, slotRound }) => {
  const tpo = await User.create({
    name: "TPO",
    email: `tpo-${status}-${slotRound}@test.com`,
    password: "test123",
    role: "tpo",
    isEmailVerified: true,
  });

  const user = await User.create({
    name: "Interview Student",
    email: `student-${status}-${slotRound}@test.com`,
    password: "test123",
    role: "student",
    isEmailVerified: true,
  });

  const student = await Student.create({
    user: user._id,
    rollNumber: `INT-${status}-${slotRound}`,
    branch: "CSE",
    graduationYear: 2026,
    cgpa: 8,
    backlogs: 0,
  });

  const company = await Company.create({
    name: `Interview Corp ${status} ${slotRound}`,
    sector: "Technology",
    createdBy: tpo._id,
  });

  const drive = await Drive.create({
    title: `Interview Drive ${status} ${slotRound}`,
    company: company._id,
    createdBy: tpo._id,
    roles: [{ title: "SDE", ctc: 10 }],
    applicationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    status: "open",
  });

  const resume = await Resume.create({
    student: student._id,
    user: user._id,
    label: "Primary",
    cloudinaryUrl: "https://example.com/resume.pdf",
    publicId: `resume-${status}-${slotRound}`,
    isPrimary: true,
  });

  const application = await Application.create({
    student: student._id,
    drive: drive._id,
    resume: resume._id,
    status,
  });

  const slot = await InterviewSlot.create({
    drive: drive._id,
    round: slotRound,
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    durationMinutes: 45,
    mode: "online",
    meetingLink: "https://example.com/interview",
    capacity: 1,
    createdBy: tpo._id,
  });

  return {
    token: generateAccessToken({ userId: user._id }),
    application,
    slot,
  };
};

describe("POST /api/v1/interviews/slots/:slotId/book", () => {
  test("rejects booking when application is not at the slot round stage", async () => {
    const { token, application, slot } = await createBookingFixture({
      status: "interview_1",
      slotRound: "interview_2",
    });

    const res = await request(app)
      .post(`/api/v1/interviews/slots/${slot._id}/book`)
      .set("Authorization", `Bearer ${token}`)
      .send({ applicationId: application._id.toString() });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("You cannot book a interview 2 slot yet");

    const unchangedSlot = await InterviewSlot.findById(slot._id);
    expect(unchangedSlot.bookedBy).toHaveLength(0);
    await expect(Interview.countDocuments({ application: application._id })).resolves.toBe(0);
  });

  test("allows booking when application stage matches the slot round", async () => {
    const { token, application, slot } = await createBookingFixture({
      status: "interview_2",
      slotRound: "interview_2",
    });

    const res = await request(app)
      .post(`/api/v1/interviews/slots/${slot._id}/book`)
      .set("Authorization", `Bearer ${token}`)
      .send({ applicationId: application._id.toString() });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.interview.round).toBe("interview_2");
    expect(res.body.data.slot.seatsLeft).toBe(0);

    const bookedSlot = await InterviewSlot.findById(slot._id);
    expect(bookedSlot.bookedBy).toHaveLength(1);
  });
});
