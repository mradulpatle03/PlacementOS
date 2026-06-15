/**
 * Policy Engine — evaluates college-wide placement rules.
 *
 * evaluatePolicy(context, policy)
 *   context: { student, drive, recentApplicationCount, activeApplicationCount, studentResume? }
 *   policy:  Policy document (plain object)
 *
 * Returns: { allowed: boolean, violations: string[] }
 *
 * "violations" are hard blocks — the action must not proceed.
 * The function is pure (no DB calls) so it is fully unit-testable.
 */

const evaluatePolicy = (context = {}, policy = {}) => {
  const violations = [];

  if (!context || !policy) {
    return { allowed: false, violations: ['Invalid context or policy data'] };
  }

  const {
    student,
    drive,
    recentApplicationCount = 0,   // applications in last 7 days
    activeApplicationCount = 0,   // current open applications
    studentResume = null,
  } = context;

  // ── 1. One-offer policy ───────────────────────────────────
  if (policy.oneOfferPolicy && student) {
    if (student.placementStatus === 'placed') {
      // placed students may only apply to dream drives
      if (drive) {
        const maxCTC = drive.roles
          ? Math.max(...drive.roles.map((r) => r.ctc || 0))
          : 0;
        const dreamThreshold = policy.dreamPackageLPA || 0;

        const isDreamDrive = dreamThreshold > 0 && maxCTC >= dreamThreshold;

        if (!isDreamDrive) {
          violations.push(
            `One-offer policy is active. You are already placed and can only apply to dream company drives (CTC ≥ ${dreamThreshold} LPA).`
          );
        }
      }
    }
  }

  // ── 2. Max active applications ────────────────────────────
  if (policy.maxActiveApplications && policy.maxActiveApplications > 0) {
    if (activeApplicationCount >= policy.maxActiveApplications) {
      violations.push(
        `You have ${activeApplicationCount} active application(s). Maximum allowed at a time is ${policy.maxActiveApplications}.`
      );
    }
  }

  // ── 3. Max applications per week ─────────────────────────
  if (policy.maxApplicationsPerWeek && policy.maxApplicationsPerWeek > 0) {
    if (recentApplicationCount >= policy.maxApplicationsPerWeek) {
      violations.push(
        `You have applied to ${recentApplicationCount} drive(s) this week. Maximum allowed per week is ${policy.maxApplicationsPerWeek}.`
      );
    }
  }

  // ── 4. Profile completeness gate ─────────────────────────
  if (policy.requireCompleteProfile && student) {
    const missing = [];
    if (!student.cgpa)           missing.push('CGPA');
    if (!student.branch)         missing.push('branch');
    if (!student.graduationYear) missing.push('graduation year');
    if (!student.rollNumber)     missing.push('roll number');

    if (missing.length > 0) {
      violations.push(
        `Your profile is incomplete. Please fill in: ${missing.join(', ')}.`
      );
    }
  }

  // ── 5. Minimum resume score gate ─────────────────────────
  if (policy.minProfileScore && policy.minProfileScore > 0) {
    if (!studentResume) {
      violations.push(
        `A resume with a score of at least ${policy.minProfileScore} is required to apply.`
      );
    } else {
      const score = studentResume.score || 0;
      if (score < policy.minProfileScore) {
        violations.push(
          `Your resume score (${score}) is below the minimum required score of ${policy.minProfileScore}.`
        );
      }
    }
  }

  return {
    allowed:    violations.length === 0,
    violations,
  };
};

/**
 * isDreamDrive(drive, policy)
 * Convenience helper — check if a specific drive qualifies as a dream drive.
 */
const isDreamDrive = (drive, policy) => {
  if (!drive || !policy) return false;
  const dreamThreshold = policy.dreamPackageLPA || 0;
  if (dreamThreshold === 0) return false;

  const maxCTC = drive.roles
    ? Math.max(...drive.roles.map((r) => r.ctc || 0))
    : 0;

  return maxCTC >= dreamThreshold;
};

/**
 * getApplicationCounts(studentId)
 * Fetches the counts needed for policy evaluation from the DB.
 * Kept separate so evaluatePolicy stays pure.
 */
const getApplicationCounts = async (studentId) => {
  const Application = require('../models/Application');

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [recentApplicationCount, activeApplicationCount] = await Promise.all([
    Application.countDocuments({
      student:   studentId,
      appliedAt: { $gte: sevenDaysAgo },
    }),
    Application.countDocuments({
      student: studentId,
      status:  {
        $nin: ['withdrawn', 'rejected', 'accepted'],
      },
    }),
  ]);

  return { recentApplicationCount, activeApplicationCount };
};

module.exports = { evaluatePolicy, isDreamDrive, getApplicationCounts };