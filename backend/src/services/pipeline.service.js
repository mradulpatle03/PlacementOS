// The 9 canonical forward pipeline stages (order matters)
const PIPELINE_STAGES = [
  'applied',
  'shortlisted',
  'oa',
  'interview_1',
  'interview_2',
  'hr',
  'offered',
  'accepted',
];

// Terminal stages — no moves allowed out of these
const TERMINAL_STAGES = ['accepted', 'rejected', 'withdrawn'];

// Human-readable labels for every status
const STAGE_LABELS = {
  applied:     'Applied',
  shortlisted: 'Shortlisted',
  oa:          'Online Assessment',
  interview_1: 'Interview Round 1',
  interview_2: 'Interview Round 2',
  hr:          'HR Round',
  offered:     'Offered',
  accepted:    'Accepted',
  rejected:    'Rejected',
  withdrawn:   'Withdrawn',
};

/**
 * Returns all stages a candidate can be moved TO from currentStage.
 * Rules:
 *  - Can move forward to any later pipeline stage (skip stages allowed)
 *  - Can move back exactly one stage (to undo a mistake)
 *  - Can always be rejected (except from terminal stages)
 *  - Terminal stages → no transitions
 */
const getAllowedNextStages = (currentStage) => {
  if (TERMINAL_STAGES.includes(currentStage)) return [];

  const allowed = [];
  const idx = PIPELINE_STAGES.indexOf(currentStage);

  if (idx !== -1) {
    // all stages forward
    allowed.push(...PIPELINE_STAGES.slice(idx + 1));
    // one stage back (revert)
    if (idx > 0) allowed.push(PIPELINE_STAGES[idx - 1]);
  }

  // can always reject
  allowed.push('rejected');

  return [...new Set(allowed)];
};

/**
 * Validates whether moving from currentStage → targetStage is allowed.
 * @returns {{ valid: boolean, error?: string }}
 */
const validateStageTransition = (currentStage, targetStage) => {
  const allKnown = [...PIPELINE_STAGES, ...TERMINAL_STAGES];

  if (!allKnown.includes(targetStage)) {
    return { valid: false, error: `Unknown stage: '${targetStage}'` };
  }

  if (TERMINAL_STAGES.includes(currentStage)) {
    return {
      valid: false,
      error: `Cannot move from terminal stage '${currentStage}'. No further transitions allowed.`,
    };
  }

  // withdrawn must go through the withdraw endpoint
  if (targetStage === 'withdrawn') {
    return {
      valid: false,
      error: 'Use the withdraw endpoint to withdraw an application',
    };
  }

  const allowed = getAllowedNextStages(currentStage);
  if (!allowed.includes(targetStage)) {
    return {
      valid: false,
      error: `Cannot move from '${currentStage}' to '${targetStage}'. Allowed: ${allowed.join(', ')}`,
    };
  }

  return { valid: true };
};

module.exports = {
  PIPELINE_STAGES,
  TERMINAL_STAGES,
  STAGE_LABELS,
  getAllowedNextStages,
  validateStageTransition,
};