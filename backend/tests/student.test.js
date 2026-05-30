require('dotenv').config();
const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Student = require('../src/models/Student');
const { connectTestDB, clearTestDB, closeTestDB } = require('./setup');

beforeAll(async () => { await connectTestDB(); await clearTestDB(); });
afterEach(async () => { await clearTestDB(); });
afterAll(async () => { await closeTestDB(); });

// helpers
const makeStudent = async () => {
  await request(app).post('/api/v1/auth/register').send({
    name: 'Test Student', email: 'student@test.com', password: 'test123', role: 'student',
  });
  const user = await User.findOne({ email: 'student@test.com' }).select('+emailVerifyOTP');
  await request(app).post('/api/v1/auth/verify-email').send({ email: 'student@test.com', otp: user.emailVerifyOTP });
  const res = await request(app).post('/api/v1/auth/login').send({ email: 'student@test.com', password: 'test123' });
  return { token: res.body.accessToken, userId: res.body.user._id };
};

const makeTpo = async () => {
  await User.create({ name: 'TPO User', email: 'tpo@test.com', password: 'test123', role: 'tpo', isEmailVerified: true });
  const res = await request(app).post('/api/v1/auth/login').send({ email: 'tpo@test.com', password: 'test123' });
  return res.body.accessToken;
};

describe('Student Profile', () => {
  test('student can get own profile', async () => {
    const { token } = await makeStudent();
    const res = await request(app).get('/api/v1/students/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.student).toBeDefined();
  });

  test('student can update basic info', async () => {
    const { token } = await makeStudent();
    const res = await request(app)
      .put('/api/v1/students/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ branch: 'CSE', cgpa: 8.5, graduationYear: 2025, backlogs: 0 });
    expect(res.status).toBe(200);
    expect(res.body.student.branch).toBe('CSE');
    expect(res.body.student.cgpa).toBe(8.5);
  });

  test('rejects invalid CGPA', async () => {
    const { token } = await makeStudent();
    const res = await request(app)
      .put('/api/v1/students/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ cgpa: 11 });
    expect(res.status).toBe(400);
  });

  test('student can update skills', async () => {
    const { token } = await makeStudent();
    const res = await request(app)
      .put('/api/v1/students/me/skills')
      .set('Authorization', `Bearer ${token}`)
      .send({ skills: ['JavaScript', 'React', 'Node.js'] });
    expect(res.status).toBe(200);
    expect(res.body.skills).toHaveLength(3);
  });

  test('student can add a project', async () => {
    const { token } = await makeStudent();
    const res = await request(app)
      .post('/api/v1/students/me/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'My Project', description: 'A test project', techStack: ['React'], link: 'https://github.com/test' });
    expect(res.status).toBe(201);
    expect(res.body.projects).toHaveLength(1);
    expect(res.body.projects[0].title).toBe('My Project');
  });

  test('student can delete a project', async () => {
    const { token } = await makeStudent();
    const addRes = await request(app)
      .post('/api/v1/students/me/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'To Delete', techStack: [] });
    const projectId = addRes.body.projects[0]._id;

    const delRes = await request(app)
      .delete(`/api/v1/students/me/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.projects).toHaveLength(0);
  });

  test('TPO can list all students', async () => {
    await makeStudent();
    const tpoToken = await makeTpo();
    const res = await request(app).get('/api/v1/students').set('Authorization', `Bearer ${tpoToken}`);
    expect(res.status).toBe(200);
    expect(res.body.students).toBeDefined();
    expect(res.body.pagination).toBeDefined();
  });

  test('student cannot access TPO list endpoint', async () => {
    const { token } = await makeStudent();
    const res = await request(app).get('/api/v1/students').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('completeness returns correct percent', async () => {
    const { token } = await makeStudent();
    await request(app)
      .put('/api/v1/students/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ branch: 'CSE', cgpa: 8.5, graduationYear: 2025, rollNumber: '2021CSE001' });
    await request(app)
      .put('/api/v1/students/me/skills')
      .set('Authorization', `Bearer ${token}`)
      .send({ skills: ['JS', 'React', 'Node'] });

    const res = await request(app)
      .get('/api/v1/students/me/completeness')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.percent).toBeGreaterThan(0);
    expect(res.body.checks).toBeDefined();
  });
});