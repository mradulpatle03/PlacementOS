const Application = require("../models/Application");
const AppError = require("../utils/AppError");
const {
  validateStageTransition,
  STAGE_LABELS,
  PIPELINE_STAGES,
} = require("../services/pipeline.service");
const {
  emitStageMoved,
  emitBulkMoved,
  emitApplicationRejected,
} = require("../sockets");
const { notifyApplicationStatus } = require("../queues/notificationQueue");
const User = require("../models/User");

// PUT /api/v1/pipeline/:id/move-stage
const moveStage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { targetStage, note = "" } = req.body;

    if (!targetStage) return next(new AppError("targetStage is required", 400));

    const application = await Application.findById(id);
    if (!application) return next(new AppError("Application not found", 404));

    const { valid, error } = validateStageTransition(
      application.status,
      targetStage,
    );
    if (!valid) return next(new AppError(error, 400));

    const previousStage = application.status;

    application.stageHistory.push({
      stage: targetStage,
      movedBy: req.user._id,
      movedAt: new Date(),
      note: note.trim(),
    });
    application.status = targetStage;
    if (targetStage === "rejected") {
      application.stageAtExit = previousStage;
      if (note.trim()) application.remarks = note.trim();
    }

    await application.save();

    // broadcast to all clients watching this drive
    emitStageMoved(application.drive.toString(), {
      applicationId: application._id,
      previousStage,
      currentStage: targetStage,
      movedBy: { _id: req.user._id, name: req.user.name },
      note: note.trim(),
    });
    // notify the student
    try {
      const studentUser = await User.findById(application.student)
        .select("email name")
        .lean();
      if (studentUser) {
        await notifyApplicationStatus(
          studentUser._id.toString(),
          studentUser.email,
          {
            studentName: studentUser.name,
            drive: { _id: application.drive, title: drive?.title || "" },
            company: { name: drive?.company?.name || "Company" },
            newStage: newStage,
            stageLabel: newStage.replace(/_/g, " "),
            note: notes || "",
          },
        );
      }
    } catch (notifErr) {
      console.log(
        "[Pipeline] Notification failed (non-fatal):",
        notifErr.message,
      );
    }

    try {
      const { invalidateCache } = require("../utils/analyticsCache");
      await invalidateCache("analytics:*");
    } catch (_) {}

    return res.status(200).json({
      success: true,
      message: `Moved from '${STAGE_LABELS[previousStage] || previousStage}' to '${STAGE_LABELS[targetStage] || targetStage}'`,
      data: {
        applicationId: application._id,
        previousStage,
        currentStage: application.status,
        movedBy: req.user._id,
        note: note.trim(),
        stageHistory: application.stageHistory,
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/pipeline/bulk-move
const bulkMoveStage = async (req, res, next) => {
  try {
    const { applicationIds, targetStage, note = "" } = req.body;

    if (!Array.isArray(applicationIds) || applicationIds.length === 0)
      return next(
        new AppError("applicationIds must be a non-empty array", 400),
      );
    if (!targetStage) return next(new AppError("targetStage is required", 400));
    if (applicationIds.length > 100)
      return next(
        new AppError(
          "Cannot bulk move more than 100 applications at once",
          400,
        ),
      );

    const applications = await Application.find({
      _id: { $in: applicationIds },
    });
    if (applications.length === 0)
      return next(
        new AppError("No applications found for the provided IDs", 404),
      );

    const moved = [];
    const skipped = [];
    const movedAt = new Date();

    for (const application of applications) {
      const { valid, error } = validateStageTransition(
        application.status,
        targetStage,
      );
      if (!valid) {
        skipped.push({
          applicationId: application._id,
          currentStage: application.status,
          reason: error,
        });
        continue;
      }
      const previousStage = application.status;
      application.stageHistory.push({
        stage: targetStage,
        movedBy: req.user._id,
        movedAt,
        note: note.trim(),
      });
      application.status = targetStage;
      if (targetStage === "rejected") {
        application.stageAtExit = previousStage;
        if (note.trim()) application.remarks = note.trim();
      }
      moved.push({
        applicationId: application._id,
        previousStage,
        currentStage: targetStage,
      });
    }

    const toSave = applications.filter((app) =>
      moved.some((m) => m.applicationId.toString() === app._id.toString()),
    );
    await Promise.all(toSave.map((app) => app.save()));

    // broadcast once per drive (group by drive)
    if (moved.length > 0 && toSave.length > 0) {
      const driveId = toSave[0].drive.toString();
      emitBulkMoved(driveId, {
        moved,
        targetStage,
        targetStageLabel: STAGE_LABELS[targetStage] || targetStage,
        movedBy: { _id: req.user._id, name: req.user.name },
      });
    }

    try {
      const { invalidateCache } = require("../utils/analyticsCache");
      await invalidateCache("analytics:*");
    } catch (_) {}
    
    return res.status(200).json({
      success: true,
      message: `Bulk move complete. Moved: ${moved.length}, Skipped: ${skipped.length}`,
      data: {
        targetStage,
        targetStageLabel: STAGE_LABELS[targetStage] || targetStage,
        totalRequested: applicationIds.length,
        movedCount: moved.length,
        skippedCount: skipped.length,
        moved,
        skipped,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/pipeline/drive/:driveId
const getPipelineByDrive = async (req, res, next) => {
  try {
    const { driveId } = req.params;

    const applications = await Application.find({ drive: driveId })
      .populate({
        path: "student",
        select:
          "rollNumber branch year cgpa backlogs graduationYear placementStatus",
        populate: { path: "user", select: "name email" },
      })
      .populate("resume", "label cloudinaryUrl isPrimary score")
      .sort({ updatedAt: -1 })
      .lean();

    const grouped = {};
    PIPELINE_STAGES.forEach((s) => {
      grouped[s] = [];
    });
    grouped["rejected"] = [];

    applications.forEach((app) => {
      if (grouped[app.status] !== undefined) grouped[app.status].push(app);
    });

    return res.status(200).json({
      success: true,
      data: {
        driveId,
        totalApplications: applications.length,
        pipeline: grouped,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/pipeline/stages
const getPipelineStages = (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      stages: PIPELINE_STAGES.map((s) => ({ key: s, label: STAGE_LABELS[s] })),
    },
  });
};

// GET /api/v1/pipeline/:id/history
const getStageHistory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const application = await Application.findById(id)
      .populate({ path: "stageHistory.movedBy", select: "name email role" })
      .populate({
        path: "student",
        select: "rollNumber",
        populate: { path: "user", select: "name email" },
      })
      .lean();

    if (!application) return next(new AppError("Application not found", 404));

    if (req.user.role === "student") {
      const Student = require("../models/Student");
      const student = await Student.findOne({ user: req.user._id }).lean();
      if (
        !student ||
        application.student._id.toString() !== student._id.toString()
      )
        return next(new AppError("Access denied", 403));
    }

    const enrichedHistory = application.stageHistory.map((entry) => ({
      ...entry,
      stageLabel: STAGE_LABELS[entry.stage] || entry.stage,
    }));

    return res.status(200).json({
      success: true,
      data: {
        applicationId: application._id,
        currentStage: application.status,
        currentStageLabel:
          STAGE_LABELS[application.status] || application.status,
        stageAtExit: application.stageAtExit,
        remarks: application.remarks,
        history: enrichedHistory,
        totalMoves: enrichedHistory.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/pipeline/:id/reject
const rejectApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim())
      return next(new AppError("A rejection reason is required", 400));

    const application = await Application.findById(id).populate({
      path: "student",
      select: "rollNumber",
      populate: { path: "user", select: "name email" },
    });

    if (!application) return next(new AppError("Application not found", 404));

    const { valid, error } = validateStageTransition(
      application.status,
      "rejected",
    );
    if (!valid) return next(new AppError(error, 400));

    const previousStage = application.status;

    application.stageHistory.push({
      stage: "rejected",
      movedBy: req.user._id,
      movedAt: new Date(),
      note: reason.trim(),
    });
    application.stageAtExit = previousStage;
    application.status = "rejected";
    application.remarks = reason.trim();

    await application.save();

    // broadcast rejection
    emitApplicationRejected(application.drive.toString(), {
      applicationId: application._id,
      studentName: application.student?.user?.name,
      rejectedFromStage: previousStage,
      reason: reason.trim(),
      rejectedBy: { _id: req.user._id, name: req.user.name },
    });

    return res.status(200).json({
      success: true,
      message: "Application rejected",
      data: {
        applicationId: application._id,
        studentName: application.student?.user?.name,
        studentEmail: application.student?.user?.email,
        rejectedFromStage: previousStage,
        rejectedFromStageLabel: STAGE_LABELS[previousStage] || previousStage,
        reason: reason.trim(),
        rejectedBy: req.user._id,
        rejectedAt: new Date(),
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  moveStage,
  bulkMoveStage,
  getPipelineByDrive,
  getPipelineStages,
  getStageHistory,
  rejectApplication,
};
