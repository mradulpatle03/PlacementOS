const {
  canTransition,
  getAllowedTransitions,
  validateTransition,
  STATUS_LABELS,
  TRANSITIONS,
} = require('../src/services/driveState.service');

// ── helpers ──────────────────────────────────────────────────────────────
const makeDrive = (overrides = {}) => ({
  _id: 'drive123',
  status: 'draft',
  company: 'company123',
  roles: [{ title: 'SDE', ctc: 10 }],
  applicationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days out
  eligibility: { allowedBranches: ['CSE', 'IT'] },
  totalOffers: 0,
  ...overrides,
});

// ── TRANSITIONS shape ───────────────────────────────────────────────────

describe('driveState.service — TRANSITIONS map', () => {
  test('draft can only go to published', () => {
    expect(TRANSITIONS.draft).toEqual(['published']);
  });

  test('published can go to open or back to draft', () => {
    expect(TRANSITIONS.published).toEqual(['open', 'draft']);
  });

  test('open can only go to closed', () => {
    expect(TRANSITIONS.open).toEqual(['closed']);
  });

  test('closed can go to completed or back to open', () => {
    expect(TRANSITIONS.closed).toEqual(['completed', 'open']);
  });

  test('completed is terminal — no transitions out', () => {
    expect(TRANSITIONS.completed).toEqual([]);
  });
});

// ── STATUS_LABELS ────────────────────────────────────────────────────────

describe('driveState.service — STATUS_LABELS', () => {
  test('every status in TRANSITIONS has a label', () => {
    Object.keys(TRANSITIONS).forEach((status) => {
      expect(STATUS_LABELS[status]).toBeDefined();
      expect(typeof STATUS_LABELS[status]).toBe('string');
    });
  });
});

// ── canTransition ────────────────────────────────────────────────────────

describe('driveState.service — canTransition', () => {
  test('draft → published is allowed', () => {
    expect(canTransition('draft', 'published')).toBe(true);
  });

  test('draft → open is NOT allowed (must publish first)', () => {
    expect(canTransition('draft', 'open')).toBe(false);
  });

  test('published → open is allowed', () => {
    expect(canTransition('published', 'open')).toBe(true);
  });

  test('published → draft (revert) is allowed', () => {
    expect(canTransition('published', 'draft')).toBe(true);
  });

  test('open → closed is allowed', () => {
    expect(canTransition('open', 'closed')).toBe(true);
  });

  test('closed → completed is allowed', () => {
    expect(canTransition('closed', 'completed')).toBe(true);
  });

  test('closed → open (reopen) is allowed', () => {
    expect(canTransition('closed', 'open')).toBe(true);
  });

  test('completed → anything is blocked', () => {
    expect(canTransition('completed', 'open')).toBe(false);
    expect(canTransition('completed', 'closed')).toBe(false);
  });

  test('unknown current status returns false for any target', () => {
    expect(canTransition('not_a_real_status', 'open')).toBe(false);
  });
});

// ── getAllowedTransitions ────────────────────────────────────────────────

describe('driveState.service — getAllowedTransitions', () => {
  test('returns status+label pairs for draft', () => {
    const result = getAllowedTransitions('draft');
    expect(result).toEqual([{ status: 'published', label: 'Published' }]);
  });

  test('returns two options for published', () => {
    const result = getAllowedTransitions('published');
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.status)).toEqual(['open', 'draft']);
  });

  test('returns empty array for completed', () => {
    expect(getAllowedTransitions('completed')).toEqual([]);
  });

  test('returns empty array for unknown status', () => {
    expect(getAllowedTransitions('bogus')).toEqual([]);
  });
});

// ── validateTransition — generic transition guard ───────────────────────

