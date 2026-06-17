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

const AssessmentSubmission = require('../src/models/AssessmentSubmission');
const { computeOAStats } = require('../src/services/oaScore.service');

const assessmentId = new mongoose.Types.ObjectId();

const makeSubmission = (overrides = {}) =>
  AssessmentSubmission.create({
    assessment:          assessmentId,
    student:              new mongoose.Types.ObjectId(),
    status:               'graded',
    totalMarksAwarded:    overrides.totalMarksAwarded ?? 0,
    totalMarksPossible:   overrides.totalMarksPossible ?? 100,
    percentageScore:      overrides.percentageScore ?? 0,
    timeTakenSeconds:     overrides.timeTakenSeconds ?? 600,
    autoSubmitted:        overrides.autoSubmitted ?? false,
    violationCount:       overrides.violationCount ?? 0,
    submittedAt:          overrides.submittedAt ?? new Date(),
    ...overrides,
  });

// ── empty state ──────────────────────────────────────────────────────────

describe('computeOAStats — no submissions', () => {
  test('returns zeroed stats and empty leaderboard when nothing exists', async () => {
    const result = await computeOAStats(assessmentId.toString());
    expect(result.stats.totalAppeared).toBe(0);
    expect(result.stats.totalSubmitted).toBe(0);
    expect(result.stats.avgScore).toBe(0);
    expect(result.leaderboard).toEqual([]);
  });

  test('returns all-zero distribution buckets when nothing graded', async () => {
    const result = await computeOAStats(assessmentId.toString());
    expect(result.distribution).toEqual({
      '0-20': 0, '20-40': 0, '40-60': 0, '60-80': 0, '80-100': 0,
    });
  });
});

// ── only in-progress submissions (no graded yet) ──────────────────────────

describe('computeOAStats — only in_progress submissions', () => {
  test('counts appeared and inProgress correctly, but no graded stats', async () => {
    await makeSubmission({ status: 'in_progress', percentageScore: 0 });
    await makeSubmission({ status: 'in_progress', percentageScore: 0 });

    const result = await computeOAStats(assessmentId.toString());
    expect(result.stats.totalAppeared).toBe(2);
    expect(result.stats.inProgress).toBe(2);
    expect(result.stats.totalSubmitted).toBe(0);
    expect(result.leaderboard).toEqual([]);
  });
});

// ── basic aggregate stats ────────────────────────────────────────────────

describe('computeOAStats — aggregate stats with graded submissions', () => {
  test('computes avg, max, min correctly', async () => {
    await makeSubmission({ percentageScore: 90 });
    await makeSubmission({ percentageScore: 50 });
    await makeSubmission({ percentageScore: 10 });

    const result = await computeOAStats(assessmentId.toString());
    expect(result.stats.totalAppeared).toBe(3);
    expect(result.stats.totalSubmitted).toBe(3);
    expect(result.stats.maxScore).toBe(90);
    expect(result.stats.minScore).toBe(10);
    expect(result.stats.avgScore).toBe(50);
  });

  test('passRate respects custom passMark option', async () => {
    await makeSubmission({ percentageScore: 80 }); // pass
    await makeSubmission({ percentageScore: 30 }); // fail at 40 default, fail at 50 too
    await makeSubmission({ percentageScore: 55 }); // pass at 50, fail at default 40? no — 55 >= 40, passes default

    const defaultResult = await computeOAStats(assessmentId.toString());
    // default passMark = 40 → 80 and 55 pass, 30 fails → 2/3
    expect(defaultResult.stats.passRate).toBeCloseTo(66.67, 1);

    const strictResult = await computeOAStats(assessmentId.toString(), { passMark: 60 });
    // passMark = 60 → only 80 passes → 1/3
    expect(strictResult.stats.passRate).toBeCloseTo(33.33, 1);
  });

  test('status "submitted" (not just "graded") counts toward totalSubmitted', async () => {
    await makeSubmission({ status: 'submitted', percentageScore: 70 });
    const result = await computeOAStats(assessmentId.toString());
    expect(result.stats.totalSubmitted).toBe(1);
  });

  test('only counts submissions for the given assessmentId', async () => {
    const otherAssessment = new mongoose.Types.ObjectId();
    await makeSubmission({ percentageScore: 90 });
    await AssessmentSubmission.create({
      assessment: otherAssessment,
      student: new mongoose.Types.ObjectId(),
      status: 'graded',
      percentageScore: 10,
      totalMarksAwarded: 10,
      totalMarksPossible: 100,
    });

    const result = await computeOAStats(assessmentId.toString());
    expect(result.stats.totalAppeared).toBe(1);
    expect(result.stats.avgScore).toBe(90);
  });
});

