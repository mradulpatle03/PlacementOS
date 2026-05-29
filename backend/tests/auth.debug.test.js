require('dotenv').config();
const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const { connectTestDB, clearTestDB, closeTestDB } = require('./setup');

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

// ── helpers ──────────────────────────────────────────────────
const validStudent = {
  name: 'Mincing',
  email: 'artistmp03@gmail.com',
  password: 'test123',
  role: 'student',
};

const registerUser = () =>
  request(app).post('/api/v1/auth/register').send(validStudent);

const verifyUserEmail = async (email) => {
  const user = await User.findOne({ email }).select('+emailVerifyOTP');
  return request(app)
    .post('/api/v1/auth/verify-email')
    .send({ email, otp: user.emailVerifyOTP });
};

const loginUser = (email = validStudent.email, password = validStudent.password) =>
  request(app).post('/api/v1/auth/login').send({ email, password });

// ── DEBUG TEST 1 — 409 on fresh register ─────────────────────
describe('DEBUG 1: registers a student successfully', () => {
  test('DB is empty before test runs', async () => {
    const count = await User.countDocuments();
    console.log('User count before register:', count);
    console.log('DB name:', require('mongoose').connection.name);
    expect(count).toBe(0);
  });

  test('register returns 201 on clean DB', async () => {
    const res = await registerUser();
    console.log('Register status:', res.status);
    console.log('Register body:', JSON.stringify(res.body));
    expect(res.status).toBe(201);
  });
});

// ── DEBUG TEST 2 — 429 rate limit on login ───────────────────
describe('DEBUG 2: rate limiter does not block login in tests', () => {
  beforeEach(async () => {
    await registerUser();
    await verifyUserEmail(validStudent.email);
  });

  test('can login multiple times without hitting rate limit', async () => {
    // fire 11 logins — would hit the 10/15min limit if rate limiter is active
    const results = [];
    for (let i = 0; i < 11; i++) {
      const res = await loginUser();
      results.push(res.status);
    }
    console.log('Login statuses (11 attempts):', results);
    // none should be 429
    expect(results.some((s) => s === 429)).toBe(false);
    // all should be 200
    expect(results.every((s) => s === 200)).toBe(true);
  });

  test('password reset flow + login with new password works', async () => {
    await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: validStudent.email });

    const user = await User.findOne({ email: validStudent.email })
      .select('+passwordResetOTP');

    console.log('Reset OTP:', user.passwordResetOTP);

    const resetRes = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ email: validStudent.email, otp: user.passwordResetOTP, newPassword: 'newpass123' });

    console.log('Reset status:', resetRes.status, resetRes.body);
    expect(resetRes.status).toBe(200);

    const loginRes = await loginUser(validStudent.email, 'newpass123');
    console.log('Login after reset status:', loginRes.status, loginRes.body?.message);
    expect(loginRes.status).toBe(200);
  });
});

// ── DEBUG TEST 3 — 401 on /me with valid token ───────────────
describe('DEBUG 3: /me returns user with valid access token', () => {
  test('prints JWT secrets being used', () => {
    console.log('JWT_ACCESS_SECRET:', process.env.JWT_ACCESS_SECRET);
    console.log('JWT_REFRESH_SECRET:', process.env.JWT_REFRESH_SECRET);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    // just confirming secrets are set
    expect(process.env.JWT_ACCESS_SECRET).toBeDefined();
  });

  test('token signed and verified with same secret', () => {
    const { generateAccessToken, verifyAccessToken } = require('../src/utils/jwt');
    const payload = { userId: 'abc123', role: 'student' };
    const token = generateAccessToken(payload);
    console.log('Generated token:', token.substring(0, 40) + '...');
    const decoded = verifyAccessToken(token);
    console.log('Decoded:', decoded);
    expect(decoded.userId).toBe('abc123');
  });

  test('/me returns 200 with token from login', async () => {
    await registerUser();
    await verifyUserEmail(validStudent.email);
    const loginRes = await loginUser();

    console.log('Login status:', loginRes.status);
    console.log('accessToken present:', !!loginRes.body.accessToken);

    const accessToken = loginRes.body.accessToken;
    expect(accessToken).toBeDefined();

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    console.log('/me status:', meRes.status);
    console.log('/me body:', JSON.stringify(meRes.body));
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe(validStudent.email);
  });
});