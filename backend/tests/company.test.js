require('dotenv').config();
const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const { connectTestDB, clearTestDB, closeTestDB } = require('./setup');

beforeAll(async () => { await connectTestDB(); await clearTestDB(); });
afterEach(async () => { await clearTestDB(); });
afterAll(async () => { await closeTestDB(); });

// helpers
const makeTpo = async () => {
  await User.create({
    name: 'TPO', email: 'tpo@test.com',
    password: 'test123', role: 'tpo', isEmailVerified: true,
  });
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'tpo@test.com', password: 'test123' });
  return res.body.accessToken;
};

const makeStudent = async () => {
  await request(app).post('/api/v1/auth/register').send({
    name: 'Student', email: 'student@test.com', password: 'test123', role: 'student',
  });
  const user = await User.findOne({ email: 'student@test.com' }).select('+emailVerifyOTP');
  await request(app).post('/api/v1/auth/verify-email').send({ email: 'student@test.com', otp: user.emailVerifyOTP });
  const res = await request(app).post('/api/v1/auth/login').send({ email: 'student@test.com', password: 'test123' });
  return res.body.accessToken;
};

const createCompany = (token, data = {}) =>
  request(app)
    .post('/api/v1/companies')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Google',
      sector: 'Technology',
      location: 'Bangalore',
      packageRange: { min: 20, max: 50 },
      ...data,
    });

// tests
describe('Company CRUD', () => {
  test('TPO can create a company', async () => {
    const token = await makeTpo();
    const res = await createCompany(token);
    expect(res.status).toBe(201);
    expect(res.body.company.name).toBe('Google');
    expect(res.body.company.sector).toBe('Technology');
  });

  test('rejects duplicate company name', async () => {
    const token = await makeTpo();
    await createCompany(token);
    const res = await createCompany(token);
    expect(res.status).toBe(409);
  });

  test('student cannot create company', async () => {
    const tpoToken = await makeTpo();
    const studentToken = await makeStudent();
    const res = await createCompany(studentToken);
    expect(res.status).toBe(403);
  });

  test('TPO can get all companies', async () => {
    const token = await makeTpo();
    await createCompany(token);
    await createCompany(token, { name: 'Microsoft' });
    const res = await request(app)
      .get('/api/v1/companies')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.companies.length).toBe(2);
    expect(res.body.pagination.total).toBe(2);
  });

  test('search filter works', async () => {
    const token = await makeTpo();
    await createCompany(token);
    await createCompany(token, { name: 'Microsoft' });
    const res = await request(app)
      .get('/api/v1/companies?search=micro')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.companies.length).toBe(1);
    expect(res.body.companies[0].name).toBe('Microsoft');
  });

  test('TPO can update a company', async () => {
    const token = await makeTpo();
    const created = await createCompany(token);
    const id = created.body.company._id;
    const res = await request(app)
      .put(`/api/v1/companies/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ location: 'Mumbai' });
    expect(res.status).toBe(200);
    expect(res.body.company.location).toBe('Mumbai');
  });

  test('TPO can delete a company', async () => {
    const token = await makeTpo();
    const created = await createCompany(token);
    const id = created.body.company._id;
    const res = await request(app)
      .delete(`/api/v1/companies/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

describe('Company Hiring History', () => {
  test('TPO can add hiring history', async () => {
    const token = await makeTpo();
    const created = await createCompany(token);
    const id = created.body.company._id;

    const res = await request(app)
      .post(`/api/v1/companies/${id}/history`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        year: 2024,
        totalOffers: 10,
        totalHired: 8,
        averagePackage: 18,
        highestPackage: 30,
        rolesOffered: ['SDE', 'Data Analyst'],
        driveCount: 2,
      });
    expect(res.status).toBe(200);
    expect(res.body.history.year).toBe(2024);
    expect(res.body.history.totalOffers).toBe(10);
  });

  test('upserts existing year history', async () => {
    const token = await makeTpo();
    const created = await createCompany(token);
    const id = created.body.company._id;

    await request(app)
      .post(`/api/v1/companies/${id}/history`)
      .set('Authorization', `Bearer ${token}`)
      .send({ year: 2024, totalOffers: 5, totalHired: 4, averagePackage: 15, highestPackage: 20, driveCount: 1 });

    const res = await request(app)
      .post(`/api/v1/companies/${id}/history`)
      .set('Authorization', `Bearer ${token}`)
      .send({ year: 2024, totalOffers: 10, totalHired: 8, averagePackage: 18, highestPackage: 25, driveCount: 2 });

    expect(res.status).toBe(200);
    expect(res.body.history.totalOffers).toBe(10);
  });

  test('can get hiring history', async () => {
    const token = await makeTpo();
    const created = await createCompany(token);
    const id = created.body.company._id;

    await request(app)
      .post(`/api/v1/companies/${id}/history`)
      .set('Authorization', `Bearer ${token}`)
      .send({ year: 2024, totalOffers: 10, totalHired: 8, averagePackage: 18, highestPackage: 30, driveCount: 2 });

    const res = await request(app)
      .get(`/api/v1/companies/${id}/history`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.history.length).toBe(1);
  });

  test('can get company stats', async () => {
    const token = await makeTpo();
    const created = await createCompany(token);
    const id = created.body.company._id;

    await request(app)
      .post(`/api/v1/companies/${id}/history`)
      .set('Authorization', `Bearer ${token}`)
      .send({ year: 2024, totalOffers: 10, totalHired: 8, averagePackage: 18, highestPackage: 30, driveCount: 2 });

    const res = await request(app)
      .get(`/api/v1/companies/${id}/stats`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.stats.totalOffers).toBe(10);
    expect(res.body.stats.highestEver).toBe(30);
  });
});