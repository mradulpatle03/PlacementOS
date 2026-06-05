const Interview = require("../models/Interview");
const Application = require("../models/Application");
const { validateStageTransition, STAGE_LABELS } = require("./pipeline.service");
const { emitStageMoved, emitApplicationRejected } = require("../sockets");

// Round → result → next pipeline stage
const NEXT_STAGE_MAP = {
  interview_1: { pass: "interview_2", fail: "rejected", no_show: "rejected" },
  interview_2: { pass: "hr", fail: "rejected", no_show: "rejected" },
  hr: { pass: "offered", fail: "rejected", no_show: "rejected" },
};

/**
 * Given an interview result, advance the linked application's pipeline stage.
 *
 * @param {object} interview    - Interview mongoose doc (populated: drive, student.user)
 * @param {string} result       - 'pass' | 'fail' | 'no_show'
 * @param {string} feedback     - optional feedback text
 * @param {string} movedById    - user._id of the recruiter recording the result
 * @param {string} movedByName  - user.name of the recruiter
 *
 * @returns {{ moved: boolean, previousStage?, currentStage?, stageLabel?, reason? }}
 */
const advancePipelineOnResult = async (
  interview,
  result,
  feedback,
  movedById,
  movedByName,
) => {
  const targetStage = NEXT_STAGE_MAP[interview.round]?.[result];

  if (!targetStage) {
    return {
      moved: false,
      reason: `No pipeline mapping for round '${interview.round}' result '${result}'`,
    };
  }

  const application = await Application.findById(interview.application);
  if (!application) {
    return { moved: false, reason: "Application not found" };
  }

  const { valid, error } = validateStageTransition(
    application.status,
    targetStage,
  );
  if (!valid) {
    return { moved: false, reason: error };
  }

  const previousStage = application.status;
  const note = feedback
    ? `Interview result: ${result}. ${feedback}`
    : `Interview result: ${result}`;

  application.stageHistory.push({
    stage: targetStage,
    movedBy: movedById,
    movedAt: new Date(),
    note: note.trim(),
  });
  application.status = targetStage;

  if (targetStage === "rejected") {
    application.stageAtExit = previousStage;
    application.remarks = note.trim();
  }

  await application.save();

  // socket emit
  const driveId =
    interview.drive?._id?.toString() || interview.drive?.toString();

  if (targetStage === "rejected") {
    emitApplicationRejected(driveId, {
      applicationId: application._id,
      studentName: interview.student?.user?.name || "",
      rejectedFromStage: previousStage,
      reason: note,
    });
  } else {
    emitStageMoved(driveId, {
      applicationId: application._id,
      previousStage,
      currentStage: targetStage,
      movedBy: { _id: movedById, name: movedByName },
      note,
    });
  }

  return {
    moved: true,
    applicationId: application._id,
    previousStage,
    currentStage: targetStage,
    stageLabel: STAGE_LABELS[targetStage] || targetStage,
  };
};

module.exports = { advancePipelineOnResult, NEXT_STAGE_MAP };
