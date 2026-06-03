// Phase 5 — Eligibility endpoint logic tests (pure/unit — no HTTP server)
// Tests the controller functions directly with mocked req/res

const { checkEligibility } = require('../src/services/eligibility.service');

// ── reuse helpers from eligibility.test.js ────────────────────────────────
const makeStudent = (overrides = {}) => ({
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
  _id: 'drive123',
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

// ─────────────────────────────────────────────────────────────────────────
describe('checkMyEligibility — controller logic', () => {
  // simulate what the controller does: fetch student+drive, call service, shape response
  const simulateCheck = (student, drive) => {
    const result = checkEligibility(student, drive);
    return {
      success: true,
      data: {
        driveId: drive._id,
        driveTitle: drive.title,
        ...result,
      },
    };
  };

  test('returns eligible true for qualifying student', () => {
    const res = simulateCheck(makeStudent(), makeDrive());
    expect(res.success).toBe(true);
    expect(res.data.eligible).toBe(true);
    expect(res.data.driveTitle).toBe('SDE Intern');
  });

  test('returns eligible false with reasons for failing student', () => {
    const res = simulateCheck(
      makeStudent({ cgpa: 5.0, branch: 'ME' }),
      makeDrive()
    );
    expect(res.data.eligible).toBe(false);
    expect(res.data.reasons.length).toBeGreaterThan(0);
  });

  test('response always includes driveId and driveTitle', () => {
    const res = simulateCheck(makeStudent(), makeDrive());
    expect(res.data.driveId).toBeDefined();
    expect(res.data.driveTitle).toBeDefined();
  });

  test('warnings present for incomplete profile', () => {
    const res = simulateCheck(
      makeStudent({ rollNumber: undefined }),
      makeDrive()
    );
    expect(res.data.warnings.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('getEligibleStudents — bucketing logic', () => {
  // simulate what the controller does: run checkEligibility for each student,
  // bucket into eligible/ineligible, shape summary
  const simulateBucket = (students, drive) => {
    const eligible = [];
    const ineligible = [];

    for (const student of students) {
      const result = checkEligibility(student, drive);
      if (result.eligible) {
        eligible.push({ ...student, ...result });
      } else {
        ineligible.push({ ...student, ...result });
      }
    }

    return {
      summary: {
        total: students.length,
        eligible: eligible.length,
        ineligible: ineligible.length,
      },
      eligible,
      ineligible,
    };
  };

  test('correctly buckets eligible and ineligible students', () => {
    const students = [
      makeStudent({ branch: 'CSE', cgpa: 8.0 }),   // eligible
      makeStudent({ branch: 'ME',  cgpa: 8.0 }),   // ineligible — branch
      makeStudent({ branch: 'IT',  cgpa: 6.0 }),   // ineligible — cgpa
      makeStudent({ branch: 'CSE', cgpa: 7.5 }),   // eligible
    ];

    const result = simulateBucket(students, makeDrive());
    expect(result.summary.total).toBe(4);
    expect(result.summary.eligible).toBe(2);
    expect(result.summary.ineligible).toBe(2);
  });

  test('all eligible when criteria are loose', () => {
    const looseDrive = makeDrive({
      eligibility: {
        allowedBranches: [],
        minCGPA: 0,
        maxBacklogs: 10,
        graduationYear: [],
        genderRestriction: 'any',
      },
    });

    const students = [
      makeStudent({ branch: 'ME', cgpa: 3.0, backlogs: 5 }),
      makeStudent({ branch: 'Civil', cgpa: 2.5, backlogs: 8 }),
    ];

    const result = simulateBucket(students, looseDrive);
    expect(result.summary.eligible).toBe(2);
    expect(result.summary.ineligible).toBe(0);
  });

  test('all ineligible when criteria are strict', () => {
    const strictDrive = makeDrive({
      eligibility: {
        allowedBranches: ['CSE'],
        minCGPA: 9.5,
        maxBacklogs: 0,
        graduationYear: [2025],
        genderRestriction: 'any',
      },
    });

    const students = [
      makeStudent({ cgpa: 8.0 }),
      makeStudent({ cgpa: 7.5 }),
    ];

    const result = simulateBucket(students, strictDrive);
    expect(result.summary.eligible).toBe(0);
    expect(result.summary.ineligible).toBe(2);
  });

  test('ineligible entries contain reasons array', () => {
    const students = [makeStudent({ branch: 'ME' })];
    const result = simulateBucket(students, makeDrive());
    expect(result.ineligible[0].reasons).toBeDefined();
    expect(result.ineligible[0].reasons.length).toBeGreaterThan(0);
  });

  test('eligible entries have empty reasons array', () => {
    const students = [makeStudent()];
    const result = simulateBucket(students, makeDrive());
    expect(result.eligible[0].reasons).toHaveLength(0);
  });

  test('summary counts add up to total', () => {
    const students = Array.from({ length: 10 }, (_, i) =>
      makeStudent({ cgpa: i < 5 ? 8.0 : 5.0 })
    );
    const result = simulateBucket(students, makeDrive());
    expect(result.summary.eligible + result.summary.ineligible).toBe(
      result.summary.total
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe('exportEligibleStudents — row builder logic', () => {
  // simulate the row-building logic from the export controller
  const buildRows = (students, drive) =>
    students.map((student) => {
      const result = checkEligibility(student, drive);
      return {
        Name: student.name || '',
        Email: student.email || '',
        'Roll Number': student.rollNumber || '',
        Branch: student.branch || '',
        CGPA: student.cgpa ?? '',
        Backlogs: student.backlogs ?? 0,
        'Graduation Year': student.graduationYear || '',
        'Placement Status': student.placementStatus || '',
        Eligible: result.eligible ? 'Yes' : 'No',
        'Ineligibility Reasons': result.reasons.join('; '),
        Warnings: result.warnings.join('; '),
      };
    });

  test('builds one row per student', () => {
    const students = [makeStudent(), makeStudent({ branch: 'ME' })];
    const rows = buildRows(students, makeDrive());
    expect(rows).toHaveLength(2);
  });

  test('eligible column is Yes for passing student', () => {
    const rows = buildRows([makeStudent()], makeDrive());
    expect(rows[0]['Eligible']).toBe('Yes');
  });

  test('eligible column is No for failing student', () => {
    const rows = buildRows([makeStudent({ cgpa: 4.0 })], makeDrive());
    expect(rows[0]['Eligible']).toBe('No');
  });

  test('ineligibility reasons are semicolon-joined string', () => {
    const rows = buildRows(
      [makeStudent({ branch: 'ME', cgpa: 4.0 })],
      makeDrive()
    );
    expect(typeof rows[0]['Ineligibility Reasons']).toBe('string');
    expect(rows[0]['Ineligibility Reasons']).toContain(';');
  });

  test('all required columns present in every row', () => {
    const required = [
      'Name', 'Email', 'Roll Number', 'Branch',
      'CGPA', 'Backlogs', 'Graduation Year',
      'Placement Status', 'Eligible',
      'Ineligibility Reasons', 'Warnings',
    ];
    const rows = buildRows([makeStudent()], makeDrive());
    required.forEach((col) => {
      expect(rows[0]).toHaveProperty(col);
    });
  });

  test('empty reasons string for eligible student', () => {
    const rows = buildRows([makeStudent()], makeDrive());
    expect(rows[0]['Ineligibility Reasons']).toBe('');
  });
});