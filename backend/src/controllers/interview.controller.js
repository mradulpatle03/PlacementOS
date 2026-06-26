const Interview = require("../models/Interview");
const InterviewSlot = require("../models/InterviewSlot");
const Application = require("../models/Application");
const Student = require("../models/Student");
const { createError } = require("../middlewares/errorHandler");
const {
  advancePipelineOnResult,
} = require("../services/interviewResult.service");

const {
  scheduleInterviewReminders,
  cancelInterviewReminders,
} = require("../queues/interviewReminderQueue");
const User = require("../models/User");

const ROUND_ELIGIBLE_STAGES = {
  interview_1: ["interview_1"],
  interview_2: ["interview_2"],
  hr: ["hr"],
};

// ─────────────────────────────────────────────────────────────
// SLOT management (recruiter creates availability)
// ─────────────────────────────────────────────────────────────

// ── POST /api/v1/interviews/slots ─────────────────────────────
// Recruiter / TPO creates a single interview slot
const createSlot = async (req, res, next) => {
  try {
    const slot = await InterviewSlot.create({
      ...req.body,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Slot created successfully",
      data: { slot },
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/v1/interviews/slots/bulk ────────────────────────
// Create multiple slots in one request
const createBulkSlots = async (req, res, next) => {
  try {
    const { slots } = req.body;

    const toInsert = slots.map((s) => ({ ...s, createdBy: req.user._id }));
    const created = await InterviewSlot.insertMany(toInsert, {
      ordered: false,
    });

    return res.status(201).json({
      success: true,
      message: `${created.length} slot(s) created`,
      data: { slots: created, total: created.length },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/interviews/slots?driveId=&round= ─────────────
// List all slots for a drive (recruiter view — shows bookedBy count)
const getSlots = async (req, res, next) => {
  try {
    const { driveId, round } = req.query;

    if (!driveId)
      return next(createError("driveId query param is required", 400));

    const filter = { drive: driveId, isActive: true };
    if (round) filter.round = round;

    const slots = await InterviewSlot.find(filter)
      .populate("bookedBy", "rollNumber branch")
      .sort({ scheduledAt: 1 })
      .lean();

    // add seatsLeft manually since lean() strips virtuals
    const withSeats = slots.map((s) => ({
      ...s,
      seatsLeft: s.capacity - (s.bookedBy?.length || 0),
    }));

    return res.status(200).json({
      success: true,
      data: { total: withSeats.length, slots: withSeats },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/interviews/slots/available?driveId=&round= ───
// Student sees available (not full) slots to book — only for rounds
// they are currently eligible to book based on their pipeline stage.
const getAvailableSlots = async (req, res, next) => {
  try {
    const { driveId, round } = req.query;

    if (!driveId)
      return next(createError("driveId query param is required", 400));

    if (round && !ROUND_ELIGIBLE_STAGES[round]) {
      return next(createError(`Unknown round '${round}'`, 400));
    }

    // resolve the student's application for this drive — eligibility
    // is per-application, since the same student could (in theory)
    // have applications across multiple drives at different stages
    const student = await Student.findOne({ user: req.user._id }).lean();
    if (!student) return next(createError("Student profile not found", 404));

    const application = await Application.findOne({
      student: student._id,
      drive: driveId,
    })
      .select("status")
      .lean();

    if (!application) {
      return res.status(200).json({
        success: true,
        data: {
          total: 0,
          slots: [],
          reason: "You have not applied to this drive.",
        },
      });
    }

    // single round requested — gate it explicitly
    if (round) {
      const eligibleStages = ROUND_ELIGIBLE_STAGES[round];
      if (!eligibleStages.includes(application.status)) {
        return res.status(200).json({
          success: true,
          data: {
            total: 0,
            slots: [],
            reason: `Slots for ${round.replace("_", " ")} open once your application reaches the right stage (currently: ${application.status}).`,
          },
        });
      }
    }

    // determine which rounds this student's current stage unlocks
    const allowedRounds = round
      ? [round]
      : Object.keys(ROUND_ELIGIBLE_STAGES).filter((r) =>
          ROUND_ELIGIBLE_STAGES[r].includes(application.status),
        );

    if (allowedRounds.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          total: 0,
          slots: [],
          reason: `No interview rounds are open for your current stage (${application.status}) yet.`,
        },
      });
    }

    const filter = {
      drive: driveId,
      isActive: true,
      round: { $in: allowedRounds },
    };

    // re-fetch with actual count for seatsLeft (use aggregate to avoid lean virtual issue)
    const rawSlots = await InterviewSlot.find(filter).sort({ scheduledAt: 1 });
    const availableSlots = rawSlots
      .filter((s) => s.seatsLeft > 0)
      .map((s) => ({
        _id: s._id,
        drive: s.drive,
        round: s.round,
        scheduledAt: s.scheduledAt,
        durationMinutes: s.durationMinutes,
        mode: s.mode,
        venue: s.venue,
        meetingLink: s.meetingLink,
        capacity: s.capacity,
        seatsLeft: s.seatsLeft,
      }));

    return res.status(200).json({
      success: true,
      data: { total: availableSlots.length, slots: availableSlots },
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/v1/interviews/slots/:slotId/book ───────────────
// Student books a slot → creates an Interview doc automatically
const bookSlot = async (req, res, next) => {
  try {
    const { slotId } = req.params;
    const { applicationId } = req.body;

    if (!applicationId)
      return next(createError("applicationId is required", 400));

    // get student profile
    const student = await Student.findOne({ user: req.user._id });
    if (!student) return next(createError("Student profile not found", 404));

    const slot = await InterviewSlot.findById(slotId);
    if (!slot || !slot.isActive)
      return next(createError("Slot not found or inactive", 404));

    // check capacity
    if (slot.seatsLeft <= 0)
      return next(createError("This slot is fully booked", 400));

    // check student hasn't already booked this slot
    if (slot.bookedBy.includes(student._id)) {
      return next(createError("You have already booked this slot", 400));
    }

    // verify application belongs to this student + drive
    const application = await Application.findById(applicationId);
    if (!application) return next(createError("Application not found", 404));
    if (application.student.toString() !== student._id.toString()) {
      return next(createError("Application does not belong to you", 403));
    }
    if (application.drive.toString() !== slot.drive.toString()) {
      return next(
        createError("Application drive does not match slot drive", 400),
      );
    }

    // ── stage gate: student must be at the correct pipeline stage ──
    const eligibleStages = ROUND_ELIGIBLE_STAGES[slot.round] || [];
    if (!eligibleStages.includes(application.status)) {
      return next(
        createError(
          `You cannot book a ${slot.round.replace("_", " ")} slot yet. ` +
            `Your application is currently at stage '${application.status}'. ` +
            `Wait until a recruiter moves you to the right stage.`,
          403,
        ),
      );
    }

    // check student hasn't already been scheduled for this round
    const existing = await Interview.findOne({
      application: applicationId,
      round: slot.round,
      status: { $in: ["scheduled", "rescheduled"] },
    });
    if (existing) {
      return next(
        createError(
          `You already have a scheduled ${slot.round} interview`,
          400,
        ),
      );
    }

    // mark slot as booked
    slot.bookedBy.push(student._id);
    await slot.save();

    // create Interview document
    const interview = await Interview.create({
      drive: slot.drive,
      application: applicationId,
      student: student._id,
      round: slot.round,
      scheduledAt: slot.scheduledAt,
      durationMinutes: slot.durationMinutes,
      mode: slot.mode,
      venue: slot.venue,
      meetingLink: slot.meetingLink,
      panel: [],
      status: "scheduled",
      createdBy: req.user._id,
    });

    // schedule reminder emails
    try {
      const studentUser = await User.findById(req.user._id)
        .select("name email")
        .lean();
      if (studentUser) {
        await scheduleInterviewReminders(
          {
            _id: interview._id,
            scheduledAt: interview.scheduledAt,
            round: interview.round,
            mode: interview.mode,
            venue: interview.venue,
            meetingLink: interview.meetingLink,
            drive: { title: "", company: { name: "" } }, // populated below
          },
          studentUser.email,
          studentUser.name,
        );
      }
    } catch (reminderErr) {
      // non-fatal — log and continue
      console.error(
        "[bookSlot] Failed to schedule reminders:",
        reminderErr.message,
      );
    }

    return res.status(201).json({
      success: true,
      message: "Interview slot booked successfully",
      data: { interview, slot: { _id: slot._id, seatsLeft: slot.seatsLeft } },
    });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/v1/interviews/slots/:slotId ───────────────────
// Recruiter / TPO deletes an unused slot
const deleteSlot = async (req, res, next) => {
  try {
    const { slotId } = req.params;

    const slot = await InterviewSlot.findById(slotId);
    if (!slot) return next(createError("Slot not found", 404));

    if (slot.bookedBy.length > 0) {
      return next(
        createError("Cannot delete a slot that has been booked", 400),
      );
    }

    slot.isActive = false;
    await slot.save();

    return res.status(200).json({ success: true, message: "Slot removed" });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// INTERVIEW management
// ─────────────────────────────────────────────────────────────

// ── POST /api/v1/interviews ───────────────────────────────────
// Recruiter / TPO directly schedules an interview (no slot picking)
const scheduleInterview = async (req, res, next) => {
  try {
    const { application: applicationId, student: studentId, round } = req.body;

    const application = await Application.findById(applicationId).lean();
    if (!application) {
      return next(createError("Application not found", 404));
    }
    const eligibleStages = ROUND_ELIGIBLE_STAGES[round] || [];
    if (!eligibleStages.includes(application.status)) {
      return next(
        createError(
          `Cannot schedule a ${round.replace("_", " ")} interview — ` +
            `this candidate's application is at stage '${application.status}'.`,
          400,
        ),
      );
    }

    // check no duplicate for same application + round
    const existing = await Interview.findOne({
      application: applicationId,
      round,
      status: { $in: ["scheduled", "rescheduled"] },
    });
    if (existing) {
      return next(
        createError(
          `An active ${round} interview already exists for this candidate`,
          400,
        ),
      );
    }

    const interview = await Interview.create({
      ...req.body,
      status: "scheduled",
      createdBy: req.user._id,
    });

    // schedule reminder emails for the candidate
    try {
      const studentDoc = await Student.findById(req.body.student)
        .populate("user", "name email")
        .lean();
      if (studentDoc?.user) {
        await scheduleInterviewReminders(
          {
            _id: interview._id,
            scheduledAt: interview.scheduledAt,
            round: interview.round,
            mode: interview.mode,
            venue: interview.venue,
            meetingLink: interview.meetingLink,
            drive: { title: "", company: { name: "" } },
          },
          studentDoc.user.email,
          studentDoc.user.name,
        );
      }
    } catch (reminderErr) {
      console.error(
        "[scheduleInterview] Failed to schedule reminders:",
        reminderErr.message,
      );
    }

    return res.status(201).json({
      success: true,
      message: "Interview scheduled successfully",
      data: { interview },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/interviews?driveId=&round=&status= ───────────
// Recruiter / TPO lists interviews for a drive
const getInterviews = async (req, res, next) => {
  try {
    const { driveId, round, status, page = 1, limit = 50 } = req.query;

    if (!driveId)
      return next(createError("driveId query param is required", 400));

    const filter = { drive: driveId };
    if (round) filter.round = round;
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [interviews, total] = await Promise.all([
      Interview.find(filter)
        .populate({
          path: "student",
          select: "rollNumber branch cgpa",
          populate: { path: "user", select: "name email" },
        })
        .populate("application", "status")
        .sort({ scheduledAt: 1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Interview.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        interviews,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/interviews/my ─────────────────────────────────
// Student sees their own scheduled interviews
const getMyInterviews = async (req, res, next) => {
  try {
    const student = await Student.findOne({ user: req.user._id }).lean();
    if (!student) return next(createError("Student profile not found", 404));

    const interviews = await Interview.find({ student: student._id })
      .populate("drive", "title")
      .populate({
        path: "drive",
        populate: { path: "company", select: "name logo" },
      })
      .sort({ scheduledAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: { total: interviews.length, interviews },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/interviews/:id ────────────────────────────────
// Get a single interview by ID
const getInterviewById = async (req, res, next) => {
  try {
    const interview = await Interview.findById(req.params.id)
      .populate({
        path: "student",
        select: "rollNumber branch cgpa",
        populate: { path: "user", select: "name email" },
      })
      .populate("drive", "title")
      .populate("application", "status")
      .lean();

    if (!interview) return next(createError("Interview not found", 404));

    // students can only view their own
    if (req.user.role === "student") {
      const student = await Student.findOne({ user: req.user._id }).lean();
      if (
        !student ||
        interview.student._id.toString() !== student._id.toString()
      ) {
        return next(createError("Unauthorized", 403));
      }
    }

    return res.status(200).json({ success: true, data: { interview } });
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/interviews/:id/reschedule
// Recruiter / TPO reschedules an interview
const rescheduleInterview = async (req, res, next) => {
  try {
    const interview = await Interview.findById(req.params.id);
    if (!interview) return next(createError("Interview not found", 404));

    if (interview.status === "cancelled" || interview.status === "completed") {
      return next(
        createError(`Cannot reschedule a ${interview.status} interview`, 400),
      );
    }

    Object.assign(interview, req.body);
    interview.status = "rescheduled";
    await interview.save();

    // cancel old reminders and schedule new ones
    await cancelInterviewReminders(interview._id);
    try {
      const studentDoc = await Student.findById(interview.student)
        .populate("user", "name email")
        .lean();
      if (studentDoc?.user) {
        await scheduleInterviewReminders(
          {
            _id: interview._id,
            scheduledAt: interview.scheduledAt,
            round: interview.round,
            mode: interview.mode,
            venue: interview.venue,
            meetingLink: interview.meetingLink,
            drive: { title: "", company: { name: "" } },
          },
          studentDoc.user.email,
          studentDoc.user.name,
        );
      }
    } catch (reminderErr) {
      console.error(
        "[rescheduleInterview] Failed to reschedule reminders:",
        reminderErr.message,
      );
    }

    return res.status(200).json({
      success: true,
      message: "Interview rescheduled",
      data: { interview },
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/interviews/:id/cancel
// Recruiter / TPO cancels an interview
const cancelInterview = async (req, res, next) => {
  try {
    const { reason = "" } = req.body;

    const interview = await Interview.findById(req.params.id);
    if (!interview) return next(createError("Interview not found", 404));

    if (interview.status === "completed") {
      return next(createError("Cannot cancel a completed interview", 400));
    }
    // cancel any queued reminder jobs
    await cancelInterviewReminders(interview._id);
    interview.status = "cancelled";
    interview.cancelledReason = reason;
    await interview.save();

    return res.status(200).json({
      success: true,
      message: "Interview cancelled",
      data: { interview },
    });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/v1/interviews/:id/result ──────────────────────
// Recruiter records interview result → auto-moves pipeline stage
const recordResult = async (req, res, next) => {
  try {
    const { result, feedback, ratingOutOf10 } = req.body;

    const interview = await Interview.findById(req.params.id)
      .populate("drive", "title")
      .populate({
        path: "student",
        select: "rollNumber",
        populate: { path: "user", select: "name email" },
      });

    if (!interview) return next(createError("Interview not found", 404));

    if (interview.status === "cancelled") {
      return next(
        createError("Cannot record result for a cancelled interview", 400),
      );
    }

    if (interview.status === "completed") {
      return next(
        createError("Result already recorded for this interview", 400),
      );
    }

    // ── save result on Interview ──────────────────────────────
    interview.result = result;
    interview.feedback = feedback || "";
    interview.ratingOutOf10 = ratingOutOf10 ?? null;
    interview.status = "completed";
    await interview.save();

    // ── auto-advance pipeline stage ───────────────────────────
    let pipelineMoveResult = null;
    try {
      pipelineMoveResult = await advancePipelineOnResult(
        interview,
        result,
        feedback || "",
        req.user._id,
        req.user.name || "",
      );
      if (!pipelineMoveResult.moved) {
        console.warn(
          "[recordResult] Pipeline not moved:",
          pipelineMoveResult.reason,
        );
      }
    } catch (pipelineErr) {
      // non-fatal — result is still saved even if pipeline move fails
      console.error(
        "[recordResult] Pipeline advance failed:",
        pipelineErr.message,
      );
    }

    return res.status(200).json({
      success: true,
      message: "Result recorded successfully",
      data: {
        interview: {
          _id: interview._id,
          round: interview.round,
          result: interview.result,
          status: interview.status,
          feedback: interview.feedback,
          ratingOutOf10: interview.ratingOutOf10,
        },
        pipelineMoved: pipelineMoveResult,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  // slots
  createSlot,
  createBulkSlots,
  getSlots,
  getAvailableSlots,
  bookSlot,
  deleteSlot,
  // interviews
  scheduleInterview,
  getInterviews,
  getMyInterviews,
  getInterviewById,
  rescheduleInterview,
  cancelInterview,
  recordResult,
};
