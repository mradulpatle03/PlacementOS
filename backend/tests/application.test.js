// Mirrors the pattern of eligibility.test.js

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

// ── in-memory DB setup
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// model imports (after DB connected)
const Application = require('../src/models/Application');

// helpers
const makeIds = () => ({
  student: new mongoose.Types.ObjectId(),
  drive:   new mongoose.Types.ObjectId(),
  resume:  new mongoose.Types.ObjectId(),
});

describe('Application Model — creation', () => {
  test('creates application with default status applied', async () => {
    const ids = makeIds();
    const app = await Application.create({
      student: ids.student,
      drive:   ids.drive,
      resume:  ids.resume,
    });
    expect(app.status).toBe('applied');
    expect(app.stageAtExit).toBeNull();
    expect(app.withdrawnAt).toBeNull();
    expect(app.appliedAt).toBeDefined();
  });

  test('creates application with explicit status', async () => {
    const ids = makeIds();
    const app = await Application.create({
      student: ids.student,
      drive:   ids.drive,
      resume:  ids.resume,
      status:  'shortlisted',
    });
    expect(app.status).toBe('shortlisted');
  });

  test('rejects invalid status value', async () => {
    const ids = makeIds();
    await expect(
      Application.create({
        student: ids.student,
        drive:   ids.drive,
        resume:  ids.resume,
        status:  'flying',
      })
    ).rejects.toThrow();
  });

  test('requires student field', async () => {
    const ids = makeIds();
    await expect(
      Application.create({ drive: ids.drive, resume: ids.resume })
    ).rejects.toThrow();
  });

  test('requires drive field', async () => {
    const ids = makeIds();
    await expect(
      Application.create({ student: ids.student, resume: ids.resume })
    ).rejects.toThrow();
  });

  test('requires resume field', async () => {
    const ids = makeIds();
    await expect(
      Application.create({ student: ids.student, drive: ids.drive })
    ).rejects.toThrow();
  });
});

describe('Application Model — unique index', () => {
  test('blocks duplicate application for same student + drive', async () => {
    const ids = makeIds();
    await Application.create({
      student: ids.student,
      drive:   ids.drive,
      resume:  ids.resume,
    });
    await expect(
      Application.create({
        student: ids.student,
        drive:   ids.drive,
        resume:  new mongoose.Types.ObjectId(), // different resume — still blocks
      })
    ).rejects.toThrow();
  });

  test('allows same student to apply to different drives', async () => {
    const student = new mongoose.Types.ObjectId();
    const resume  = new mongoose.Types.ObjectId();

    await Application.create({ student, drive: new mongoose.Types.ObjectId(), resume });
    await Application.create({ student, drive: new mongoose.Types.ObjectId(), resume });

    const count = await Application.countDocuments({ student });
    expect(count).toBe(2);
  });

  test('allows different students to apply to same drive', async () => {
    const drive  = new mongoose.Types.ObjectId();
    const resume = new mongoose.Types.ObjectId();

    await Application.create({ student: new mongoose.Types.ObjectId(), drive, resume });
    await Application.create({ student: new mongoose.Types.ObjectId(), drive, resume });

    const count = await Application.countDocuments({ drive });
    expect(count).toBe(2);
  });
});

describe('Application Model — status transitions', () => {
  test('can update status through pipeline stages', async () => {
    const ids = makeIds();
    const app = await Application.create({
      student: ids.student,
      drive:   ids.drive,
      resume:  ids.resume,
    });

    const stages = ['shortlisted', 'oa', 'interview', 'selected'];
    for (const stage of stages) {
      app.status = stage;
      await app.save();
      expect(app.status).toBe(stage);
    }
  });

  test('records stageAtExit when withdrawing', async () => {
    const ids = makeIds();
    const app = await Application.create({
      student: ids.student,
      drive:   ids.drive,
      resume:  ids.resume,
      status:  'oa',
    });

    app.stageAtExit = app.status;
    app.status = 'withdrawn';
    app.withdrawnAt = new Date();
    await app.save();

    expect(app.status).toBe('withdrawn');
    expect(app.stageAtExit).toBe('oa');
    expect(app.withdrawnAt).toBeDefined();
  });

  test('records stageAtExit when rejecting', async () => {
    const ids = makeIds();
    const app = await Application.create({
      student: ids.student,
      drive:   ids.drive,
      resume:  ids.resume,
      status:  'interview',
    });

    app.stageAtExit = app.status;
    app.status = 'rejected';
    await app.save();

    expect(app.status).toBe('rejected');
    expect(app.stageAtExit).toBe('interview');
  });
});

describe('Application Model — queries', () => {
  test('finds all applications by student', async () => {
    const student = new mongoose.Types.ObjectId();
    const resume  = new mongoose.Types.ObjectId();

    await Application.create({ student, drive: new mongoose.Types.ObjectId(), resume });
    await Application.create({ student, drive: new mongoose.Types.ObjectId(), resume });
    // different student — should not appear
    await Application.create({
      student: new mongoose.Types.ObjectId(),
      drive:   new mongoose.Types.ObjectId(),
      resume,
    });

    const results = await Application.find({ student });
    expect(results).toHaveLength(2);
  });

  test('filters applications by status', async () => {
    const student = new mongoose.Types.ObjectId();
    const resume  = new mongoose.Types.ObjectId();

    await Application.create({ student, drive: new mongoose.Types.ObjectId(), resume, status: 'applied' });
    await Application.create({ student, drive: new mongoose.Types.ObjectId(), resume, status: 'shortlisted' });
    await Application.create({ student, drive: new mongoose.Types.ObjectId(), resume, status: 'shortlisted' });

    const shortlisted = await Application.find({ student, status: 'shortlisted' });
    expect(shortlisted).toHaveLength(2);
  });

  test('counts applications per drive', async () => {
    const drive  = new mongoose.Types.ObjectId();
    const resume = new mongoose.Types.ObjectId();

    await Application.create({ student: new mongoose.Types.ObjectId(), drive, resume, status: 'applied' });
    await Application.create({ student: new mongoose.Types.ObjectId(), drive, resume, status: 'applied' });
    await Application.create({ student: new mongoose.Types.ObjectId(), drive, resume, status: 'shortlisted' });

    const total = await Application.countDocuments({ drive });
    expect(total).toBe(3);

    const applied = await Application.countDocuments({ drive, status: 'applied' });
    expect(applied).toBe(2);
  });
});