// ── distribution buckets ─────────────────────────────────────────────────

describe('computeOAStats — score distribution buckets', () => {
  test('places scores into correct buckets at boundaries', async () => {
    await makeSubmission({ percentageScore: 19 });  // 0-20
    await makeSubmission({ percentageScore: 20 });  // 20-40 (boundary goes to next bucket)
    await makeSubmission({ percentageScore: 39 });  // 20-40
    await makeSubmission({ percentageScore: 60 });  // 60-80
    await makeSubmission({ percentageScore: 100 }); // 80-100

    const result = await computeOAStats(assessmentId.toString());
    expect(result.distribution['0-20']).toBe(1);
    expect(result.distribution['20-40']).toBe(2);
    expect(result.distribution['60-80']).toBe(1);
    expect(result.distribution['80-100']).toBe(1);
  });
});

// ── leaderboard ───────────────────────────────────────────────────────────

describe('computeOAStats — leaderboard ranking', () => {
  test('ranks by score descending', async () => {
    await makeSubmission({ percentageScore: 60, timeTakenSeconds: 500 });
    await makeSubmission({ percentageScore: 90, timeTakenSeconds: 800 });
    await makeSubmission({ percentageScore: 75, timeTakenSeconds: 400 });

    const result = await computeOAStats(assessmentId.toString());
    expect(result.leaderboard.map((l) => l.percentageScore)).toEqual([90, 75, 60]);
    expect(result.leaderboard[0].rank).toBe(1);
    expect(result.leaderboard[2].rank).toBe(3);
  });

  test('breaks ties by faster time taken', async () => {
    await makeSubmission({ percentageScore: 80, timeTakenSeconds: 900 });
    await makeSubmission({ percentageScore: 80, timeTakenSeconds: 300 }); // same score, faster

    const result = await computeOAStats(assessmentId.toString());
    expect(result.leaderboard[0].timeTakenSeconds).toBe(300);
    expect(result.leaderboard[1].timeTakenSeconds).toBe(900);
  });

  test('respects topN limit', async () => {
    for (let i = 0; i < 15; i++) {
      await makeSubmission({ percentageScore: i });
    }
    const result = await computeOAStats(assessmentId.toString(), { topN: 5 });
    expect(result.leaderboard).toHaveLength(5);
  });

  test('defaults topN to 10 when not specified', async () => {
    for (let i = 0; i < 15; i++) {
      await makeSubmission({ percentageScore: i });
    }
    const result = await computeOAStats(assessmentId.toString());
    expect(result.leaderboard).toHaveLength(10);
  });

  test('leaderboard entries include student fallback values when student is missing', async () => {
    // submission with no populated student (student field set but not a real Student doc)
    await makeSubmission({ percentageScore: 50 });
    const result = await computeOAStats(assessmentId.toString());
    expect(result.leaderboard[0].student.name).toBe('—');
    expect(result.leaderboard[0].student.rollNumber).toBe('—');
  });

  test('leaderboard carries through autoSubmitted and violationCount flags', async () => {
    await makeSubmission({ percentageScore: 50, autoSubmitted: true, violationCount: 3 });
    const result = await computeOAStats(assessmentId.toString());
    expect(result.leaderboard[0].autoSubmitted).toBe(true);
    expect(result.leaderboard[0].violationCount).toBe(3);
  });
});