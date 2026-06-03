/**
 * @param {Object} student  - Student mongoose doc (plain object is fine too)
 * @param {Object} drive    - Drive mongoose doc (plain object is fine too)
 * @returns {{ eligible: boolean, reasons: string[], warnings: string[] }}
 *
 * reasons  — hard blocks (student CANNOT apply)
 * warnings — soft issues (profile incomplete, but not a hard block)
 */
const checkEligibility = (student, drive) => {
  const reasons = [];
  const warnings = [];

  if (!student || !drive) {
    return { eligible: false, reasons: ['Invalid student or drive data'], warnings: [] };
  }

  const eligibility = drive.eligibility || {};

  // 1. Branch check
  if (eligibility.allowedBranches && eligibility.allowedBranches.length > 0) {
    if (!student.branch) {
      warnings.push('Branch not set in profile — assuming ineligible');
      reasons.push('Your branch is not set. Update your profile.');
    } else if (!eligibility.allowedBranches.includes(student.branch)) {
      reasons.push(
        `Branch '${student.branch}' is not eligible. Allowed: ${eligibility.allowedBranches.join(', ')}`
      );
    }
  }

  // 2. CGPA check 
  const minCGPA = eligibility.minCGPA || 0;
  if (minCGPA > 0) {
    if (student.cgpa === undefined || student.cgpa === null) {
      warnings.push('CGPA not set in profile');
      reasons.push('Your CGPA is not set. Update your profile.');
    } else if (student.cgpa < minCGPA) {
      reasons.push(
        `CGPA ${student.cgpa} is below the minimum required ${minCGPA}`
      );
    }
  }

  // 3. Backlog check 
  const maxBacklogs = eligibility.maxBacklogs ?? 0;
  const studentBacklogs = student.backlogs ?? 0;
  if (studentBacklogs > maxBacklogs) {
    reasons.push(
      `You have ${studentBacklogs} backlog(s). Maximum allowed is ${maxBacklogs}`
    );
  }

  // 4. Graduation year check 
  if (eligibility.graduationYear && eligibility.graduationYear.length > 0) {
    if (!student.graduationYear) {
      warnings.push('Graduation year not set in profile');
      reasons.push('Your graduation year is not set. Update your profile.');
    } else if (!eligibility.graduationYear.includes(student.graduationYear)) {
      reasons.push(
        `Graduation year ${student.graduationYear} is not in eligible years: ${eligibility.graduationYear.join(', ')}`
      );
    }
  }

  // 5. Gender restriction
  // gender stored on User, not Student — only check if passed in
  if (
    eligibility.genderRestriction &&
    eligibility.genderRestriction !== 'any' &&
    student.gender
  ) {
    if (student.gender !== eligibility.genderRestriction) {
      reasons.push(
        `This drive is open to ${eligibility.genderRestriction} candidates only`
      );
    }
  }

  // 6. Placement status + one-offer policy
  const settings = drive.settings || {};
  if (settings.oneOfferPolicy) {
    if (student.placementStatus === 'placed') {
      // placed students can only apply to dream companies
      const maxCTC = drive.roles
        ? Math.max(...drive.roles.map((r) => r.ctc || 0))
        : 0;
      const dreamThreshold = settings.dreamPackageLPA || 0;

      if (dreamThreshold === 0 || maxCTC < dreamThreshold) {
        reasons.push(
          'You are already placed. One-offer policy is active. Only dream company drives (above the dream package threshold) are open to placed students.'
        );
      }
      // else: dream company — placed students CAN apply, no block
    }
  }

  // 7. Profile completeness warnings (soft)
  if (!student.rollNumber) warnings.push('Roll number not set in profile');

  return {
    eligible: reasons.length === 0,
    reasons,
    warnings,
  };
};

module.exports = { checkEligibility };