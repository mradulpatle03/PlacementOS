const { flattenSubmission, buildOACSVString } = require('../src/utils/exportOA');

// helpers

const mockSub = (overrides = {}) => ({
  _id: 'sub123',
  status: 'graded',
  totalMarksAwarded: 18,
  totalMarksPossible: 20,
  percentageScore: 90,
  timeTakenSeconds: 1800,        // 30 min
  violationCount: 1,
  autoSubmitted: false,
  submittedAt: new Date('2025-06-01T10:00:00Z'),
  answers: [
    { questionType: 'mcq',    isCorrect: true,  judgeResult: null },
    { questionType: 'mcq',    isCorrect: true,  judgeResult: null },
    { questionType: 'mcq',    isCorrect: false, judgeResult: null },
    {
      questionType: 'coding',
      isCorrect: true,
      judgeResult: { passedTestCases: 3, totalTestCases: 3 },
    },
  ],
  student: {
    rollNumber: 'CSE2021001',
    branch: 'CSE',
    cgpa: 8.7,
    user: { name: 'Priya Verma', email: 'priya@college.edu' },
  },
  ...overrides,
});

// flattenSubmission

describe('flattenSubmission', () => {
  test('returns object with all expected columns', () => {
    const row = flattenSubmission(mockSub(), 1);
    const expectedKeys = [
      'Rank',
      'Roll Number',
      'Student Name',
      'Email',
      'Branch',
      'CGPA',
      'Score (Marks)',
      'Score (%)',
      'MCQ Correct',
      'Coding Passed',
      'Time Taken (min)',
      'Violations',
      'Auto Submitted',
      'Status',
      'Submitted At',
    ];
    expectedKeys.forEach((key) => expect(row).toHaveProperty(key));
  });

  test('maps rank correctly', () => {
    expect(flattenSubmission(mockSub(), 1).Rank).toBe(1);
    expect(flattenSubmission(mockSub(), 5).Rank).toBe(5);
    expect(flattenSubmission(mockSub()).Rank).toBe('-');
  });

  test('maps student fields correctly', () => {
    const row = flattenSubmission(mockSub(), 1);
    expect(row['Roll Number']).toBe('CSE2021001');
    expect(row['Student Name']).toBe('Priya Verma');
    expect(row['Email']).toBe('priya@college.edu');
    expect(row['Branch']).toBe('CSE');
    expect(row['CGPA']).toBe(8.7);
  });

  test('maps score correctly', () => {
    const row = flattenSubmission(mockSub(), 1);
    expect(row['Score (Marks)']).toBe('18 / 20');
    expect(row['Score (%)']).toBe(90);
  });

  test('converts time to minutes', () => {
    const row = flattenSubmission(mockSub(), 1);
    expect(row['Time Taken (min)']).toBe(30);
  });

  test('counts MCQ correct answers', () => {
    const row = flattenSubmission(mockSub(), 1);
    expect(row['MCQ Correct']).toBe(2); // 2 correct MCQ out of 3
  });

  test('shows coding passed fraction', () => {
    const row = flattenSubmission(mockSub(), 1);
    expect(row['Coding Passed']).toBe('1 / 1'); // 1 coding question, all TCs passed
  });

  test('shows dash for coding when no coding questions', () => {
    const sub = mockSub({
      answers: [
        { questionType: 'mcq', isCorrect: true, judgeResult: null },
      ],
    });
    const row = flattenSubmission(sub, 1);
    expect(row['Coding Passed']).toBe('-');
  });

  test('maps auto-submitted correctly', () => {
    const row1 = flattenSubmission(mockSub({ autoSubmitted: true }), 1);
    const row2 = flattenSubmission(mockSub({ autoSubmitted: false }), 1);
    expect(row1['Auto Submitted']).toBe('Yes');
    expect(row2['Auto Submitted']).toBe('No');
  });

  test('handles missing student gracefully', () => {
    const sub = mockSub({ student: null });
    const row = flattenSubmission(sub, 1);
    expect(row['Student Name']).toBe('-');
    expect(row['Roll Number']).toBe('-');
    expect(row['Email']).toBe('-');
  });

  test('handles missing timeTakenSeconds', () => {
    const sub = mockSub({ timeTakenSeconds: null });
    const row = flattenSubmission(sub, 1);
    expect(row['Time Taken (min)']).toBe('-');
  });

  test('handles 0 violations', () => {
    const row = flattenSubmission(mockSub({ violationCount: 0 }), 1);
    expect(row['Violations']).toBe(0);
  });
});

// ── buildOACSVString ──────────────────────────────────────────

describe('buildOACSVString', () => {
  test('returns empty string for empty array', () => {
    expect(buildOACSVString([])).toBe('');
  });

  test('returns a CSV with header + data rows', () => {
    const csv = buildOACSVString([mockSub()]);
    const lines = csv.split('\n');
    expect(lines.length).toBe(2);  // header + 1 row
  });

  test('header contains expected column names', () => {
    const csv = buildOACSVString([mockSub()]);
    const header = csv.split('\n')[0];
    expect(header).toContain('Student Name');
    expect(header).toContain('Score (%)');
    expect(header).toContain('Roll Number');
    expect(header).toContain('Violations');
  });

  test('sorts by score descending', () => {
    const low  = mockSub({ percentageScore: 40, student: { ...mockSub().student, user: { name: 'Low',  email: 'l@x.com' } } });
    const high = mockSub({ percentageScore: 90, student: { ...mockSub().student, user: { name: 'High', email: 'h@x.com' } } });
    const csv  = buildOACSVString([low, high]);
    const lines = csv.split('\n');
    // row 1 (after header) should be the high scorer
    expect(lines[1]).toContain('High');
  });

  test('sorts by time ascending on score tie', () => {
    const slow = mockSub({ percentageScore: 80, timeTakenSeconds: 3600, student: { ...mockSub().student, user: { name: 'Slow', email: 's@x.com' } } });
    const fast = mockSub({ percentageScore: 80, timeTakenSeconds: 1800, student: { ...mockSub().student, user: { name: 'Fast', email: 'f@x.com' } } });
    const csv  = buildOACSVString([slow, fast]);
    const lines = csv.split('\n');
    expect(lines[1]).toContain('Fast');
  });

  test('escapes commas in values', () => {
    const sub = mockSub({
      student: {
        ...mockSub().student,
        user: { name: 'Sharma, Rahul', email: 'r@x.com' },
      },
    });
    const csv = buildOACSVString([sub]);
    // commas inside values should be quoted
    expect(csv).toContain('"Sharma, Rahul"');
  });

  test('generates correct number of rows for multiple submissions', () => {
    const subs = Array.from({ length: 5 }, (_, i) =>
      mockSub({ percentageScore: i * 10 })
    );
    const csv   = buildOACSVString(subs);
    const lines  = csv.split('\n').filter(Boolean);
    expect(lines.length).toBe(6); // 1 header + 5 rows
  });
});