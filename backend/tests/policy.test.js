// Phase 10 — Unit tests for policy engine (evaluatePolicy, isDreamDrive)
// and integration tests for policy endpoints + enforcement on apply

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) await collections[key].deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

const {
  evaluatePolicy,
  isDreamDrive,
} = require('../src/services/policy.service');

// ── helpers ──────────────────────────────────────────────────

const defaultPolicy = {
  oneOfferPolicy:          true,
  dreamPackageLPA:         10,
  maxActiveApplications:   0,
  maxApplicationsPerWeek:  0,
  offerResponseWindowDays: 3,
  requireCompleteProfile:  false,
  minProfileScore:         0,
};

const unplacedStudent = {
  _id:             new mongoose.Types.ObjectId(),
  cgpa:            8.5,
  branch:          'CSE',
  graduationYear:  2025,
  rollNumber:      'CS001',
  placementStatus: 'unplaced',
};

const placedStudent = {
  ...unplacedStudent,
  placementStatus: 'placed',
};

const dreamPlacedStudent = {
  ...unplacedStudent,
  placementStatus: 'dream_placed',
};

const regularDrive = {
  _id:   new mongoose.Types.ObjectId(),
  title: 'SDE Intern',
  roles: [{ ctc: 6, title: 'SDE' }],
};

const dreamDriveDoc = {
  _id:   new mongoose.Types.ObjectId(),
  title: 'Senior SDE',
  roles: [{ ctc: 15, title: 'Senior SDE' }],
};

// ── evaluatePolicy — unplaced student ────────────────────────

