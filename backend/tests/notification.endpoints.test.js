// Phase 9 — Integration tests for notification REST API
require('dotenv').config();
const request    = require('supertest');
const app        = require('../src/app');
const mongoose   = require('mongoose');
const User       = require('../src/models/User');
const Notification = require('../src/models/Notification');
const { connectTestDB, clearTestDB, closeTestDB } = require('./setup');

let studentToken;
let studentUserId;
let otherToken;
let otherUserId;

// ── helpers ──────────────────────────────────────────────────

const makeUser = async (email, role = 'student') => {
  const user = await User.create({
    name:            'Test User',
    email,
    password:        'test123',
    role,
    isEmailVerified: true,
  });
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password: 'test123' });
  return { token: res.body.accessToken, userId: user._id.toString() };
};

const makeNotif = (recipientId, overrides = {}) =>
  Notification.create({
    recipient: recipientId,
    type:      'general',
    title:     'Test Notification',
    message:   'Test message body',
    ...overrides,
  });

const authGet  = (path, token) =>
  request(app).get(path).set('Authorization', `Bearer ${token}`);
const authPatch = (path, token, body = {}) =>
  request(app).patch(path).set('Authorization', `Bearer ${token}`).send(body);
const authDel  = (path, token) =>
  request(app).delete(path).set('Authorization', `Bearer ${token}`);

// ── setup ─────────────────────────────────────────────────────

beforeAll(async () => {
  await connectTestDB();
  const s = await makeUser('student.notif@test.com', 'student');
  studentToken  = s.token;
  studentUserId = s.userId;

  const o = await makeUser('other.notif@test.com', 'student');
  otherToken  = o.token;
  otherUserId = o.userId;
});

afterEach(async () => {
  await Notification.deleteMany({});
});

afterAll(async () => {
  await closeTestDB();
});

// ── GET /notifications ────────────────────────────────────────

describe('GET /api/v1/notifications', () => {
  test('returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/notifications');
    expect(res.status).toBe(401);
  });

  test('returns empty list when no notifications', async () => {
    const res = await authGet('/api/v1/notifications', studentToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.notifications).toHaveLength(0);
    expect(res.body.data.total).toBe(0);
  });

  test('returns only the logged-in user\'s notifications', async () => {
    await makeNotif(studentUserId, { title: 'Mine' });
    await makeNotif(otherUserId,   { title: 'Not mine' });

    const res = await authGet('/api/v1/notifications', studentToken);
    expect(res.status).toBe(200);
    expect(res.body.data.notifications).toHaveLength(1);
    expect(res.body.data.notifications[0].title).toBe('Mine');
  });

  test('returns unread count in response', async () => {
    await makeNotif(studentUserId, { title: 'N1' });
    await makeNotif(studentUserId, { title: 'N2', isRead: true });

    const res = await authGet('/api/v1/notifications', studentToken);
    expect(res.body.data.unreadCount).toBe(1);
  });

  test('unreadOnly=true filters to unread only', async () => {
    await makeNotif(studentUserId, { title: 'Unread' });
    await makeNotif(studentUserId, { title: 'Read', isRead: true });

    const res = await authGet('/api/v1/notifications?unreadOnly=true', studentToken);
    expect(res.status).toBe(200);
    expect(res.body.data.notifications).toHaveLength(1);
    expect(res.body.data.notifications[0].title).toBe('Unread');
  });

  test('pagination works — page + pages returned', async () => {
    await Promise.all(
      Array.from({ length: 7 }, (_, i) =>
        makeNotif(studentUserId, { title: `Notif ${i + 1}` })
      )
    );

    const res = await authGet('/api/v1/notifications?page=1&limit=5', studentToken);
    expect(res.status).toBe(200);
    expect(res.body.data.notifications).toHaveLength(5);
    expect(res.body.data.total).toBe(7);
    expect(res.body.data.pages).toBe(2);

    const res2 = await authGet('/api/v1/notifications?page=2&limit=5', studentToken);
    expect(res2.body.data.notifications).toHaveLength(2);
  });

  test('notifications sorted latest first', async () => {
    await makeNotif(studentUserId, { title: 'Older' });
    await new Promise((r) => setTimeout(r, 20));
    await makeNotif(studentUserId, { title: 'Newer' });

    const res = await authGet('/api/v1/notifications', studentToken);
    expect(res.body.data.notifications[0].title).toBe('Newer');
    expect(res.body.data.notifications[1].title).toBe('Older');
  });
});

