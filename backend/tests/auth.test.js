require('dotenv').config();
const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Student = require('../src/models/Student');
const { connectTestDB, clearTestDB, closeTestDB } = require('./setup');

beforeAll(async () => {
  await connectTestDB();
});

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

// ── helpers ──────────────────────────────────────────────────
const validStudent = {
  name: 'Rahul Sharma',
  email: 'rahul@college.edu',
  password: 'test123',
  role: 'student',
};

const registerUser = (data = validStudent) =>
  request(app).post('/api/v1/auth/register').send(data);

const verifyUserEmail = async (email) => {
  const user = await User.findOne({ email }).select('+emailVerifyOTP');
  return request(app)
    .post('/api/v1/auth/verify-email')
    .send({ email, otp: user.emailVerifyOTP });
};

const loginUser = (email = validStudent.email, password = validStudent.password) =>
  request(app).post('/api/v1/auth/login').send({ email, password });

// ── REGISTER ─────────────────────────────────────────────────
describe('POST /api/v1/auth/register', () => {
  test('registers a student successfully', async () => {
    const res = await registerUser();
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(validStudent.email);
    expect(res.body.user.role).toBe('student');
    // password must never be returned
    expect(res.body.user.password).toBeUndefined();
  });

  test('creates a student profile on register', async () => {
    await registerUser();
    const user = await User.findOne({ email: validStudent.email });
    const profile = await Student.findOne({ user: user._id });
    expect(profile).not.toBeNull();
  });

  test('rejects duplicate email', async () => {
    await registerUser();
    const res = await registerUser();
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test('rejects admin self-registration', async () => {
    const res = await registerUser({ ...validStudent, role: 'admin' });
    expect(res.status).toBe(403);
  });

  test('rejects tpo self-registration', async () => {
    const res = await registerUser({ ...validStudent, role: 'tpo' });
    expect(res.status).toBe(403);
  });

  test('rejects invalid email', async () => {
    const res = await registerUser({ ...validStudent, email: 'notanemail' });
    expect(res.status).toBe(400);
  });

  test('rejects short password', async () => {
    const res = await registerUser({ ...validStudent, password: '123' });
    expect(res.status).toBe(400);
  });

  test('rejects short name', async () => {
    const res = await registerUser({ ...validStudent, name: 'A' });
    expect(res.status).toBe(400);
  });
});

// ── VERIFY EMAIL ─────────────────────────────────────────────
describe('POST /api/v1/auth/verify-email', () => {
  test('verifies email with correct OTP', async () => {
    await registerUser();
    const res = await verifyUserEmail(validStudent.email);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const user = await User.findOne({ email: validStudent.email });
    expect(user.isEmailVerified).toBe(true);
  });

  test('rejects wrong OTP', async () => {
    await registerUser();
    const res = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ email: validStudent.email, otp: '000000' });
    expect(res.status).toBe(400);
  });

  test('rejects OTP with wrong length', async () => {
    await registerUser();
    const res = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ email: validStudent.email, otp: '123' });
    expect(res.status).toBe(400);
  });
});

// ── LOGIN ─────────────────────────────────────────────────────
describe('POST /api/v1/auth/login', () => {
  beforeEach(async () => {
    await registerUser();
    await verifyUserEmail(validStudent.email);
  });

  test('logs in with correct credentials', async () => {
    const res = await loginUser();
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.password).toBeUndefined();
  });

  test('sets refresh token cookie', async () => {
    const res = await loginUser();
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.startsWith('refreshToken='))).toBe(true);
  });

  test('rejects wrong password', async () => {
    const res = await loginUser(validStudent.email, 'wrongpassword');
    expect(res.status).toBe(401);
  });

  test('rejects non-existent email', async () => {
    const res = await loginUser('nobody@nowhere.com', 'test123');
    expect(res.status).toBe(401);
  });

  test('rejects login for unverified email', async () => {
    await registerUser({ ...validStudent, email: 'unverified@test.com' });
    const res = await loginUser('unverified@test.com', validStudent.password);
    expect(res.status).toBe(403);
  });
});

// ── REFRESH TOKEN ─────────────────────────────────────────────
describe('POST /api/v1/auth/refresh', () => {
  test('issues new access token with valid refresh cookie', async () => {
    await registerUser();
    await verifyUserEmail(validStudent.email);
    const loginRes = await loginUser();
    const cookie = loginRes.headers['set-cookie'];

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });

  test('rejects refresh with no cookie', async () => {
    const res = await request(app).post('/api/v1/auth/refresh');
    expect(res.status).toBe(401);
  });
});

// ── LOGOUT ───────────────────────────────────────────────────
describe('POST /api/v1/auth/logout', () => {
  test('clears refresh token and revokes from DB', async () => {
    await registerUser();
    await verifyUserEmail(validStudent.email);
    const loginRes = await loginUser();
    const cookie = loginRes.headers['set-cookie'];

    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', cookie);

    expect(res.status).toBe(200);

    // token should be removed from DB
    const user = await User.findOne({ email: validStudent.email }).select('+refreshTokens');
    expect(user.refreshTokens.length).toBe(0);
  });
});

// ── FORGOT / RESET PASSWORD ───────────────────────────────────
describe('Forgot + Reset password flow', () => {
  beforeEach(async () => {
    await registerUser();
    await verifyUserEmail(validStudent.email);
  });

  test('forgot password always returns success', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: validStudent.email });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('forgot password succeeds even for non-existent email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'ghost@nowhere.com' });
    expect(res.status).toBe(200);
  });

  test('resets password with correct OTP then can login with new password', async () => {
    await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: validStudent.email });

    const user = await User.findOne({ email: validStudent.email }).select('+passwordResetOTP');
    const otp = user.passwordResetOTP;

    const resetRes = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ email: validStudent.email, otp, newPassword: 'newpass123' });

    expect(resetRes.status).toBe(200);

    // login with new password
    const loginRes = await loginUser(validStudent.email, 'newpass123');
    expect(loginRes.status).toBe(200);
  });

  test('rejects reset with wrong OTP', async () => {
    await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: validStudent.email });

    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ email: validStudent.email, otp: '000000', newPassword: 'newpass123' });

    expect(res.status).toBe(400);
  });
});

// ── /ME ──────────────────────────────────────────────────────
describe('GET /api/v1/auth/me', () => {
  test('returns user with valid token', async () => {
    await registerUser();
    await verifyUserEmail(validStudent.email);
    const loginRes = await loginUser();
    const { accessToken } = loginRes.body;

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(validStudent.email);
  });

  test('rejects request with no token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  test('rejects request with invalid token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer faketoken');
    expect(res.status).toBe(401);
  });
});