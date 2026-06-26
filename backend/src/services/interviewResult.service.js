const Interview = require("../models/Interview");
const Application = require("../models/Application");
const Student = require("../models/Student");
const Company = require("../models/Company");
const Drive = require("../models/Drive");
const { validateStageTransition, STAGE_LABELS } = require("./pipeline.service");
const { emitStageMoved, emitApplicationRejected } = require("../sockets");
const { notifyApplicationStatus } = require("../queues/notificationQueue");

// Round → result → next pipeline stage
const NEXT_STAGE_MAP = {
  interview_1: { pass: "interview_2", fail: "rejected", no_show: "rejected" },
  interview_2: { pass: "hr", fail: "rejected", no_show: "rejected" },
  hr: { pass: "offered", fail: "rejected", no_show: "rejected" },
};

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

  // ── Notify student about stage change ──────────────────────
  try {
    // Resolve student → user for email + userId
    const student = await Student.findById(application.student)
      .populate("user", "name email")
      .lean();

    if (student?.user) {
      // Resolve drive → company for notification context
      const driveDoc = await Drive.findById(application.drive)
        .select("title company")
        .lean();
      const company = driveDoc?.company
        ? await Company.findById(driveDoc.company).select("name").lean()
        : null;

      const stageLabel = STAGE_LABELS[targetStage] || targetStage;

      await notifyApplicationStatus(
        student.user._id.toString(),
        student.user.email,
        {
          studentName: student.user.name,
          drive: {
            _id: application.drive,
            title: driveDoc?.title || "",
          },
          company: {
            name: company?.name || "Company",
          },
          newStage: targetStage,
          stageLabel,
          note: note.trim(),
        },
      );
    }
  } catch (notifErr) {
    // non-fatal — stage move already saved, don't roll back
    console.error(
      "[advancePipelineOnResult] Notification failed (non-fatal):",
      notifErr.message,
    );
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