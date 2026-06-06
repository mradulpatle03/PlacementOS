// Phase 9 — Unit tests for notification model, queue helpers, and preferences logic
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');


let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

const Notification = require('../src/models/Notification');

// ── helpers ──────────────────────────────────────────────────
const makeRecipientId = () => new mongoose.Types.ObjectId();

const makeNotification = (overrides = {}) => ({
  type:    'general',
  title:   'Test Notification',
  message: 'This is a test message',
  ...overrides,
});

// ── Notification model ────────────────────────────────────────

describe('Notification model — creation', () => {
  test('creates a notification with required fields', async () => {
    const recipientId = makeRecipientId();
    const doc = await Notification.create({
      recipient: recipientId,
      ...makeNotification(),
    });

    expect(doc._id).toBeDefined();
    expect(doc.recipient.toString()).toBe(recipientId.toString());
    expect(doc.type).toBe('general');
    expect(doc.title).toBe('Test Notification');
    expect(doc.message).toBe('This is a test message');
    expect(doc.isRead).toBe(false);
    expect(doc.readAt).toBeNull();
    expect(doc.createdAt).toBeDefined();
  });

  test('defaults: inApp true, email false, isRead false', async () => {
    const doc = await Notification.create({
      recipient: makeRecipientId(),
      ...makeNotification(),
    });

    expect(doc.channels.inApp).toBe(true);
    expect(doc.channels.email).toBe(false);
    expect(doc.isRead).toBe(false);
  });

  test('metadata fields default to null', async () => {
    const doc = await Notification.create({
      recipient: makeRecipientId(),
      ...makeNotification(),
    });

    expect(doc.metadata.driveId).toBeNull();
    expect(doc.metadata.companyName).toBeNull();
    expect(doc.metadata.link).toBeNull();
  });

  test('saves metadata correctly when provided', async () => {
    const doc = await Notification.create({
      recipient: makeRecipientId(),
      ...makeNotification({ type: 'drive_opened' }),
      metadata: {
        driveId:     'drive123',
        companyName: 'TechCorp',
        link:        '/drives/drive123',
      },
    });

    expect(doc.metadata.driveId).toBe('drive123');
    expect(doc.metadata.companyName).toBe('TechCorp');
    expect(doc.metadata.link).toBe('/drives/drive123');
  });

  test('rejects unknown notification type', async () => {
    await expect(
      Notification.create({
        recipient: makeRecipientId(),
        ...makeNotification({ type: 'invalid_type' }),
      })
    ).rejects.toThrow();
  });

  test('rejects missing title', async () => {
    await expect(
      Notification.create({
        recipient: makeRecipientId(),
        type:    'general',
        message: 'No title here',
      })
    ).rejects.toThrow();
  });

  test('rejects missing recipient', async () => {
    await expect(
      Notification.create(makeNotification())
    ).rejects.toThrow();
  });

  test('allows all valid notification types', async () => {
    const types = [
      'drive_opened', 'drive_closed', 'application_status',
      'oa_reminder', 'interview_reminder', 'offer_released',
      'result_declared', 'general',
    ];

    for (const type of types) {
      const doc = await Notification.create({
        recipient: makeRecipientId(),
        ...makeNotification({ type }),
      });
      expect(doc.type).toBe(type);
    }
  });
});

