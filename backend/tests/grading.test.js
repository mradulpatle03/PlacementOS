const { gradeMCQ, gradeCoding } = require('../src/services/grading.service');

// MCQ grading 

describe('gradeMCQ', () => {
  const question = {
    type: 'mcq',
    marks: 2,
    options: [
      { text: 'Option A', isCorrect: false },
      { text: 'Option B', isCorrect: true  },
      { text: 'Option C', isCorrect: false },
    ],
  };

  test('awards full marks for correct option', () => {
    const result = gradeMCQ(question, { selectedOptionIndex: 1 });
    expect(result.isCorrect).toBe(true);
    expect(result.marksAwarded).toBe(2);
  });

  test('awards 0 marks for wrong option', () => {
    const result = gradeMCQ(question, { selectedOptionIndex: 0 });
    expect(result.isCorrect).toBe(false);
    expect(result.marksAwarded).toBe(0);
  });

  test('awards 0 marks for unanswered (null)', () => {
    const result = gradeMCQ(question, { selectedOptionIndex: null });
    expect(result.isCorrect).toBe(false);
    expect(result.marksAwarded).toBe(0);
  });

  test('awards 0 marks for unanswered (undefined)', () => {
    const result = gradeMCQ(question, {});
    expect(result.isCorrect).toBe(false);
    expect(result.marksAwarded).toBe(0);
  });

  test('awards 0 marks for out-of-range index', () => {
    const result = gradeMCQ(question, { selectedOptionIndex: 99 });
    expect(result.isCorrect).toBe(false);
    expect(result.marksAwarded).toBe(0);
  });

  test('handles question with 1 mark correctly', () => {
    const q1 = { ...question, marks: 1 };
    const result = gradeMCQ(q1, { selectedOptionIndex: 1 });
    expect(result.marksAwarded).toBe(1);
  });

  test('handles question with no correct option gracefully', () => {
    const badQ = {
      marks: 2,
      options: [
        { text: 'A', isCorrect: false },
        { text: 'B', isCorrect: false },
      ],
    };
    const result = gradeMCQ(badQ, { selectedOptionIndex: 0 });
    expect(result.isCorrect).toBe(false);
    expect(result.marksAwarded).toBe(0);
  });
});

// Coding grading
// We mock judge.service so tests run without a real code executor

jest.mock('../src/services/judge.service', () => ({
  runAgainstTestCases: jest.fn(),
}));

const { runAgainstTestCases } = require('../src/services/judge.service');

const codingQuestion = {
  type: 'coding',
  marks: 10,
  testCases: [
    { input: '1', expectedOutput: '1', isHidden: false },
    { input: '2', expectedOutput: '4', isHidden: false },
    { input: '3', expectedOutput: '9', isHidden: true  },
    { input: '4', expectedOutput: '16', isHidden: true },
  ],
};

const codingAnswer = {
  code: 'print(int(input())**2)',
  language: 'python',
};

describe('gradeCoding', () => {
  afterEach(() => jest.clearAllMocks());

  test('awards full marks when all test cases pass', async () => {
    runAgainstTestCases.mockResolvedValue({
      passed: 4,
      total: 4,
      results: Array(4).fill({ passed: true, time: 10, memory: 100, stderr: '' }),
    });

    const result = await gradeCoding(codingQuestion, codingAnswer);
    expect(result.isCorrect).toBe(true);
    expect(result.marksAwarded).toBe(10);
    expect(result.judgeResult.status).toBe('Accepted');
    expect(result.judgeResult.passedTestCases).toBe(4);
    expect(result.judgeResult.totalTestCases).toBe(4);
  });

  test('awards partial marks (3/4 test cases)', async () => {
    runAgainstTestCases.mockResolvedValue({
      passed: 3,
      total: 4,
      results: [
        { passed: true,  time: 10, memory: 100, stderr: '' },
        { passed: true,  time: 10, memory: 100, stderr: '' },
        { passed: true,  time: 10, memory: 100, stderr: '' },
        { passed: false, time: 10, memory: 100, stderr: 'Wrong Answer' },
      ],
    });

    const result = await gradeCoding(codingQuestion, codingAnswer);
    expect(result.isCorrect).toBe(false);
    expect(result.marksAwarded).toBe(7.5);  // 3/4 * 10
    expect(result.judgeResult.status).toBe('Partial');
  });

  test('awards 0 marks when all test cases fail', async () => {
    runAgainstTestCases.mockResolvedValue({
      passed: 0,
      total: 4,
      results: Array(4).fill({ passed: false, time: 10, memory: 100, stderr: 'WA' }),
    });

    const result = await gradeCoding(codingQuestion, codingAnswer);
    expect(result.isCorrect).toBe(false);
    expect(result.marksAwarded).toBe(0);
    expect(result.judgeResult.status).toBe('Wrong Answer');
  });

  test('returns 0 marks for empty code', async () => {
    const result = await gradeCoding(codingQuestion, { code: '', language: 'python' });
    expect(result.isCorrect).toBe(false);
    expect(result.marksAwarded).toBe(0);
    expect(result.judgeResult.status).toBe('No Submission');
    expect(runAgainstTestCases).not.toHaveBeenCalled();
  });

  test('returns 0 marks for missing language', async () => {
    const result = await gradeCoding(codingQuestion, { code: 'print(1)', language: '' });
    expect(result.isCorrect).toBe(false);
    expect(result.marksAwarded).toBe(0);
    expect(runAgainstTestCases).not.toHaveBeenCalled();
  });

  test('returns 0 marks for no answer object', async () => {
    const result = await gradeCoding(codingQuestion, {});
    expect(result.isCorrect).toBe(false);
    expect(result.marksAwarded).toBe(0);
  });

  test('handles question with 0 test cases gracefully', async () => {
    const emptyQ = { ...codingQuestion, testCases: [] };
    const result = await gradeCoding(emptyQ, { code: '', language: 'python' });
    expect(result.marksAwarded).toBe(0);
  });

  test('partial credit rounds to 2 decimal places', async () => {
    const q = { ...codingQuestion, marks: 3 };
    runAgainstTestCases.mockResolvedValue({
      passed: 1,
      total: 3,
      results: Array(3).fill({ passed: false, time: 5, memory: 50, stderr: '' }),
    });

    const result = await gradeCoding(q, codingAnswer);
    // 1/3 * 3 = 1.00
    expect(result.marksAwarded).toBe(1);
  });
});