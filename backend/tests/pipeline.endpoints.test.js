const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');
const Application = require('../src/models/Application');
const Student = require('../src/models/Student');
const User = require('../src/models/User');
const Drive = require('../src/models/Drive');
const Resume = require('../src/models/Resume');
const bcrypt = require('bcryptjs');


let tpoToken;
let studentId, driveId, resumeId;
let app1Id, app2Id, app3Id;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI_TEST || process.env.MONGO_URI);
  await mongoose.connection.db.dropDatabase();
  // ── create TPO via register (password gets hashed correctly) ──
  const bcrypt = require('bcryptjs');

const hashedPassword = await bcrypt.hash('Test@1234', 10);

const tpoUser = await User.create({
  name: 'Pipeline TPO',
  email: 'pipeline.tpo@test.com',
  password: hashedPassword,
  role: 'tpo',
  isEmailVerified: true,
});

  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'pipeline.tpo@test.com', password: 'Test@1234' });

  tpoToken = loginRes.body?.accessToken;

  // ── create student via register ──
  await request(app)
    .post('/api/v1/auth/register')
    .send({
      name: 'Pipeline Student',
      email: 'pipeline.student@test.com',
      password: 'Test@1234',
      role: 'student',
    });

  await User.updateOne(
    { email: 'pipeline.student@test.com' },
    { isEmailVerified: true }
  );

  const studentUser = await User.findOne({ email: 'pipeline.student@test.com' });

  const student = await Student.create({
    user: studentUser._id,
    rollNumber: 'PIPE001',
    branch: 'CSE',
    graduationYear: 2026,
    cgpa: 8.0,
    backlogs: 0,
  });
  studentId = student._id;

  // ── create company ──
  const Company = require('../src/models/Company');
  const company = await Company.create({
    name: 'Pipeline Corp',
    sector: 'IT',
    createdBy: tpoUser._id,
  });

  // ── create drive with correct field names ──
  const drive = await Drive.create({
    title: 'Pipeline Test Drive',
    company: company._id,
    createdBy: tpoUser._id,
    roles: [{ title: 'SDE', ctc: 12 }],
    eligibility: {
      minCGPA: 6,
      allowedBranches: ['CSE'],
      maxBacklogs: 0,
    },
    status: 'open',
    applicationDeadline: new Date(Date.now() + 86400000),
  });
  driveId = drive._id;

  // ── create resume (requires both student + user fields) ──
  const Resume = require('../src/models/Resume');
  const resume = await Resume.create({
    student: studentId,
    user: studentUser._id,      // ← required field
    label: 'Primary',
    cloudinaryUrl: 'https://cloudinary.com/test',
    publicId: 'test_public_id',
    isPrimary: true,
  });
  resumeId = resume._id;

  // ── create 3 applications ──
  const [a1, a2, a3] = await Application.insertMany([
    { student: studentId,                          drive: driveId, resume: resumeId, status: 'applied' },
    { student: new mongoose.Types.ObjectId(),      drive: driveId, resume: resumeId, status: 'applied' },
    { student: new mongoose.Types.ObjectId(),      drive: driveId, resume: resumeId, status: 'shortlisted' },
  ]);
  app1Id = a1._id.toString();
  app2Id = a2._id.toString();
  app3Id = a3._id.toString();
});

afterAll(async () => {
  await Application.deleteMany({ drive: driveId });
  await mongoose.connection.close();
});

// Single Move 
describe('PUT /api/v1/pipeline/:id/move-stage', () => {
  test('TPO can move applied → shortlisted', async () => {
    const res = await request(app)
      .put(`/api/v1/pipeline/${app1Id}/move-stage`)
      .set('Authorization', `Bearer ${tpoToken}`)
      .send({ targetStage: 'shortlisted', note: 'Good resume' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.currentStage).toBe('shortlisted');
  });

  test('stageHistory is recorded on move', async () => {
    const app = await Application.findById(app1Id);
    expect(app.stageHistory.length).toBeGreaterThan(0);
    expect(app.stageHistory[0].stage).toBe('shortlisted');
  });

  test('invalid transition returns 400', async () => {
    // app1 is now shortlisted; rejected → shortlisted would be invalid if we try
    // let's try moving to a fake stage
    const res = await request(app)
      .put(`/api/v1/pipeline/${app1Id}/move-stage`)
      .set('Authorization', `Bearer ${tpoToken}`)
      .send({ targetStage: 'magic_stage' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('missing targetStage returns 400', async () => {
    const res = await request(app)
      .put(`/api/v1/pipeline/${app1Id}/move-stage`)
      .set('Authorization', `Bearer ${tpoToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  test('non-existent application returns 404', async () => {
    const res = await request(app)
      .put(`/api/v1/pipeline/${new mongoose.Types.ObjectId()}/move-stage`)
      .set('Authorization', `Bearer ${tpoToken}`)
      .send({ targetStage: 'shortlisted' });

    expect(res.status).toBe(404);
  });
});

// Bulk Move
describe('POST /api/v1/pipeline/bulk-move', () => {
  test('bulk moves valid applications, skips invalid ones', async () => {
    // app2 is applied → can move to shortlisted
    // app3 is shortlisted → moving to shortlisted would fail (same stage, not a valid forward/back) 
    const res = await request(app)
      .post('/api/v1/pipeline/bulk-move')
      .set('Authorization', `Bearer ${tpoToken}`)
      .send({
        applicationIds: [app2Id, app3Id],
        targetStage: 'shortlisted',
        note: 'Bulk shortlist',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.movedCount).toBeGreaterThanOrEqual(1);
  });

  test('empty applicationIds returns 400', async () => {
    const res = await request(app)
      .post('/api/v1/pipeline/bulk-move')
      .set('Authorization', `Bearer ${tpoToken}`)
      .send({ applicationIds: [], targetStage: 'shortlisted' });

    expect(res.status).toBe(400);
  });

  test('missing targetStage returns 400', async () => {
    const res = await request(app)
      .post('/api/v1/pipeline/bulk-move')
      .set('Authorization', `Bearer ${tpoToken}`)
      .send({ applicationIds: [app2Id] });

    expect(res.status).toBe(400);
  });
});

// Get Pipeline by Drive
describe('GET /api/v1/pipeline/drive/:driveId', () => {
  test('returns pipeline grouped by stage', async () => {
    const res = await request(app)
      .get(`/api/v1/pipeline/drive/${driveId}`)
      .set('Authorization', `Bearer ${tpoToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.pipeline).toHaveProperty('applied');
    expect(res.body.data.pipeline).toHaveProperty('shortlisted');
    expect(res.body.data.pipeline).toHaveProperty('offered');
  });
});