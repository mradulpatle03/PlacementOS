// Day 31 — Unit tests for eligibility.service.js
const { checkEligibility } = require('../src/services/eligibility.service');

// helpers
const makeStudent = (overrides = {}) => ({
  branch: 'CSE',
  cgpa: 8.0,
  backlogs: 0,
  graduationYear: 2025,
  placementStatus: 'unplaced',
  rollNumber: '2021CSE001',
  ...overrides,
});

const makeDrive = (overrides = {}) => ({
  eligibility: {
    allowedBranches: ['CSE', 'IT', 'ECE'],
    minCGPA: 7.0,
    maxBacklogs: 0,
    graduationYear: [2025],
    genderRestriction: 'any',
  },
  settings: {
    oneOfferPolicy: true,
    dreamPackageLPA: 20,
  },
  roles: [{ ctc: 12 }],
  ...overrides,
});

// tests

describe('checkEligibility — basic eligibility', () => {
  test('eligible student passes all checks', () => {
    const result = checkEligibility(makeStudent(), makeDrive());
    expect(result.eligible).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  test('returns ineligible for null inputs', () => {
    expect(checkEligibility(null, makeDrive()).eligible).toBe(false);
    expect(checkEligibility(makeStudent(), null).eligible).toBe(false);
  });
});

describe('checkEligibility — branch check', () => {
  test('blocks student with ineligible branch', () => {
    const result = checkEligibility(
      makeStudent({ branch: 'ME' }),
      makeDrive()
    );
    expect(result.eligible).toBe(false);
    expect(result.reasons[0]).toMatch(/Branch 'ME' is not eligible/);
  });

  test('passes student with eligible branch', () => {
    const result = checkEligibility(
      makeStudent({ branch: 'IT' }),
      makeDrive()
    );
    expect(result.eligible).toBe(true);
  });

  test('blocks student with no branch set', () => {
    const result = checkEligibility(
      makeStudent({ branch: undefined }),
      makeDrive()
    );
    expect(result.eligible).toBe(false);
    expect(result.reasons[0]).toMatch(/branch is not set/i);
  });

  test('allows any branch when allowedBranches is empty', () => {
    const result = checkEligibility(
      makeStudent({ branch: 'ME' }),
      makeDrive({ eligibility: { ...makeDrive().eligibility, allowedBranches: [] } })
    );
    expect(result.eligible).toBe(true);
  });
});

describe('checkEligibility — CGPA check', () => {
  test('blocks student below minCGPA', () => {
    const result = checkEligibility(
      makeStudent({ cgpa: 6.5 }),
      makeDrive()
    );
    expect(result.eligible).toBe(false);
    expect(result.reasons[0]).toMatch(/CGPA 6.5 is below/);
  });

  test('passes student at exactly minCGPA', () => {
    const result = checkEligibility(
      makeStudent({ cgpa: 7.0 }),
      makeDrive()
    );
    expect(result.eligible).toBe(true);
  });

  test('blocks student with no CGPA set when minCGPA > 0', () => {
    const result = checkEligibility(
      makeStudent({ cgpa: undefined }),
      makeDrive()
    );
    expect(result.eligible).toBe(false);
  });

  test('ignores CGPA check when minCGPA is 0', () => {
    const result = checkEligibility(
      makeStudent({ cgpa: undefined }),
      makeDrive({ eligibility: { ...makeDrive().eligibility, minCGPA: 0 } })
    );
    // only blocked by graduationYear since cgpa check skipped
    expect(result.reasons.some((r) => r.includes('CGPA'))).toBe(false);
  });
});

describe('checkEligibility — backlog check', () => {
  test('blocks student with backlogs when maxBacklogs is 0', () => {
    const result = checkEligibility(
      makeStudent({ backlogs: 1 }),
      makeDrive()
    );
    expect(result.eligible).toBe(false);
    expect(result.reasons[0]).toMatch(/1 backlog/);
  });

  test('passes student within allowed backlog count', () => {
    const result = checkEligibility(
      makeStudent({ backlogs: 2 }),
      makeDrive({ eligibility: { ...makeDrive().eligibility, maxBacklogs: 2 } })
    );
    expect(result.eligible).toBe(true);
  });

  test('blocks student exceeding allowed backlog count', () => {
    const result = checkEligibility(
      makeStudent({ backlogs: 3 }),
      makeDrive({ eligibility: { ...makeDrive().eligibility, maxBacklogs: 2 } })
    );
    expect(result.eligible).toBe(false);
  });
});

describe('checkEligibility — graduation year check', () => {
  test('blocks student with wrong graduation year', () => {
    const result = checkEligibility(
      makeStudent({ graduationYear: 2024 }),
      makeDrive()
    );
    expect(result.eligible).toBe(false);
    expect(result.reasons[0]).toMatch(/2024 is not in eligible years/);
  });

  test('passes student with correct graduation year', () => {
    const result = checkEligibility(
      makeStudent({ graduationYear: 2025 }),
      makeDrive()
    );
    expect(result.eligible).toBe(true);
  });

  test('allows any year when graduationYear array is empty', () => {
    const result = checkEligibility(
      makeStudent({ graduationYear: 2024 }),
      makeDrive({ eligibility: { ...makeDrive().eligibility, graduationYear: [] } })
    );
    expect(result.eligible).toBe(true);
  });
});

describe('checkEligibility — one-offer policy', () => {
  test('blocks placed student for non-dream drive', () => {
    const result = checkEligibility(
      makeStudent({ placementStatus: 'placed' }),
      makeDrive() // dreamPackageLPA: 20, drive CTC: 12 → below threshold
    );
    expect(result.eligible).toBe(false);
    expect(result.reasons[0]).toMatch(/already placed/);
  });

  test('allows placed student for dream drive (CTC >= threshold)', () => {
    const result = checkEligibility(
      makeStudent({ placementStatus: 'placed' }),
      makeDrive({ roles: [{ ctc: 25 }] }) // 25 >= dreamPackageLPA 20
    );
    expect(result.eligible).toBe(true);
  });

  test('allows unplaced student regardless of CTC', () => {
    const result = checkEligibility(
      makeStudent({ placementStatus: 'unplaced' }),
      makeDrive()
    );
    expect(result.eligible).toBe(true);
  });

  test('allows placed student when oneOfferPolicy is false', () => {
    const result = checkEligibility(
      makeStudent({ placementStatus: 'placed' }),
      makeDrive({ settings: { oneOfferPolicy: false, dreamPackageLPA: 20 } })
    );
    expect(result.eligible).toBe(true);
  });
});

describe('checkEligibility — multiple failures', () => {
  test('returns all failure reasons at once', () => {
    const result = checkEligibility(
      makeStudent({ branch: 'ME', cgpa: 5.0, backlogs: 2 }),
      makeDrive()
    );
    expect(result.eligible).toBe(false);
    expect(result.reasons.length).toBeGreaterThanOrEqual(3);
  });
});

describe('checkEligibility — warnings (soft checks)', () => {
  test('adds warning when rollNumber not set', () => {
    const result = checkEligibility(
      makeStudent({ rollNumber: undefined }),
      makeDrive()
    );
    expect(result.warnings.some((w) => w.includes('Roll number'))).toBe(true);
  });
});

describe('checkEligibility — gender restriction', () => {
  test('blocks student whose gender does not match restriction', () => {
    const result = checkEligibility(
      makeStudent({ gender: 'male' }),
      makeDrive({ eligibility: { ...makeDrive().eligibility, genderRestriction: 'female' } })
    );
    expect(result.eligible).toBe(false);
    expect(result.reasons[0]).toMatch(/open to female candidates only/);
  });

  test('allows student whose gender matches restriction', () => {
    const result = checkEligibility(
      makeStudent({ gender: 'female' }),
      makeDrive({ eligibility: { ...makeDrive().eligibility, genderRestriction: 'female' } })
    );
    expect(result.eligible).toBe(true);
  });

  test('allows any gender when restriction is "any"', () => {
    const result = checkEligibility(
      makeStudent({ gender: 'male' }),
      makeDrive({ eligibility: { ...makeDrive().eligibility, genderRestriction: 'any' } })
    );
    expect(result.eligible).toBe(true);
  });

  test('skips gender check entirely when student.gender is not provided', () => {
    const result = checkEligibility(
      makeStudent({ gender: undefined }),
      makeDrive({ eligibility: { ...makeDrive().eligibility, genderRestriction: 'female' } })
    );
    // gender restriction only applies if student.gender is present
    expect(result.reasons.some((r) => r.includes('candidates only'))).toBe(false);
  });
});

describe('checkEligibility — one-offer policy edge case: dreamPackageLPA = 0', () => {
  test('blocks placed student even for a high-CTC drive when dream threshold is 0 (disabled)', () => {
    const result = checkEligibility(
      makeStudent({ placementStatus: 'placed' }),
      makeDrive({
        roles: [{ ctc: 100 }], // very high CTC
        settings: { oneOfferPolicy: true, dreamPackageLPA: 0 }, // dream exemption disabled
      })
    );
    expect(result.eligible).toBe(false);
    expect(result.reasons[0]).toMatch(/already placed/);
  });
});