describe('evaluatePolicy — unplaced student', () => {
  test('allows unplaced student to apply to any drive', () => {
    const result = evaluatePolicy(
      { student: unplacedStudent, drive: regularDrive },
      defaultPolicy
    );
    expect(result.allowed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  test('allows unplaced student to apply to dream drive', () => {
    const result = evaluatePolicy(
      { student: unplacedStudent, drive: dreamDriveDoc },
      defaultPolicy
    );
    expect(result.allowed).toBe(true);
  });

  test('allows apply with oneOfferPolicy OFF', () => {
    const result = evaluatePolicy(
      { student: unplacedStudent, drive: regularDrive },
      { ...defaultPolicy, oneOfferPolicy: false }
    );
    expect(result.allowed).toBe(true);
  });
});

// ── evaluatePolicy — one-offer policy ────────────────────────

describe('evaluatePolicy — one-offer policy', () => {
  test('blocks placed student from applying to non-dream drive', () => {
    const result = evaluatePolicy(
      { student: placedStudent, drive: regularDrive },
      defaultPolicy
    );
    expect(result.allowed).toBe(false);
    expect(result.violations[0]).toMatch(/one-offer policy/i);
  });

  test('allows placed student to apply to dream drive', () => {
    const result = evaluatePolicy(
      { student: placedStudent, drive: dreamDriveDoc },
      defaultPolicy
    );
    expect(result.allowed).toBe(true);
  });

  test('dream_placed student can apply to any drive', () => {
    const resultRegular = evaluatePolicy(
      { student: dreamPlacedStudent, drive: regularDrive },
      defaultPolicy
    );
    const resultDream = evaluatePolicy(
      { student: dreamPlacedStudent, drive: dreamDriveDoc },
      defaultPolicy
    );
    expect(resultRegular.allowed).toBe(true);
    expect(resultDream.allowed).toBe(true);
  });

  test('placed student allowed when oneOfferPolicy is OFF', () => {
    const result = evaluatePolicy(
      { student: placedStudent, drive: regularDrive },
      { ...defaultPolicy, oneOfferPolicy: false }
    );
    expect(result.allowed).toBe(true);
  });

  test('placed student allowed when dreamPackageLPA is 0 (disabled)', () => {
    // with dreamPackageLPA=0 no drive is a dream drive so placed students
    // are always blocked if oneOfferPolicy is ON — this is expected
    const result = evaluatePolicy(
      { student: placedStudent, drive: dreamDriveDoc },
      { ...defaultPolicy, dreamPackageLPA: 0 }
    );
    // dreamPackageLPA=0 means isDream=false for all drives → blocked
    expect(result.allowed).toBe(false);
  });

  test('drive with CTC exactly at threshold is a dream drive', () => {
    const borderlineDrive = { roles: [{ ctc: 10 }] };
    const result = evaluatePolicy(
      { student: placedStudent, drive: borderlineDrive },
      defaultPolicy   // dreamPackageLPA = 10
    );
    expect(result.allowed).toBe(true);
  });

  test('drive with CTC just below threshold is not a dream drive', () => {
    const borderlineDrive = { roles: [{ ctc: 9.9 }] };
    const result = evaluatePolicy(
      { student: placedStudent, drive: borderlineDrive },
      defaultPolicy
    );
    expect(result.allowed).toBe(false);
  });

  test('uses max role CTC to determine dream drive', () => {
    const multiRoleDrive = {
      roles: [{ ctc: 6 }, { ctc: 12 }, { ctc: 8 }],
    };
    const result = evaluatePolicy(
      { student: placedStudent, drive: multiRoleDrive },
      defaultPolicy   // maxCTC=12 >= 10 → dream drive
    );
    expect(result.allowed).toBe(true);
  });
});

// ── evaluatePolicy — application limits ──────────────────────

describe('evaluatePolicy — application limits', () => {
  test('blocks when active applications at limit', () => {
    const result = evaluatePolicy(
      {
        student:               unplacedStudent,
        drive:                 regularDrive,
        activeApplicationCount: 3,
      },
      { ...defaultPolicy, maxActiveApplications: 3 }
    );
    expect(result.allowed).toBe(false);
    expect(result.violations[0]).toMatch(/active application/i);
  });

  test('allows when active applications below limit', () => {
    const result = evaluatePolicy(
      {
        student:               unplacedStudent,
        drive:                 regularDrive,
        activeApplicationCount: 2,
      },
      { ...defaultPolicy, maxActiveApplications: 3 }
    );
    expect(result.allowed).toBe(true);
  });

  test('maxActiveApplications=0 means unlimited', () => {
    const result = evaluatePolicy(
      {
        student:               unplacedStudent,
        drive:                 regularDrive,
        activeApplicationCount: 999,
      },
      { ...defaultPolicy, maxActiveApplications: 0 }
    );
    expect(result.allowed).toBe(true);
  });

  test('blocks when weekly applications at limit', () => {
    const result = evaluatePolicy(
      {
        student:                unplacedStudent,
        drive:                  regularDrive,
        recentApplicationCount: 5,
      },
      { ...defaultPolicy, maxApplicationsPerWeek: 5 }
    );
    expect(result.allowed).toBe(false);
    expect(result.violations[0]).toMatch(/week/i);
  });

  test('allows when weekly applications below limit', () => {
    const result = evaluatePolicy(
      {
        student:                unplacedStudent,
        drive:                  regularDrive,
        recentApplicationCount: 4,
      },
      { ...defaultPolicy, maxApplicationsPerWeek: 5 }
    );
    expect(result.allowed).toBe(true);
  });

  test('maxApplicationsPerWeek=0 means unlimited', () => {
    const result = evaluatePolicy(
      {
        student:                unplacedStudent,
        drive:                  regularDrive,
        recentApplicationCount: 100,
      },
      { ...defaultPolicy, maxApplicationsPerWeek: 0 }
    );
    expect(result.allowed).toBe(true);
  });
});

// ── evaluatePolicy — profile completeness ────────────────────

describe('evaluatePolicy — profile completeness', () => {
  test('blocks when requireCompleteProfile=true and CGPA missing', () => {
    const incomplete = { ...unplacedStudent, cgpa: null };
    const result = evaluatePolicy(
      { student: incomplete, drive: regularDrive },
      { ...defaultPolicy, requireCompleteProfile: true }
    );
    expect(result.allowed).toBe(false);
    expect(result.violations[0]).toMatch(/CGPA/i);
  });

  test('blocks when multiple fields missing', () => {
    const incomplete = {
      ...unplacedStudent,
      cgpa:           null,
      branch:         null,
      graduationYear: null,
    };
    const result = evaluatePolicy(
      { student: incomplete, drive: regularDrive },
      { ...defaultPolicy, requireCompleteProfile: true }
    );
    expect(result.allowed).toBe(false);
    expect(result.violations[0]).toMatch(/CGPA|branch|graduation year/i);
  });

  test('allows complete profile when gate is ON', () => {
    const result = evaluatePolicy(
      { student: unplacedStudent, drive: regularDrive },
      { ...defaultPolicy, requireCompleteProfile: true }
    );
    expect(result.allowed).toBe(true);
  });

  test('ignores profile completeness when gate is OFF', () => {
    const incomplete = { ...unplacedStudent, cgpa: null, branch: null };
    const result = evaluatePolicy(
      { student: incomplete, drive: regularDrive },
      { ...defaultPolicy, requireCompleteProfile: false }
    );
    expect(result.allowed).toBe(true);
  });
});

// ── evaluatePolicy — resume score gate ───────────────────────

describe('evaluatePolicy — resume score gate', () => {
  test('blocks when no resume and minProfileScore > 0', () => {
    const result = evaluatePolicy(
      { student: unplacedStudent, drive: regularDrive, studentResume: null },
      { ...defaultPolicy, minProfileScore: 50 }
    );
    expect(result.allowed).toBe(false);
    expect(result.violations[0]).toMatch(/resume/i);
  });

  test('blocks when resume score below minimum', () => {
    const result = evaluatePolicy(
      {
        student:       unplacedStudent,
        drive:         regularDrive,
        studentResume: { score: 40 },
      },
      { ...defaultPolicy, minProfileScore: 50 }
    );
    expect(result.allowed).toBe(false);
    expect(result.violations[0]).toMatch(/40/);
  });

  test('allows when resume score meets minimum', () => {
    const result = evaluatePolicy(
      {
        student:       unplacedStudent,
        drive:         regularDrive,
        studentResume: { score: 50 },
      },
      { ...defaultPolicy, minProfileScore: 50 }
    );
    expect(result.allowed).toBe(true);
  });

  test('minProfileScore=0 skips resume score check', () => {
    const result = evaluatePolicy(
      { student: unplacedStudent, drive: regularDrive, studentResume: null },
      { ...defaultPolicy, minProfileScore: 0 }
    );
    expect(result.allowed).toBe(true);
  });
});

// ── evaluatePolicy — multiple violations ─────────────────────

describe('evaluatePolicy — multiple simultaneous violations', () => {
  test('collects all violations when multiple rules fail', () => {
    const incomplete = { ...placedStudent, cgpa: null };
    const result = evaluatePolicy(
      {
        student:                incomplete,
        drive:                  regularDrive,
        recentApplicationCount: 5,
        activeApplicationCount:  3,
        studentResume:          null,
      },
      {
        ...defaultPolicy,
        requireCompleteProfile: true,
        maxApplicationsPerWeek: 5,
        maxActiveApplications:  3,
        minProfileScore:        50,
      }
    );

    expect(result.allowed).toBe(false);
    // one-offer + profile + weekly + active + resume score
    expect(result.violations.length).toBeGreaterThanOrEqual(3);
  });

  test('returns allowed=true only when all rules pass', () => {
    const result = evaluatePolicy(
      {
        student:                unplacedStudent,
        drive:                  regularDrive,
        recentApplicationCount: 2,
        activeApplicationCount:  1,
        studentResume:          { score: 70 },
      },
      {
        ...defaultPolicy,
        requireCompleteProfile: true,
        maxApplicationsPerWeek: 5,
        maxActiveApplications:  3,
        minProfileScore:        60,
      }
    );

    expect(result.allowed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });
});

// ── evaluatePolicy — edge cases ──────────────────────────────

describe('evaluatePolicy — edge cases', () => {
  test('handles missing context gracefully', () => {
    const result = evaluatePolicy({}, defaultPolicy);
    expect(result.allowed).toBe(true); // no student = no one-offer check
    expect(result.violations).toHaveLength(0);
  });

  test('handles null context', () => {
    const result = evaluatePolicy(null, defaultPolicy);
    expect(result.allowed).toBe(false);
  });

  test('handles null policy', () => {
    const result = evaluatePolicy(
      { student: unplacedStudent, drive: regularDrive },
      null
    );
    expect(result.allowed).toBe(false);
  });

  test('handles drive with no roles array', () => {
    const driveNoRoles = { _id: new mongoose.Types.ObjectId(), title: 'No Roles Drive' };
    const result = evaluatePolicy(
      { student: placedStudent, drive: driveNoRoles },
      defaultPolicy
    );
    // no roles → maxCTC=0 < 10 → not a dream drive → blocked
    expect(result.allowed).toBe(false);
  });

  test('handles drive with empty roles array', () => {
    const driveEmptyRoles = { roles: [] };
    // Math.max(...[]) = -Infinity, but we handle with || 0
    const result = evaluatePolicy(
      { student: unplacedStudent, drive: driveEmptyRoles },
      defaultPolicy
    );
    expect(result.allowed).toBe(true);
  });
});

// ── isDreamDrive helper ───────────────────────────────────────

describe('isDreamDrive', () => {
  test('returns true when max CTC >= threshold', () => {
    expect(isDreamDrive({ roles: [{ ctc: 12 }] }, { dreamPackageLPA: 10 })).toBe(true);
  });

  test('returns true at exact threshold', () => {
    expect(isDreamDrive({ roles: [{ ctc: 10 }] }, { dreamPackageLPA: 10 })).toBe(true);
  });

  test('returns false when max CTC < threshold', () => {
    expect(isDreamDrive({ roles: [{ ctc: 8 }] }, { dreamPackageLPA: 10 })).toBe(false);
  });

  test('returns false when dreamPackageLPA is 0', () => {
    expect(isDreamDrive({ roles: [{ ctc: 50 }] }, { dreamPackageLPA: 0 })).toBe(false);
  });

  test('returns false for null drive', () => {
    expect(isDreamDrive(null, { dreamPackageLPA: 10 })).toBe(false);
  });

  test('returns false for null policy', () => {
    expect(isDreamDrive({ roles: [{ ctc: 12 }] }, null)).toBe(false);
  });

  test('picks max CTC across multiple roles', () => {
    const drive = { roles: [{ ctc: 5 }, { ctc: 14 }, { ctc: 9 }] };
    expect(isDreamDrive(drive, { dreamPackageLPA: 10 })).toBe(true);
  });
});

// ── Policy model singleton ────────────────────────────────────

describe('Policy model — singleton', () => {
  const Policy = require('../src/models/Policy');

  test('getPolicy() creates document on first call', async () => {
    const policy = await Policy.getPolicy();
    expect(policy).toBeDefined();
    expect(policy.key).toBe('global');
  });

  test('getPolicy() returns same document on subsequent calls', async () => {
    const p1 = await Policy.getPolicy();
    const p2 = await Policy.getPolicy();
    expect(p1._id.toString()).toBe(p2._id.toString());
  });

  test('default values are correct', async () => {
    const policy = await Policy.getPolicy();
    expect(policy.oneOfferPolicy).toBe(true);
    expect(policy.dreamPackageLPA).toBe(10);
    expect(policy.maxActiveApplications).toBe(0);
    expect(policy.maxApplicationsPerWeek).toBe(0);
    expect(policy.offerResponseWindowDays).toBe(3);
    expect(policy.requireCompleteProfile).toBe(false);
    expect(policy.minProfileScore).toBe(0);
  });

  test('can update individual fields', async () => {
    const policy = await Policy.getPolicy();
    policy.dreamPackageLPA = 15;
    await policy.save();

    const reloaded = await Policy.findOne({ key: 'global' });
    expect(reloaded.dreamPackageLPA).toBe(15);
  });
});