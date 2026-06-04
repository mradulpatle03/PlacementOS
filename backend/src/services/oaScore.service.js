const AssessmentSubmission = require("../models/AssessmentSubmission");

/**
 * Compute aggregated OA statistics for a given assessment.
 *
 * Returns:
 *  - stats: { totalAppeared, totalSubmitted, avgScore, maxScore, minScore, passRate }
 *  - distribution: score buckets (0-20, 20-40, … 80-100)
 *  - leaderboard: top N students sorted by score desc, time asc
 *
 * @param {string} assessmentId
 * @param {object} options
 * @param {number} options.topN          - leaderboard size (default 10)
 * @param {number} options.passMark      - % to count as pass (default 40)
 */
const computeOAStats = async (
  assessmentId,
  { topN = 10, passMark = 40 } = {},
) => {
  const submissions = await AssessmentSubmission.find({
    assessment: assessmentId,
  })
    .populate({
      path: "student",
      select: "rollNumber branch cgpa",
      populate: { path: "user", select: "name email" },
    })
    .lean();

  const totalAppeared = submissions.length;

  const graded = submissions.filter(
    (s) => s.status === "graded" || s.status === "submitted",
  );
  const totalSubmitted = graded.length;
  const inProgress = submissions.filter(
    (s) => s.status === "in_progress",
  ).length;

  if (graded.length === 0) {
    return {
      stats: {
        totalAppeared,
        totalSubmitted,
        inProgress,
        avgScore: 0,
        maxScore: 0,
        minScore: 0,
        passRate: 0,
        passMark,
      },
      distribution: _emptyDistribution(),
      leaderboard: [],
    };
  }

  const scores = graded.map((s) => s.percentageScore);
  const avgScore =
    Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100;
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);
  const passed = graded.filter((s) => s.percentageScore >= passMark).length;
  const passRate = Math.round((passed / graded.length) * 10000) / 100;

  // score distribution buckets: 0-20, 20-40, 40-60, 60-80, 80-100
  const distribution = _emptyDistribution();
  for (const score of scores) {
    if (score < 20) distribution["0-20"]++;
    else if (score < 40) distribution["20-40"]++;
    else if (score < 60) distribution["40-60"]++;
    else if (score < 80) distribution["60-80"]++;
    else distribution["80-100"]++;
  }

  // leaderboard: sort by score desc, then time taken asc (faster wins on tie)
  const leaderboard = graded
    .slice()
    .sort((a, b) => {
      if (b.percentageScore !== a.percentageScore)
        return b.percentageScore - a.percentageScore;
      return (a.timeTakenSeconds || 0) - (b.timeTakenSeconds || 0);
    })
    .slice(0, topN)
    .map((s, idx) => ({
      rank: idx + 1,
      submissionId: s._id,
      student: {
        _id: s.student?._id,
        name: s.student?.user?.name || "—",
        email: s.student?.user?.email || "—",
        rollNumber: s.student?.rollNumber || "—",
        branch: s.student?.branch || "—",
        cgpa: s.student?.cgpa ?? "—",
      },
      score: s.totalMarksAwarded,
      totalMarks: s.totalMarksPossible,
      percentageScore: s.percentageScore,
      timeTakenSeconds: s.timeTakenSeconds,
      autoSubmitted: s.autoSubmitted,
      violationCount: s.violationCount,
      submittedAt: s.submittedAt,
    }));

  return {
    stats: {
      totalAppeared,
      totalSubmitted,
      inProgress,
      avgScore,
      maxScore,
      minScore,
      passRate,
      passMark,
    },
    distribution,
    leaderboard,
  };
};

const _emptyDistribution = () => ({
  "0-20": 0,
  "20-40": 0,
  "40-60": 0,
  "60-80": 0,
  "80-100": 0,
});

module.exports = { computeOAStats };
