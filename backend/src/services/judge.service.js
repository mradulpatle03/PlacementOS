const axios = require('axios');
const { JUDGE0_API_URL, PISTON_API_URL } = require('../config/env');

// Language ID maps

// Judge0 language IDs (most common subset)
const JUDGE0_LANG_IDS = {
  c: 50,
  cpp: 54,
  java: 62,
  python: 71,
  javascript: 63,
  typescript: 74,
  go: 60,
  rust: 73,
  ruby: 72,
};

// Piston runtime names (free public API)
const PISTON_RUNTIMES = {
  c: { language: 'c', version: '*' },
  cpp: { language: 'c++', version: '*' },
  java: { language: 'java', version: '*' },
  python: { language: 'python', version: '*' },
  javascript: { language: 'javascript', version: '*' },
  typescript: { language: 'typescript', version: '*' },
  go: { language: 'go', version: '*' },
  rust: { language: 'rust', version: '*' },
  ruby: { language: 'ruby', version: '*' },
};

/**
 * Run code against a single test case using Judge0.
 * Returns { stdout, stderr, status, time, memory }
 */
const runWithJudge0 = async (code, language, stdin = '') => {
  const langId = JUDGE0_LANG_IDS[language.toLowerCase()];
  if (!langId) throw new Error(`Unsupported language for Judge0: ${language}`);

  const payload = {
    source_code: Buffer.from(code).toString('base64'),
    language_id: langId,
    stdin: Buffer.from(stdin).toString('base64'),
    base64_encoded: true,
    wait: true,  // synchronous result
  };

  const { data } = await axios.post(
    `${JUDGE0_API_URL}/submissions?base64_encoded=true&wait=true`,
    payload,
    { timeout: 15000 }
  );

  const stdout = data.stdout ? Buffer.from(data.stdout, 'base64').toString() : '';
  const stderr = data.stderr ? Buffer.from(data.stderr, 'base64').toString() : '';
  const compileOutput = data.compile_output
    ? Buffer.from(data.compile_output, 'base64').toString()
    : '';

  return {
    stdout: stdout.trim(),
    stderr: (stderr || compileOutput).trim(),
    status: data.status?.description || 'Unknown',
    time: parseFloat(data.time || 0) * 1000,   // convert s → ms
    memory: data.memory || 0,                   // KB
  };
};

/**
 * Run code against a single test case using Piston (free, no auth).
 * Returns { stdout, stderr, status, time, memory }
 */
const runWithPiston = async (code, language, stdin = '') => {
  const runtime = PISTON_RUNTIMES[language.toLowerCase()];
  if (!runtime) throw new Error(`Unsupported language for Piston: ${language}`);

  const payload = {
    language: runtime.language,
    version: runtime.version,
    files: [{ name: 'main', content: code }],
    stdin,
    run_timeout: 10000,   // 10s max
    compile_timeout: 15000,
  };

  const { data } = await axios.post(
    `${PISTON_API_URL}/execute`,
    payload,
    { timeout: 20000 }
  );

  const run = data.run || {};
  const compile = data.compile || {};
  const stderr = run.stderr || compile.stderr || compile.output || '';

  return {
    stdout: (run.stdout || '').trim(),
    stderr: stderr.trim(),
    status: run.code === 0 ? 'Accepted' : 'Runtime Error',
    time: run.time || 0,    // ms
    memory: run.memory || 0,
  };
};

/**
 * Execute code against one test case input.
 * Auto-selects Judge0 → Piston based on config.
 *
 * @param {string} code      - source code
 * @param {string} language  - 'python', 'cpp', 'java', etc.
 * @param {string} stdin     - test case input
 * @returns {{ stdout, stderr, status, time, memory }}
 */
const executeCode = async (code, language, stdin = '') => {
  if (JUDGE0_API_URL) {
    return runWithJudge0(code, language, stdin);
  }
  return runWithPiston(code, language, stdin);
};

/**
 * Run code against ALL test cases for a question.
 * Returns { passed, total, results[], firstFailure }
 *
 * @param {string} code
 * @param {string} language
 * @param {Array}  testCases  - [{ input, expectedOutput, isHidden }]
 */
const runAgainstTestCases = async (code, language, testCases) => {
  const results = [];
  let passed = 0;
  let firstFailure = null;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    try {
      const result = await executeCode(code, language, tc.input || '');
      const isCorrect = result.stdout === (tc.expectedOutput || '').trim();

      if (isCorrect) passed++;
      else if (!firstFailure) firstFailure = i;

      results.push({
        testCase: i + 1,
        isHidden: tc.isHidden || false,
        passed: isCorrect,
        stdout: tc.isHidden ? null : result.stdout,    // hide output for hidden TCs
        expectedOutput: tc.isHidden ? null : tc.expectedOutput,
        stderr: result.stderr || null,
        time: result.time,
        memory: result.memory,
        status: result.status,
      });
    } catch (err) {
      if (!firstFailure) firstFailure = i;
      results.push({
        testCase: i + 1,
        isHidden: tc.isHidden || false,
        passed: false,
        stdout: null,
        stderr: err.message,
        status: 'Internal Error',
        time: 0,
        memory: 0,
      });
    }
  }

  return {
    passed,
    total: testCases.length,
    results,
    firstFailure,
  };
};

module.exports = { executeCode, runAgainstTestCases };