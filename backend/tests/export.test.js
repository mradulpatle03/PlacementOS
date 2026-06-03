// Tests the flattenApplication helper and CSV builder in isolation
// No HTTP — keeps tests fast and dependency-free

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { flattenApplication, buildCSVString } = require('../src/utils/exportToExcel');

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

// helper to make a mock populated application
const mockApp = (overrides = {}) => ({
  status: 'shortlisted',
  appliedAt: new Date('2025-01-15'),
  remarks: '',
  resume: { label: 'Main Resume', score: 72, isPrimary: true },
  student: {
    rollNumber: 'CSE001',
    branch: 'CSE',
    cgpa: 8.5,
    backlogs: 0,
    graduationYear: 2026,
    placementStatus: 'unplaced',
    user: { name: 'Rahul Sharma', email: 'rahul@test.com' },
  },
  ...overrides,
});

// flattenApplication 

describe('flattenApplication', () => {
  test('returns a plain object with all expected keys', () => {
    const row = flattenApplication(mockApp());
    const expectedKeys = [
      'Roll Number',
      'Student Name',
      'Email',
      'Branch',
      'CGPA',
      'Backlogs',
      'Graduation Year',
      'Placement Status',
      'Stage',
      'Resume Label',
      'Resume Score',
      'Applied At',
      'Remarks',
    ];
    expectedKeys.forEach((key) => expect(row).toHaveProperty(key));
  });

  test('maps student fields correctly', () => {
    const row = flattenApplication(mockApp());
    expect(row['Roll Number']).toBe('CSE001');
    expect(row['Student Name']).toBe('Rahul Sharma');
    expect(row['Email']).toBe('rahul@test.com');
    expect(row['Branch']).toBe('CSE');
    expect(row['CGPA']).toBe(8.5);
    expect(row['Backlogs']).toBe(0);
    expect(row['Graduation Year']).toBe(2026);
  });

  test('maps stage to human-readable label', () => {
    const row = flattenApplication(mockApp({ status: 'shortlisted' }));
    expect(row['Stage']).toBe('Shortlisted');
  });

  test('maps stage label for interview_1', () => {
    const row = flattenApplication(mockApp({ status: 'interview_1' }));
    expect(row['Stage']).toBe('Interview Round 1');
  });

  test('maps stage label for oa', () => {
    const row = flattenApplication(mockApp({ status: 'oa' }));
    expect(row['Stage']).toBe('Online Assessment');
  });

  test('maps stage label for rejected', () => {
    const row = flattenApplication(mockApp({ status: 'rejected' }));
    expect(row['Stage']).toBe('Rejected');
  });

  test('formats appliedAt as a date string', () => {
    const row = flattenApplication(mockApp());
    expect(typeof row['Applied At']).toBe('string');
    expect(row['Applied At']).not.toBe('-');
  });

  test('uses - for missing optional fields', () => {
    const row = flattenApplication(mockApp({
      remarks: '',
      resume: null,
      student: {
        user: { name: 'Test', email: 'test@x.com' },
        rollNumber: undefined,
        branch: undefined,
        cgpa: undefined,
        backlogs: undefined,
        graduationYear: undefined,
        placementStatus: undefined,
      },
    }));
    expect(row['Resume Label']).toBe('-');
    expect(row['Resume Score']).toBe('-');
    expect(row['Remarks']).toBe('-');
  });

  test('handles null student gracefully', () => {
    const row = flattenApplication({ ...mockApp(), student: null });
    expect(row['Roll Number']).toBe('-');
    expect(row['Student Name']).toBe('-');
    expect(row['Branch']).toBe('-');
  });
});

// buildCSVString

describe('buildCSVString', () => {
  test('returns empty string for empty array', () => {
    expect(buildCSVString([])).toBe('');
  });

  test('first line is the header row', () => {
    const csv = buildCSVString([mockApp()]);
    const firstLine = csv.split('\n')[0];
    expect(firstLine).toContain('Roll Number');
    expect(firstLine).toContain('Student Name');
    expect(firstLine).toContain('Email');
    expect(firstLine).toContain('CGPA');
  });

  test('has header + one data row for one application', () => {
    const csv = buildCSVString([mockApp()]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2); // header + 1 data
  });

  test('has header + N data rows for N applications', () => {
    const apps = [mockApp(), mockApp(), mockApp()];
    const csv = buildCSVString(apps);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(4); // header + 3 data
  });

  test('data row contains student name and email', () => {
    const csv = buildCSVString([mockApp()]);
    expect(csv).toContain('Rahul Sharma');
    expect(csv).toContain('rahul@test.com');
  });

  test('wraps values with commas in double quotes', () => {
    const app = mockApp({
      student: {
        ...mockApp().student,
        user: { name: 'Sharma, Rahul', email: 'rahul@test.com' },
      },
    });
    const csv = buildCSVString([app]);
    expect(csv).toContain('"Sharma, Rahul"');
  });

  test('escapes double quotes inside values', () => {
    const app = mockApp({ remarks: 'He said "great" work' });
    const csv = buildCSVString([app]);
    // RFC 4180: " → ""
    expect(csv).toContain('""great""');
  });

  test('multiple applications produce correct row count', () => {
    const apps = Array.from({ length: 10 }, (_, i) =>
      mockApp({
        student: {
          ...mockApp().student,
          rollNumber: `CSE00${i}`,
          user: { name: `Student ${i}`, email: `s${i}@test.com` },
        },
      })
    );
    const csv = buildCSVString(apps);
    const lines = csv.trim().split('\n');
    expect(lines).toHaveLength(11); // header + 10
  });
});