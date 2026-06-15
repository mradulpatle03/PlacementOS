// Day 33 — Application Controller (apply + withdraw)
const Application = require("../models/Application");
const Student = require("../models/Student");
const Drive = require("../models/Drive");
const Resume = require("../models/Resume");
const { checkEligibility } = require("../services/eligibility.service");
const AppError = require("../utils/AppError");

// POST /applications/apply
// Student applies to a drive with a chosen resume
const applyToDrive = async (req, res, next) => {
  try {
    const { driveId, resumeId } = req.body;

    if (!driveId || !resumeId) {
      return next(new AppError("driveId and resumeId are required", 400));
    }

    // 1. fetch drive
    const drive = await Drive.findById(driveId).lean();
    if (!drive) return next(new AppError("Drive not found", 404));

    // 2. drive must be open
    if (drive.status !== "open") {
      return next(
        new AppError(
          `Applications are not open for this drive (status: ${drive.status})`,
          400,
        ),
      );
    }

    // 3. fetch student
    const student = await Student.findOne({ user: req.user._id }).lean();
    if (!student) return next(new AppError("Student profile not found", 404));

    // 4. eligibility check
    const studentWithGender = { ...student, gender: req.user.gender };
    const eligibilityResult = checkEligibility(studentWithGender, drive);
    if (!eligibilityResult.eligible) {
      return next(
        new AppError(
          `You are not eligible for this drive: ${eligibilityResult.reasons.join("; ")}`,
          403,
        ),
      );
    }

    // 4b. policy engine check
    const Policy = require("../models/Policy");
    const {
      evaluatePolicy,
      getApplicationCounts,
    } = require("../services/policy.service");

    const policy = await Policy.getPolicy();
    const { recentApplicationCount, activeApplicationCount } =
      await getApplicationCounts(student._id);

    const primaryResume = await Resume.findOne({
      student: student._id,
      isPrimary: true,
    })
      .select("score")
      .lean();

    const policyResult = evaluatePolicy(
      {
        student,
        drive,
        recentApplicationCount,
        activeApplicationCount,
        studentResume: primaryResume,
      },
      policy,
    );

    if (!policyResult.allowed) {
      return next(
        new AppError(
          `Application blocked by placement policy: ${policyResult.violations.join("; ")}`,
          403,
        ),
      );
    }

    // 5. verify resume belongs to this student
    const resume = await Resume.findOne({
      _id: resumeId,
      student: student._id,
    });
    if (!resume)
      return next(
        new AppError("Resume not found or does not belong to you", 404),
      );

    // 6. prevent duplicate application
    const existing = await Application.findOne({
      student: student._id,
      drive: driveId,
    });
    if (existing) {
      if (existing.status === "withdrawn") {
        return next(
          new AppError(
            "You have withdrawn from this drive and cannot re-apply",
            400,
          ),
        );
      }
      return next(new AppError("You have already applied to this drive", 400));
    }

    // 7. create application
    const application = await Application.create({
      student: student._id,
      drive: driveId,
      resume: resumeId,
      status: "applied",
      appliedAt: new Date(),
    });

    res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      data: { application },
    });
  } catch (err) {
    if (err.code === 11000) {
      return next(new AppError("You have already applied to this drive", 400));
    }
    next(err);
  }
};

// PATCH /applications/:id/withdraw
// Student withdraws their own application
const withdrawApplication = async (req, res, next) => {
  try {
    const student = await Student.findOne({ user: req.user._id }).lean();
    if (!student) return next(new AppError("Student profile not found", 404));

    const application = await Application.findOne({
      _id: req.params.id,
      student: student._id,
    });

    if (!application) {
      return next(new AppError("Application not found", 404));
    }

    // can only withdraw an active application
    const nonWithdrawableStatuses = ["withdrawn", "selected", "rejected"];
    if (nonWithdrawableStatuses.includes(application.status)) {
      return next(
        new AppError(
          `Cannot withdraw an application with status '${application.status}'`,
          400,
        ),
      );
    }

    application.stageAtExit = application.status;
    application.status = "withdrawn";
    application.withdrawnAt = new Date();
    await application.save();

    res.status(200).json({
      success: true,
      message: "Application withdrawn successfully",
      data: { application },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /applications/my ──────────────────────────────────────────────────
// Student sees all their own applications with filters
const getMyApplications = async (req, res, next) => {
  try {
    const student = await Student.findOne({ user: req.user._id }).lean();
    if (!student) return next(new AppError("Student profile not found", 404));

    const { status, sort = "-appliedAt", page = 1, limit = 10 } = req.query;

    const filter = { student: student._id };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [applications, total] = await Promise.all([
      Application.find(filter)
        .populate("drive", "title company status rounds settings")
        .populate("drive.company", "name logo")
        .populate("resume", "label fileUrl isPrimary")
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Application.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        applications,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /applications/drive/:driveId ──────────────────────────────────────
// TPO/Recruiter sees all applications for a specific drive with filters
const getApplicationsByDrive = async (req, res, next) => {
  try {
    const { driveId } = req.params;
    const {
      status,
      branch,
      sort = "-appliedAt",
      page = 1,
      limit = 20,
    } = req.query;

    const drive = await Drive.findById(driveId).lean();
    if (!drive) return next(new AppError("Drive not found", 404));

    // build application filter
    const filter = { drive: driveId };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    let query = Application.find(filter)
      .populate({
        path: "student",
        select:
          "branch cgpa backlogs graduationYear rollNumber placementStatus",
        populate: { path: "user", select: "name email" },
      })
      .populate("resume", "label fileUrl isPrimary scoreDetails")
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    let [applications, total] = await Promise.all([
      query.lean(),
      Application.countDocuments(filter),
    ]);

    // filter by branch in JS (branch lives on student, not application)
    if (branch) {
      applications = applications.filter((a) => a.student?.branch === branch);
    }

    // status breakdown counts — useful for the TPO Kanban header
    const statusCounts = await Application.aggregate([
      { $match: { drive: require("mongoose").Types.ObjectId(driveId) } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const breakdown = statusCounts.reduce((acc, cur) => {
      acc[cur._id] = cur.count;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        driveId,
        driveTitle: drive.title,
        breakdown,
        applications,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  applyToDrive,
  withdrawApplication,
  getMyApplications,
  getApplicationsByDrive,
};
