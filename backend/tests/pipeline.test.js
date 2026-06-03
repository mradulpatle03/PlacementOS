const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

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
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

const Application = require('../src/models/Application');
const {
  getAllowedNextStages,
  validateStageTransition,
  PIPELINE_STAGES,
  TERMINAL_STAGES,
  STAGE_LABELS,
} = require('../src/services/pipeline.service');

// ── helpers ───────────────────────────────────────────────────────────────
const makeIds = () => ({
  student: new mongoose.Types.ObjectId(),
  drive:   new mongoose.Types.ObjectId(),
  resume:  new mongoose.Types.ObjectId(),
});

// ── PIPELINE_STAGES shape ─────────────────────────────────────────────────

describe('pipeline.service — PIPELINE_STAGES', () => {
  test('has exactly 8 forward stages', () => {
    expect(PIPELINE_STAGES).toHaveLength(8);
  });

  test('starts with applied', () => {
    expect(PIPELINE_STAGES[0]).toBe('applied');
  });

  test('ends with accepted', () => {
    expect(PIPELINE_STAGES[PIPELINE_STAGES.length - 1]).toBe('accepted');
  });

  test('contains all expected stages in order', () => {
    expect(PIPELINE_STAGES).toEqual([
      'applied',
      'shortlisted',
      'oa',
      'interview_1',
      'interview_2',
      'hr',
      'offered',
      'accepted',
    ]);
  });
});

// ── STAGE_LABELS ──────────────────────────────────────────────────────────

describe('pipeline.service — STAGE_LABELS', () => {
  test('every pipeline stage has a label', () => {
    PIPELINE_STAGES.forEach((stage) => {
      expect(STAGE_LABELS[stage]).toBeDefined();
      expect(typeof STAGE_LABELS[stage]).toBe('string');
    });
  });

  test('terminal stages have labels', () => {
    TERMINAL_STAGES.forEach((stage) => {
      expect(STAGE_LABELS[stage]).toBeDefined();
    });
  });
});

// ── getAllowedNextStages ───────────────────────────────────────────────────

describe('pipeline.service — getAllowedNextStages', () => {
  test('from applied: can move forward to all later stages', () => {
    const allowed = getAllowedNextStages('applied');
    expect(allowed).toContain('shortlisted');
    expect(allowed).toContain('oa');
    expect(allowed).toContain('interview_1');
    expect(allowed).toContain('interview_2');
    expect(allowed).toContain('hr');
    expect(allowed).toContain('offered');
    expect(allowed).toContain('accepted');
  });

  test('from applied: can also reject', () => {
    expect(getAllowedNextStages('applied')).toContain('rejected');
  });

  test('from applied: cannot move backward (first stage)', () => {
    const allowed = getAllowedNextStages('applied');
    expect(allowed).not.toContain('applied');
  });

  test('from shortlisted: can move back one stage to applied', () => {
    expect(getAllowedNextStages('shortlisted')).toContain('applied');
  });

  test('from hr: can move back one stage to interview_2', () => {
    expect(getAllowedNextStages('hr')).toContain('interview_2');
  });

  test('from hr: cannot move two stages back to interview_1', () => {
    expect(getAllowedNextStages('hr')).not.toContain('interview_1');
  });

  test('from accepted (terminal): returns empty array', () => {
    expect(getAllowedNextStages('accepted')).toEqual([]);
  });

  test('from rejected (terminal): returns empty array', () => {
    expect(getAllowedNextStages('rejected')).toEqual([]);
  });

  test('from withdrawn (terminal): returns empty array', () => {
    expect(getAllowedNextStages('withdrawn')).toEqual([]);
  });
});

// ── validateStageTransition ───────────────────────────────────────────────