// ── GET /notifications/unread-count ──────────────────────────

describe('GET /api/v1/notifications/unread-count', () => {
  test('returns 0 when no notifications', async () => {
    const res = await authGet('/api/v1/notifications/unread-count', studentToken);
    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(0);
  });

  test('counts only unread notifications for current user', async () => {
    await makeNotif(studentUserId, { title: 'Unread 1' });
    await makeNotif(studentUserId, { title: 'Unread 2' });
    await makeNotif(studentUserId, { title: 'Read',   isRead: true });
    await makeNotif(otherUserId,   { title: 'Other\'s unread' });

    const res = await authGet('/api/v1/notifications/unread-count', studentToken);
    expect(res.body.data.count).toBe(2);
  });

  test('returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/notifications/unread-count');
    expect(res.status).toBe(401);
  });
});

// ── PATCH /notifications/:id/read ─────────────────────────────

describe('PATCH /api/v1/notifications/:id/read', () => {
  test('marks a notification as read', async () => {
    const notif = await makeNotif(studentUserId);
    expect(notif.isRead).toBe(false);

    const res = await authPatch(
      `/api/v1/notifications/${notif._id}/read`,
      studentToken
    );

    expect(res.status).toBe(200);
    expect(res.body.data.notification.isRead).toBe(true);
    expect(res.body.data.notification.readAt).not.toBeNull();
  });

  test('is idempotent — marking already-read returns 200', async () => {
    const notif = await makeNotif(studentUserId, { isRead: true, readAt: new Date() });

    const res = await authPatch(
      `/api/v1/notifications/${notif._id}/read`,
      studentToken
    );
    expect(res.status).toBe(200);
  });

  test('cannot mark another user\'s notification as read', async () => {
    const notif = await makeNotif(otherUserId);

    const res = await authPatch(
      `/api/v1/notifications/${notif._id}/read`,
      studentToken
    );
    expect(res.status).toBe(404);
  });

  test('returns 404 for non-existent id', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await authPatch(
      `/api/v1/notifications/${fakeId}/read`,
      studentToken
    );
    expect(res.status).toBe(404);
  });
});

// ── PATCH /notifications/mark-all-read ───────────────────────

describe('PATCH /api/v1/notifications/mark-all-read', () => {
  test('marks all unread as read', async () => {
    await makeNotif(studentUserId, { title: 'N1' });
    await makeNotif(studentUserId, { title: 'N2' });
    await makeNotif(studentUserId, { title: 'N3' });

    const res = await authPatch('/api/v1/notifications/mark-all-read', studentToken);
    expect(res.status).toBe(200);
    expect(res.body.data.modifiedCount).toBe(3);

    const count = await Notification.countDocuments({
      recipient: studentUserId,
      isRead:    false,
    });
    expect(count).toBe(0);
  });

  test('does not affect other user\'s notifications', async () => {
    await makeNotif(studentUserId, { title: 'Mine' });
    await makeNotif(otherUserId,   { title: 'Other\'s' });

    await authPatch('/api/v1/notifications/mark-all-read', studentToken);

    const otherUnread = await Notification.countDocuments({
      recipient: otherUserId,
      isRead:    false,
    });
    expect(otherUnread).toBe(1);
  });

  test('returns 0 modifiedCount when nothing to mark', async () => {
    const res = await authPatch('/api/v1/notifications/mark-all-read', studentToken);
    expect(res.status).toBe(200);
    expect(res.body.data.modifiedCount).toBe(0);
  });

  test('returns 401 without token', async () => {
    const res = await request(app).patch('/api/v1/notifications/mark-all-read');
    expect(res.status).toBe(401);
  });
});

