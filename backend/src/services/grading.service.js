const { runAgainstTestCases } = require("./judge.service");

// Grade a single MCQ answer
const gradeMCQ = (question, answer) => {
  // unanswered
  if (
    answer.selectedOptionIndex === null ||
    answer.selectedOptionIndex === undefined
  ) {
    return { isCorrect: false, marksAwarded: 0 };
  }

  const option = question.options?.[answer.selectedOptionIndex];
  const isCorrect = option?.isCorrect === true;

  return {
    isCorrect,
    marksAwarded: isCorrect ? question.marks || 1 : 0,
  };
};

// Grade a single coding answer
const gradeCoding = async (question, answer) => {
  // no submission
  if (!answer.code || !answer.language) {
    return {
      isCorrect: false,
      marksAwarded: 0,
      judgeResult: {
        status: "No Submission",
        stdout: "",
        stderr: "",
        time: 0,
        memory: 0,
        passedTestCases: 0,
        totalTestCases: question.testCases?.length || 0,
      },
    };
  }

  const { passed, total, results } = await runAgainstTestCases(
    answer.code,
    answer.language,
    question.testCases || [],
  );

  // partial credit proportional to test cases passed
  const ratio = total > 0 ? passed / total : 0;
  const marksAwarded = Math.round(question.marks * ratio * 100) / 100;
  const isCorrect = passed === total && total > 0;

  // aggregate timing across all test cases
  const totalTime = results.reduce((sum, r) => sum + (r.time || 0), 0);
  const maxMemory = results.length
    ? Math.max(...results.map((r) => r.memory || 0))
    : 0;

  return {
    isCorrect,
    marksAwarded,
    judgeResult: {
      status: isCorrect ? "Accepted" : passed > 0 ? "Partial" : "Wrong Answer",
      stdout: results.find((r) => r.passed)?.stdout || results[0]?.stdout || "",
      stderr: results.find((r) => r.stderr)?.stderr || "",
      time: Math.round(totalTime),
      memory: maxMemory,
      passedTestCases: passed,
      totalTestCases: total,
    },
  };
};

/**
 * Grade a full submission.
 * Mutates submission.answers in-place.
 * Returns { totalMarksAwarded, percentageScore }
 *
 * @param {object} submission  - mongoose doc (not lean) with answers[]
 * @param {object} assessment  - lean assessment with questions[]
 */
const gradeSubmission = async (submission, assessment) => {
  // build a lookup map: questionId → question
  const questionMap = {};
  for (const q of assessment.questions) {
    questionMap[q._id.toString()] = q;
  }

  let totalMarksAwarded = 0;

  for (const answer of submission.answers) {
    const question = questionMap[answer.questionId?.toString()];
    if (!question) continue;

    if (question.type === "mcq") {
      const { isCorrect, marksAwarded } = gradeMCQ(question, answer);
      answer.isCorrect = isCorrect;
      answer.marksAwarded = marksAwarded;
      totalMarksAwarded += marksAwarded;
    } else if (question.type === "coding") {
      const { isCorrect, marksAwarded, judgeResult } = await gradeCoding(
        question,
        answer,
      );
      answer.isCorrect = isCorrect;
      answer.marksAwarded = marksAwarded;
      answer.judgeResult = judgeResult;
      totalMarksAwarded += marksAwarded;
    }
  }

  const totalPossible = assessment.totalMarks || 0;
  const percentageScore =
    totalPossible > 0
      ? Math.round((totalMarksAwarded / totalPossible) * 10000) / 100 // 2 decimal places
      : 0;

  return { totalMarksAwarded, percentageScore };
};

module.exports = { gradeSubmission, gradeMCQ, gradeCoding };