describe('Notification model — mark as read', () => {
  test('can mark a notification as read', async () => {
    const doc = await Notification.create({
      recipient: makeRecipientId(),
      ...makeNotification(),
    });

    expect(doc.isRead).toBe(false);

    doc.isRead = true;
    doc.readAt = new Date();
    await doc.save();

    const updated = await Notification.findById(doc._id);
    expect(updated.isRead).toBe(true);
    expect(updated.readAt).toBeDefined();
  });

  test('updateMany marks all unread as read', async () => {
    const recipientId = makeRecipientId();

    await Notification.create([
      { recipient: recipientId, ...makeNotification({ title: 'N1' }) },
      { recipient: recipientId, ...makeNotification({ title: 'N2' }) },
      { recipient: recipientId, ...makeNotification({ title: 'N3' }) },
    ]);

    const result = await Notification.updateMany(
      { recipient: recipientId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    expect(result.modifiedCount).toBe(3);

    const unread = await Notification.countDocuments({
      recipient: recipientId,
      isRead:    false,
    });
    expect(unread).toBe(0);
  });
});

describe('Notification model — queries', () => {
  test('filters by recipient correctly', async () => {
    const r1 = makeRecipientId();
    const r2 = makeRecipientId();

    await Notification.create([
      { recipient: r1, ...makeNotification({ title: 'For R1' }) },
      { recipient: r1, ...makeNotification({ title: 'Also R1' }) },
      { recipient: r2, ...makeNotification({ title: 'For R2' }) },
    ]);

    const r1Notifs = await Notification.find({ recipient: r1 });
    const r2Notifs = await Notification.find({ recipient: r2 });

    expect(r1Notifs).toHaveLength(2);
    expect(r2Notifs).toHaveLength(1);
  });

  test('unreadOnly filter works', async () => {
    const recipientId = makeRecipientId();

    await Notification.create([
      { recipient: recipientId, ...makeNotification({ title: 'Unread 1' }) },
      { recipient: recipientId, ...makeNotification({ title: 'Unread 2' }) },
    ]);

    // mark one as read
    await Notification.findOneAndUpdate(
      { recipient: recipientId, title: 'Unread 1' },
      { isRead: true, readAt: new Date() }
    );

    const unread = await Notification.find({ recipient: recipientId, isRead: false });
    expect(unread).toHaveLength(1);
    expect(unread[0].title).toBe('Unread 2');
  });

  test('sorted by createdAt descending — latest first', async () => {
    const recipientId = makeRecipientId();

    await Notification.create({ recipient: recipientId, ...makeNotification({ title: 'First' }) });
    await new Promise((r) => setTimeout(r, 10));
    await Notification.create({ recipient: recipientId, ...makeNotification({ title: 'Second' }) });
    await new Promise((r) => setTimeout(r, 10));
    await Notification.create({ recipient: recipientId, ...makeNotification({ title: 'Third' }) });

    const docs = await Notification.find({ recipient: recipientId }).sort({ createdAt: -1 });
    expect(docs[0].title).toBe('Third');
    expect(docs[1].title).toBe('Second');
    expect(docs[2].title).toBe('First');
  });

  test('pagination with skip + limit', async () => {
    const recipientId = makeRecipientId();

    await Notification.create(
      Array.from({ length: 8 }, (_, i) => ({
        recipient: recipientId,
        ...makeNotification({ title: `Notif ${i + 1}` }),
      }))
    );

    const page1 = await Notification.find({ recipient: recipientId })
      .sort({ createdAt: -1 }).skip(0).limit(5);
    const page2 = await Notification.find({ recipient: recipientId })
      .sort({ createdAt: -1 }).skip(5).limit(5);

    expect(page1).toHaveLength(5);
    expect(page2).toHaveLength(3);
  });
});

// ── notificationQueue payload helpers ────────────────────────

let notificationQueue;
let notifyDriveOpened;
let notifyApplicationStatus;
let notifyOfferReleased;
let notifyGeneral;

describe('notificationQueue — payload helpers', () => {
  beforeAll(() => {
    jest.resetModules();

    jest.doMock('../src/config/queues', () => {
      const mockQueue = {
        add: jest.fn().mockResolvedValue({ id: 'job-1' }),
      };

      return {
        createQueue: () => mockQueue,
        QUEUE_NAMES: {
          NOTIFICATION: 'notification',
          NOTIFICATION_DLQ: 'notification-dlq',
        },
      };
    });

    const queueModule = require('../src/queues/notificationQueue');

    notificationQueue = queueModule.notificationQueue;
    notifyDriveOpened = queueModule.notifyDriveOpened;
    notifyApplicationStatus = queueModule.notifyApplicationStatus;
    notifyOfferReleased = queueModule.notifyOfferReleased;
    notifyGeneral = queueModule.notifyGeneral;
  });

  afterAll(() => {
    jest.resetModules();
  });

  test('notifyDriveOpened builds correct payload type', async () => {
    await notifyDriveOpened('user1', 'user@test.com', {
      drive:       { _id: 'drive1', title: 'SDE Intern', applicationDeadline: null },
      company:     { name: 'TechCorp' },
      studentName: 'Rahul',
      ctc:         12,
    });

    const call = notificationQueue.add.mock.calls.at(-1);
    expect(call[0]).toBe('send-notification');
    expect(call[1].type).toBe('drive_opened');
    expect(call[1].channels.inApp).toBe(true);
    expect(call[1].channels.email).toBe(true);
    expect(call[1].extra.studentName).toBe('Rahul');
    expect(call[1].extra.ctc).toBe(12);
  });

  test('notifyApplicationStatus builds correct payload', async () => {
    await notifyApplicationStatus('user2', 'user2@test.com', {
      studentName: 'Priya',
      drive:       { _id: 'drive2', title: 'Backend Dev' },
      company:     { name: 'FinCorp' },
      newStage:    'shortlisted',
      stageLabel:  'Shortlisted',
      note:        'Good profile',
    });

    const call = notificationQueue.add.mock.calls.at(-1);
    expect(call[1].type).toBe('application_status');
    expect(call[1].extra.newStage).toBe('shortlisted');
    expect(call[1].extra.note).toBe('Good profile');
    expect(call[1].channels.email).toBe(true);
  });

  test('notifyOfferReleased builds correct payload', async () => {
    await notifyOfferReleased('user3', 'user3@test.com', {
      studentName: 'Amit',
      drive:       { _id: 'drive3', title: 'Full Stack' },
      company:     { name: 'StartupX' },
      deadline:    new Date('2025-12-31'),
    });

    const call = notificationQueue.add.mock.calls.at(-1);
    expect(call[1].type).toBe('offer_released');
    expect(call[1].extra.deadline).toBeDefined();
    expect(call[1].channels.inApp).toBe(true);
  });

  test('notifyGeneral creates inApp-only by default when no email given', async () => {
    await notifyGeneral('user4', {
      title:   'System Maintenance',
      message: 'Scheduled downtime Sunday 2am',
    });

    const call = notificationQueue.add.mock.calls.at(-1);
    expect(call[1].type).toBe('general');
    expect(call[1].channels.email).toBe(false);
    expect(call[1].channels.inApp).toBe(true);
  });

  test('notifyGeneral sends email when recipientEmail provided', async () => {
    await notifyGeneral('user5', {
      title:          'Announcement',
      message:        'Campus drive next week',
      recipientEmail: 'user5@test.com',
    });

    const call = notificationQueue.add.mock.calls.at(-1);
    expect(call[1].channels.email).toBe(true);
    expect(call[1].recipientEmail).toBe('user5@test.com');
  });
});

// ── email template shape ──────────────────────────────────────

describe('emailTemplates — output shape', () => {
  const {
    welcomeEmail,
    otpEmail,
    driveOpenedEmail,
    applicationStatusEmail,
    oaReminderEmail,
    offerReleasedEmail,
    resultDeclaredEmail,
    generalEmail,
  } = require('../src/utils/emailTemplates');

  test('welcomeEmail returns subject + html', () => {
    const result = welcomeEmail({ name: 'Rahul', role: 'student' });
    expect(result).toHaveProperty('subject');
    expect(result).toHaveProperty('html');
    expect(result.subject).toContain('Welcome');
    expect(result.html).toContain('Rahul');
  });

  test('otpEmail verify — contains OTP', () => {
    const result = otpEmail({ otp: '123456', purpose: 'verify' });
    expect(result.html).toContain('123456');
    expect(result.subject).toMatch(/verify/i);
  });

  test('otpEmail reset — subject mentions reset', () => {
    const result = otpEmail({ otp: '654321', purpose: 'reset' });
    expect(result.subject).toMatch(/reset/i);
    expect(result.html).toContain('654321');
  });

  test('driveOpenedEmail contains company and drive title', () => {
    const result = driveOpenedEmail({
      studentName: 'Priya',
      companyName: 'TechCorp',
      driveTitle:  'SDE Intern',
      ctc:         12,
      deadline:    null,
      driveId:     'drive123',
    });
    expect(result.html).toContain('TechCorp');
    expect(result.html).toContain('SDE Intern');
    expect(result.html).toContain('12');
    expect(result.subject).toContain('TechCorp');
  });

  test('applicationStatusEmail — positive stage shows congratulations context', () => {
    const result = applicationStatusEmail({
      studentName: 'Amit',
      companyName: 'FinCorp',
      driveTitle:  'Backend Dev',
      newStage:    'offered',
      note:        '',
    });
    expect(result.html).toContain('FinCorp');
    expect(result.subject).toMatch(/FinCorp/);
  });

  test('applicationStatusEmail — rejected stage renders correctly', () => {
    const result = applicationStatusEmail({
      studentName: 'Sneha',
      companyName: 'BigCo',
      driveTitle:  'ML Engineer',
      newStage:    'rejected',
      note:        'Not enough experience',
    });
    expect(result.html).toContain('Not Selected');
    expect(result.html).toContain('Not enough experience');
  });

  test('oaReminderEmail contains assessment title and times', () => {
    const result = oaReminderEmail({
      studentName:     'Rahul',
      companyName:     'QuizCorp',
      assessmentTitle: 'Round 1 OA',
      startsAt:        new Date('2025-12-10T10:00:00'),
      endsAt:          new Date('2025-12-10T12:00:00'),
      assessmentId:    'assess123',
    });
    expect(result.html).toContain('Round 1 OA');
    expect(result.html).toContain('QuizCorp');
    expect(result.subject).toContain('OA Reminder');
  });

  test('offerReleasedEmail congratulates the student', () => {
    const result = offerReleasedEmail({
      studentName: 'Sneha',
      companyName: 'StartupX',
      driveTitle:  'Full Stack Dev',
      deadline:    new Date('2025-12-31'),
    });
    expect(result.html).toContain('Congratulations');
    expect(result.html).toContain('StartupX');
    expect(result.subject).toMatch(/offer/i);
  });

  test('resultDeclaredEmail — placed true shows congratulations', () => {
    const result = resultDeclaredEmail({
      studentName: 'Amit',
      companyName: 'MegaCorp',
      driveTitle:  'SDE-2',
      placed:      true,
    });
    expect(result.html).toContain('Congratulations');
    expect(result.html).toContain('MegaCorp');
  });

  test('resultDeclaredEmail — placed false shows encouragement', () => {
    const result = resultDeclaredEmail({
      studentName: 'Priya',
      companyName: 'MegaCorp',
      driveTitle:  'SDE-2',
      placed:      false,
    });
    expect(result.html).toContain('Thank you for participating');
  });

  test('generalEmail renders title and message', () => {
    const result = generalEmail({
      recipientName: 'Student',
      title:         'Holiday Notice',
      message:       'Office closed on 25th Dec',
      link:          null,
    });
    expect(result.html).toContain('Holiday Notice');
    expect(result.html).toContain('Office closed on 25th Dec');
  });

  test('all templates return non-empty html string', () => {
    const templates = [
      welcomeEmail({ name: 'X', role: 'student' }),
      otpEmail({ otp: '000000' }),
      driveOpenedEmail({ studentName: 'X', companyName: 'Y', driveTitle: 'Z', driveId: 'id1' }),
      applicationStatusEmail({ studentName: 'X', companyName: 'Y', driveTitle: 'Z', newStage: 'hr' }),
      oaReminderEmail({ studentName: 'X', companyName: 'Y', assessmentTitle: 'OA', assessmentId: 'id2' }),
      offerReleasedEmail({ studentName: 'X', companyName: 'Y', driveTitle: 'Z' }),
      resultDeclaredEmail({ studentName: 'X', companyName: 'Y', driveTitle: 'Z', placed: false }),
      generalEmail({ title: 'T', message: 'M' }),
    ];

    for (const t of templates) {
      expect(typeof t.subject).toBe('string');
      expect(t.subject.length).toBeGreaterThan(0);
      expect(typeof t.html).toBe('string');
      expect(t.html.length).toBeGreaterThan(100); // not an empty shell
    }
  });
});