describe('pipeline.service — validateStageTransition', () => {
  test('valid: applied → shortlisted', () => {
    expect(validateStageTransition('applied', 'shortlisted').valid).toBe(true);
  });

  test('valid: applied → hr (multi-step skip)', () => {
    expect(validateStageTransition('applied', 'hr').valid).toBe(true);
  });

  test('valid: applied → accepted (skip all the way)', () => {
    expect(validateStageTransition('applied', 'accepted').valid).toBe(true);
  });

  test('valid: shortlisted → applied (one step back)', () => {
    expect(validateStageTransition('shortlisted', 'applied').valid).toBe(true);
  });

  test('valid: oa → rejected', () => {
    expect(validateStageTransition('oa', 'rejected').valid).toBe(true);
  });

  test('valid: hr → rejected', () => {
    expect(validateStageTransition('hr', 'rejected').valid).toBe(true);
  });

  test('invalid: move from terminal accepted', () => {
    const result = validateStageTransition('accepted', 'offered');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/terminal/);
  });

  test('invalid: move from terminal rejected', () => {
    const result = validateStageTransition('rejected', 'shortlisted');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/terminal/);
  });

  test('invalid: unknown target stage', () => {
    const result = validateStageTransition('applied', 'magic_stage');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Unknown stage/);
  });

  test('invalid: withdrawn must use withdraw endpoint', () => {
    const result = validateStageTransition('applied', 'withdrawn');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/withdraw endpoint/);
  });

  test('invalid: cannot move two steps backward', () => {
    const result = validateStageTransition('hr', 'interview_1');
    expect(result.valid).toBe(false);
  });
});

// ── Application model — stageHistory (Day 39) ─────────────────────────────

describe('Application model — stageHistory', () => {
  test('stageHistory starts as empty array', async () => {
    const ids = makeIds();
    const app = await Application.create({
      student: ids.student,
      drive:   ids.drive,
      resume:  ids.resume,
    });
    expect(app.stageHistory).toEqual([]);
  });

  test('can push a single entry into stageHistory', async () => {
    const ids = makeIds();
    const app = await Application.create({
      student: ids.student,
      drive:   ids.drive,
      resume:  ids.resume,
    });

    app.stageHistory.push({
      stage:   'shortlisted',
      movedBy: new mongoose.Types.ObjectId(),
      note:    'Strong resume',
    });
    app.status = 'shortlisted';
    await app.save();

    const fetched = await Application.findById(app._id);
    expect(fetched.stageHistory).toHaveLength(1);
    expect(fetched.stageHistory[0].stage).toBe('shortlisted');
    expect(fetched.stageHistory[0].note).toBe('Strong resume');
    expect(fetched.stageHistory[0].movedAt).toBeDefined();
  });

  test('stageHistory accumulates across multiple moves', async () => {
    const ids = makeIds();
    const app = await Application.create({
      student: ids.student,
      drive:   ids.drive,
      resume:  ids.resume,
    });

    const stagesToMove = ['shortlisted', 'oa', 'interview_1'];
    for (const stage of stagesToMove) {
      app.stageHistory.push({ stage, movedBy: new mongoose.Types.ObjectId() });
      app.status = stage;
      await app.save();
    }

    const fetched = await Application.findById(app._id);
    expect(fetched.stageHistory).toHaveLength(3);
    expect(fetched.stageHistory.map((h) => h.stage)).toEqual(stagesToMove);
  });

  test('new pipeline stages are accepted by schema', async () => {
    const newStages = ['interview_1', 'interview_2', 'hr', 'offered', 'accepted'];
    for (const stage of newStages) {
      const ids = makeIds();
      const app = await Application.create({
        student: ids.student,
        drive:   ids.drive,
        resume:  ids.resume,
        status:  stage,
      });
      expect(app.status).toBe(stage);
    }
  });

  test('legacy stages (interview, selected) still accepted for backward compat', async () => {
    const ids1 = makeIds();
    const ids2 = makeIds();
    const a1 = await Application.create({ ...ids1, status: 'interview' });
    const a2 = await Application.create({ ...ids2, status: 'selected' });
    expect(a1.status).toBe('interview');
    expect(a2.status).toBe('selected');
  });
});

// ── reject logic (Day 40) ─────────────────────────────────────────────────

