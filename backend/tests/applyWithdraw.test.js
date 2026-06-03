// Phase 5 — Apply + Withdraw business logic tests
// Tests the guard logic used in application.controller.js

const { checkEligibility } = require('../src/services/eligibility.service');

// ── helpers ───────────────────────────────────────────────────────────────
const makeStudent = (overrides = {}) => ({
  _id: 'student1',
  branch: 'CSE',
  cgpa: 8.0,
  backlogs: 0,
  graduationYear: 2025,
  placementStatus: 'unplaced',
  rollNumber: '2021CSE001',
  gender: 'male',
  ...overrides,
});

const makeDrive = (overrides = {}) => ({
  _id: 'drive1',
  title: 'SDE Intern',
  status: 'open',
  eligibility: {
    allowedBranches: ['CSE', 'IT'],
    minCGPA: 7.0,
    maxBacklogs: 0,
    graduationYear: [2025],
    genderRestriction: 'any',
  },
  settings: { oneOfferPolicy: true, dreamPackageLPA: 20 },
  roles: [{ ctc: 12 }],
  ...overrides,
});

// simulate the controller's guard checks (pure logic, no DB)
const simulateApplyGuards = (student, drive, existingApplication = null) => {
  const errors = [];

  // guard 1 — drive must be open
  if (drive.status !== 'open') {
    errors.push(`Applications are not open for this drive (status: ${drive.status})`);
    return { allowed: false, errors };
  }

  // guard 2 — eligibility
  const eligResult = checkEligibility(student, drive);
  if (!eligResult.eligible) {
    errors.push(`Not eligible: ${eligResult.reasons.join('; ')}`);
    return { allowed: false, errors };
  }

  // guard 3 — duplicate check
  if (existingApplication) {
    if (existingApplication.status === 'withdrawn') {
      errors.push('You have withdrawn from this drive and cannot re-apply');
    } else {
      errors.push('You have already applied to this drive');
    }
    return { allowed: false, errors };
  }

  return { allowed: true, errors: [] };
};

const simulateWithdrawGuards = (application) => {
  const nonWithdrawable = ['withdrawn', 'selected', 'rejected'];
  if (nonWithdrawable.includes(application.status)) {
    return {
      allowed: false,
      error: `Cannot withdraw an application with status '${application.status}'`,
    };
  }
  return { allowed: true, error: null };
};

// ─────────────────────────────────────────────────────────────────────────
describe('applyToDrive — drive status guard', () => {
  test('allows application when drive is open', () => {
    const result = simulateApplyGuards(makeStudent(), makeDrive({ status: 'open' }));
    expect(result.allowed).toBe(true);
  });

  test('blocks when drive is draft', () => {
    const result = simulateApplyGuards(makeStudent(), makeDrive({ status: 'draft' }));
    expect(result.allowed).toBe(false);
    expect(result.errors[0]).toMatch(/not open/i);
  });

  test('blocks when drive is closed', () => {
    const result = simulateApplyGuards(makeStudent(), makeDrive({ status: 'closed' }));
    expect(result.allowed).toBe(false);
  });

  test('blocks when drive is completed', () => {
    const result = simulateApplyGuards(makeStudent(), makeDrive({ status: 'completed' }));
    expect(result.allowed).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('applyToDrive — eligibility guard', () => {
  test('blocks ineligible student', () => {
    const result = simulateApplyGuards(
      makeStudent({ cgpa: 4.0 }),
      makeDrive()
    );
    expect(result.allowed).toBe(false);
    expect(result.errors[0]).toMatch(/Not eligible/);
  });

  test('blocks student with wrong branch', () => {
    const result = simulateApplyGuards(
      makeStudent({ branch: 'ME' }),
      makeDrive()
    );
    expect(result.allowed).toBe(false);
  });

  test('allows eligible student', () => {
    const result = simulateApplyGuards(makeStudent(), makeDrive());
    expect(result.allowed).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('applyToDrive — duplicate guard', () => {
  test('blocks duplicate application', () => {
    const result = simulateApplyGuards(
      makeStudent(),
      makeDrive(),
      { status: 'applied' }
    );
    expect(result.allowed).toBe(false);
    expect(result.errors[0]).toMatch(/already applied/);
  });

  test('blocks re-apply after withdrawal', () => {
    const result = simulateApplyGuards(
      makeStudent(),
      makeDrive(),
      { status: 'withdrawn' }
    );
    expect(result.allowed).toBe(false);
    expect(result.errors[0]).toMatch(/withdrawn/);
  });

  test('allows fresh application with no existing record', () => {
    const result = simulateApplyGuards(makeStudent(), makeDrive(), null);
    expect(result.allowed).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('withdrawApplication — status guard', () => {
  const withdrawableStatuses = ['applied', 'shortlisted', 'oa', 'interview'];
  const nonWithdrawableStatuses = ['withdrawn', 'selected', 'rejected'];

  withdrawableStatuses.forEach((status) => {
    test(`allows withdrawal from status: ${status}`, () => {
      const result = simulateWithdrawGuards({ status });
      expect(result.allowed).toBe(true);
    });
  });

  nonWithdrawableStatuses.forEach((status) => {
    test(`blocks withdrawal from status: ${status}`, () => {
      const result = simulateWithdrawGuards({ status });
      expect(result.allowed).toBe(false);
      expect(result.error).toMatch(new RegExp(status));
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('applyToDrive — combined guard order', () => {
  test('drive status check runs before eligibility check', () => {
    // drive is closed AND student is ineligible — should report drive status error only
    const result = simulateApplyGuards(
      makeStudent({ cgpa: 1.0 }),
      makeDrive({ status: 'closed' })
    );
    expect(result.errors[0]).toMatch(/not open/i);
    expect(result.errors).toHaveLength(1);
  });

  test('eligibility check runs before duplicate check', () => {
    // student is ineligible AND has existing application — should report eligibility error
    const result = simulateApplyGuards(
      makeStudent({ cgpa: 1.0 }),
      makeDrive(),
      { status: 'applied' }
    );
    expect(result.errors[0]).toMatch(/Not eligible/);
  });
});