// ── DELETE /notifications/:id ─────────────────────────────────

describe('DELETE /api/v1/notifications/:id', () => {
  test('deletes own notification', async () => {
    const notif = await makeNotif(studentUserId);

    const res = await authDel(`/api/v1/notifications/${notif._id}`, studentToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const found = await Notification.findById(notif._id);
    expect(found).toBeNull();
  });

  test('cannot delete another user\'s notification', async () => {
    const notif = await makeNotif(otherUserId);

    const res = await authDel(`/api/v1/notifications/${notif._id}`, studentToken);
    expect(res.status).toBe(404);

    // still exists
    const found = await Notification.findById(notif._id);
    expect(found).not.toBeNull();
  });

  test('returns 404 for non-existent id', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await authDel(`/api/v1/notifications/${fakeId}`, studentToken);
    expect(res.status).toBe(404);
  });

  test('returns 401 without token', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).delete(`/api/v1/notifications/${fakeId}`);
    expect(res.status).toBe(401);
  });
});

// ── GET /notifications/preferences ───────────────────────────

describe('GET /api/v1/notifications/preferences', () => {
  test('returns default preferences for a new user', async () => {
    const res = await authGet('/api/v1/notifications/preferences', studentToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const prefs = res.body.data.preferences;
    // inApp defaults all true
    expect(prefs.inApp.drive_opened).toBe(true);
    expect(prefs.inApp.application_status).toBe(true);
    expect(prefs.inApp.offer_released).toBe(true);
    expect(prefs.inApp.general).toBe(true);

    // email defaults
    expect(prefs.email.drive_opened).toBe(true);
    expect(prefs.email.general).toBe(false); // general email off by default
  });

  test('returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/notifications/preferences');
    expect(res.status).toBe(401);
  });
});

// ── PATCH /notifications/preferences ─────────────────────────

describe('PATCH /api/v1/notifications/preferences', () => {
  test('updates email preference for a type', async () => {
    const res = await authPatch(
      '/api/v1/notifications/preferences',
      studentToken,
      { email: { drive_opened: false } }
    );

    expect(res.status).toBe(200);
    expect(res.body.data.preferences.email.drive_opened).toBe(false);
  });

  test('updates inApp preference for a type', async () => {
    const res = await authPatch(
      '/api/v1/notifications/preferences',
      studentToken,
      { inApp: { general: false } }
    );

    expect(res.status).toBe(200);
    expect(res.body.data.preferences.inApp.general).toBe(false);
  });

  test('partial update — only sent fields are changed', async () => {
    // first turn off drive_opened email
    await authPatch('/api/v1/notifications/preferences', studentToken, {
      email: { drive_opened: false },
    });

    // then update only oa_reminder — drive_opened should still be false
    const res = await authPatch('/api/v1/notifications/preferences', studentToken, {
      email: { oa_reminder: false },
    });

    expect(res.body.data.preferences.email.drive_opened).toBe(false);
    expect(res.body.data.preferences.email.oa_reminder).toBe(false);
    // other types untouched
    expect(res.body.data.preferences.email.offer_released).toBe(true);
  });

  test('ignores unknown notification types in body', async () => {
    const res = await authPatch(
      '/api/v1/notifications/preferences',
      studentToken,
      { email: { nonexistent_type: false } }
    );
    // should not throw — just ignores it
    expect(res.status).toBe(200);
  });

  test('can update multiple types and channels at once', async () => {
    const res = await authPatch(
      '/api/v1/notifications/preferences',
      studentToken,
      {
        email: { drive_opened: false, general: true },
        inApp: { general: false },
      }
    );

    expect(res.status).toBe(200);
    const prefs = res.body.data.preferences;
    expect(prefs.email.drive_opened).toBe(false);
    expect(prefs.email.general).toBe(true);
    expect(prefs.inApp.general).toBe(false);
  });

  test('returns 401 without token', async () => {
    const res = await request(app)
      .patch('/api/v1/notifications/preferences')
      .send({ email: { drive_opened: false } });
    expect(res.status).toBe(401);
  });
});