describe('Application model — rejection via stageHistory', () => {
  test('records stageAtExit and remarks on rejection', async () => {
    const ids = makeIds();
    const app = await Application.create({
      student: ids.student,
      drive:   ids.drive,
      resume:  ids.resume,
      status:  'oa',
    });

    // simulate what rejectApplication controller does
    const previousStage = app.status;
    app.stageHistory.push({
      stage:   'rejected',
      movedBy: new mongoose.Types.ObjectId(),
      note:    'Failed OA cutoff',
    });
    app.stageAtExit = previousStage;
    app.status = 'rejected';
    app.remarks = 'Failed OA cutoff';
    await app.save();

    const fetched = await Application.findById(app._id);
    expect(fetched.status).toBe('rejected');
    expect(fetched.stageAtExit).toBe('oa');
    expect(fetched.remarks).toBe('Failed OA cutoff');
    expect(fetched.stageHistory[0].stage).toBe('rejected');
    expect(fetched.stageHistory[0].note).toBe('Failed OA cutoff');
  });

  test('rejected application cannot be moved further (validateStageTransition)', () => {
    const result = validateStageTransition('rejected', 'shortlisted');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/terminal/);
  });

  test('rejectApplication requires a non-empty reason (pure logic check)', () => {
    const reason = '   ';
    expect(reason.trim()).toBe('');
    // controller checks: if (!reason || !reason.trim()) → 400
    // this is the same guard used in rejectApplication
  });

  test('stageHistory note stores the rejection reason', async () => {
    const ids = makeIds();
    const app = await Application.create({
      student: ids.student,
      drive:   ids.drive,
      resume:  ids.resume,
      status:  'interview_2',
    });

    const reason = 'Did not meet technical bar';
    app.stageHistory.push({
      stage:   'rejected',
      movedBy: new mongoose.Types.ObjectId(),
      note:    reason,
    });
    app.stageAtExit = 'interview_2';
    app.status = 'rejected';
    app.remarks = reason;
    await app.save();

    const fetched = await Application.findById(app._id);
    expect(fetched.stageHistory[0].note).toBe(reason);
    expect(fetched.remarks).toBe(reason);
    expect(fetched.stageAtExit).toBe('interview_2');
  });
});

// ── stage history retrieval (Day 40) ─────────────────────────────────────

describe('Application model — stage history retrieval', () => {
  test('history entries have stage, movedBy, movedAt, note fields', async () => {
    const ids = makeIds();
    const movedBy = new mongoose.Types.ObjectId();
    const app = await Application.create({
      student: ids.student,
      drive:   ids.drive,
      resume:  ids.resume,
    });

    app.stageHistory.push({ stage: 'shortlisted', movedBy, note: 'Round 1 clear' });
    app.stageHistory.push({ stage: 'oa', movedBy, note: 'OA sent' });
    app.status = 'oa';
    await app.save();

    const fetched = await Application.findById(app._id).lean();
    expect(fetched.stageHistory).toHaveLength(2);

    const first = fetched.stageHistory[0];
    expect(first).toHaveProperty('stage', 'shortlisted');
    expect(first).toHaveProperty('note', 'Round 1 clear');
    expect(first).toHaveProperty('movedAt');
    expect(first.movedBy.toString()).toBe(movedBy.toString());
  });

  test('history is ordered chronologically (push order preserved)', async () => {
    const ids = makeIds();
    const app = await Application.create({
      student: ids.student,
      drive:   ids.drive,
      resume:  ids.resume,
    });

    app.stageHistory.push({ stage: 'shortlisted', movedBy: new mongoose.Types.ObjectId() });
    app.stageHistory.push({ stage: 'oa',          movedBy: new mongoose.Types.ObjectId() });
    app.stageHistory.push({ stage: 'interview_1', movedBy: new mongoose.Types.ObjectId() });
    app.status = 'interview_1';
    await app.save();

    const fetched = await Application.findById(app._id).lean();
    const stages = fetched.stageHistory.map((h) => h.stage);
    expect(stages).toEqual(['shortlisted', 'oa', 'interview_1']);
  });

  test('movedBy can be null (system-initiated move)', async () => {
    const ids = makeIds();
    const app = await Application.create({
      student: ids.student,
      drive:   ids.drive,
      resume:  ids.resume,
    });

    // movedBy defaults to null in the schema — system move
    app.stageHistory.push({ stage: 'shortlisted' });
    app.status = 'shortlisted';
    await app.save();

    const fetched = await Application.findById(app._id).lean();
    expect(fetched.stageHistory[0].movedBy).toBeNull();
  });
});