describe('driveState.service — validateTransition: invalid transitions', () => {
  test('rejects draft → open with a descriptive error listing allowed targets', () => {
    const errors = validateTransition(makeDrive({ status: 'draft' }), 'open');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/Cannot transition from 'draft' to 'open'/);
    expect(errors[0]).toMatch(/published/);
  });

  test('rejects transition from completed with "none" listed as allowed', () => {
    const errors = validateTransition(makeDrive({ status: 'completed' }), 'open');
    expect(errors[0]).toMatch(/none/);
  });
});

// ── validateTransition — publishing rules ────────────────────────────────

describe('driveState.service — validateTransition: publishing rules', () => {
  test('blocks publish when company is missing', () => {
    const errors = validateTransition(
      makeDrive({ status: 'draft', company: null }),
      'published'
    );
    expect(errors).toContain('Company is required before publishing');
  });

  test('blocks publish when no roles defined', () => {
    const errors = validateTransition(
      makeDrive({ status: 'draft', roles: [] }),
      'published'
    );
    expect(errors).toContain('At least one role is required before publishing');
  });

  test('blocks publish when applicationDeadline is missing', () => {
    const errors = validateTransition(
      makeDrive({ status: 'draft', applicationDeadline: null }),
      'published'
    );
    expect(errors).toContain('Application deadline is required before publishing');
  });

  test('blocks publish when allowedBranches is empty', () => {
    const errors = validateTransition(
      makeDrive({ status: 'draft', eligibility: { allowedBranches: [] } }),
      'published'
    );
    expect(errors).toContain('Allowed branches must be specified');
  });

  test('blocks publish when eligibility is entirely missing', () => {
    const errors = validateTransition(
      makeDrive({ status: 'draft', eligibility: undefined }),
      'published'
    );
    expect(errors).toContain('Allowed branches must be specified');
  });

  test('allows publish when all required fields are present', () => {
    const errors = validateTransition(makeDrive({ status: 'draft' }), 'published');
    expect(errors).toEqual([]);
  });

  test('collects multiple publish errors at once', () => {
    const errors = validateTransition(
      makeDrive({
        status: 'draft',
        company: null,
        roles: [],
        applicationDeadline: null,
        eligibility: { allowedBranches: [] },
      }),
      'published'
    );
    expect(errors).toHaveLength(4);
  });
});

// ── validateTransition — opening rules ───────────────────────────────────

describe('driveState.service — validateTransition: opening rules', () => {
  test('blocks opening when application deadline has already passed', () => {
    const errors = validateTransition(
      makeDrive({
        status: 'published',
        applicationDeadline: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
      }),
      'open'
    );
    expect(errors).toContain('Cannot open drive — application deadline has already passed');
  });

  test('allows opening when application deadline is in the future', () => {
    const errors = validateTransition(
      makeDrive({
        status: 'published',
        applicationDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
      }),
      'open'
    );
    expect(errors).toEqual([]);
  });
});

// ── validateTransition — completing rules ────────────────────────────────

describe('driveState.service — validateTransition: completing rules', () => {
  test('allows completing with 0 offers (warning only, not a hard block)', () => {
    const errors = validateTransition(
      makeDrive({ status: 'closed', totalOffers: 0 }),
      'completed'
    );
    expect(errors).toEqual([]);
  });

  test('allows completing with offers present', () => {
    const errors = validateTransition(
      makeDrive({ status: 'closed', totalOffers: 5 }),
      'completed'
    );
    expect(errors).toEqual([]);
  });
});

// ── validateTransition — revert paths ────────────────────────────────────

describe('driveState.service — validateTransition: revert paths', () => {
  test('published → draft (revert) has no extra validation', () => {
    const errors = validateTransition(makeDrive({ status: 'published' }), 'draft');
    expect(errors).toEqual([]);
  });

  test('closed → open (reopen) has no extra validation beyond deadline check is skipped', () => {
    // newStatus is 'open' so the deadline check DOES apply here too
    const errors = validateTransition(
      makeDrive({ status: 'closed', applicationDeadline: new Date(Date.now() + 86400000) }),
      'open'
    );
    expect(errors).toEqual([]);
  });
});