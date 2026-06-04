const Assessment = require('../models/Assessment');
const AssessmentSubmission = require('../models/AssessmentSubmission');
const Drive = require('../models/Drive');
const Student = require('../models/Student');
const AppError = require('../utils/AppError');
const { computeOAStats } = require('../services/oaScore.service');
const { buildOAExcelBuffer, buildOACSVString } = require('../utils/exportOA');

// POST /api/v1/assessments
// TPO / Recruiter / Admin creates an assessment for a drive
const createAssessment = async (req, res, next) => {
  try {
    const { drive: driveId } = req.body;

    const drive = await Drive.findById(driveId).lean();
    if (!drive) return next(new AppError('Drive not found', 404));

    // recruiters can only create for drives they manage (simple check: drive must exist)
    // TPO has full access — no additional restriction needed here

    const assessment = await Assessment.create({
      ...req.body,
      createdBy: req.user._id,
    });

    console.log(`Assessment created: "${assessment.title}" for drive ${driveId} by ${req.user.email}`);

    return res.status(201).json({
      success: true,
      message: 'Assessment created successfully',
      data: { assessment },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/assessments/drive/:driveId
// List all assessments for a drive
const getAssessmentsByDrive = async (req, res, next) => {
  try {
    const { driveId } = req.params;

    const drive = await Drive.findById(driveId).lean();
    if (!drive) return next(new AppError('Drive not found', 404));

    // students only see active assessments within the window
    const filter = { drive: driveId };
    if (req.user.role === 'student') {
      filter.status = 'active';
    }

    const assessments = await Assessment.find(filter)
      .select('-questions.options.isCorrect -questions.testCases.expectedOutput') // hide answers from students
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .lean();

    // for non-student roles, don't strip answers
    const fullAssessments =
      req.user.role === 'student'
        ? assessments
        : await Assessment.find(filter)
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 })
            .lean();

    return res.status(200).json({
      success: true,
      data: {
        driveId,
        total: fullAssessments.length,
        assessments: req.user.role === 'student' ? assessments : fullAssessments,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/assessments/:id
// Get a single assessment by ID
const getAssessmentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const assessment = await Assessment.findById(id)
      .populate('createdBy', 'name email')
      .populate('drive', 'title status')
      .lean();

    if (!assessment) return next(new AppError('Assessment not found', 404));

    // students: strip correct answers; also check if active
    if (req.user.role === 'student') {
      if (assessment.status !== 'active') {
        return next(new AppError('This assessment is not currently active', 403));
      }

      // check if student has already submitted
      const student = await Student.findOne({ user: req.user._id }).lean();
      if (student) {
        const existing = await AssessmentSubmission.findOne({
          assessment: id,
          student: student._id,
        }).lean();
        if (existing && existing.status !== 'in_progress') {
          return next(new AppError('You have already submitted this assessment', 400));
        }
      }

      // strip correct answers from MCQ options and hide test case expected output
      assessment.questions = assessment.questions.map((q) => ({
        ...q,
        options: q.options?.map(({ isCorrect: _ic, ...opt }) => opt) || [],
        testCases: q.testCases?.filter((tc) => !tc.isHidden).map(({ expectedOutput: _eo, ...tc }) => tc) || [],
      }));
    }

    return res.status(200).json({
      success: true,
      data: { assessment },
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/assessments/:id
// Update assessment — only if still draft
const updateAssessment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const assessment = await Assessment.findById(id);
    if (!assessment) return next(new AppError('Assessment not found', 404));

    if (assessment.status === 'closed') {
      return next(new AppError('Cannot edit a closed assessment', 400));
    }

    // prevent editing active assessment questions (protect ongoing OA)
    if (assessment.status === 'active' && req.body.questions) {
      return next(new AppError('Cannot change questions while assessment is active', 400));
    }

    Object.assign(assessment, req.body);
    await assessment.save();

    return res.status(200).json({
      success: true,
      message: 'Assessment updated',
      data: { assessment },
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/assessments/:id
// Delete assessment — only if draft
const deleteAssessment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const assessment = await Assessment.findById(id);
    if (!assessment) return next(new AppError('Assessment not found', 404));

    if (assessment.status !== 'draft') {
      return next(new AppError('Only draft assessments can be deleted', 400));
    }

    // check no submissions exist
    const submissionCount = await AssessmentSubmission.countDocuments({ assessment: id });
    if (submissionCount > 0) {
      return next(new AppError('Cannot delete an assessment that has submissions', 400));
    }

    await assessment.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Assessment deleted',
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/assessments/:id/status
// Activate or close an assessment
const updateAssessmentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'closed', 'draft'].includes(status)) {
      return next(new AppError("status must be 'draft', 'active', or 'closed'", 400));
    }

    const assessment = await Assessment.findById(id);
    if (!assessment) return next(new AppError('Assessment not found', 404));

    // transition rules
    if (assessment.status === 'closed') {
      return next(new AppError('A closed assessment cannot be reopened', 400));
    }

    if (status === 'active' && assessment.questions.length === 0) {
      return next(new AppError('Cannot activate an assessment with no questions', 400));
    }

    assessment.status = status;
    await assessment.save();

    return res.status(200).json({
      success: true,
      message: `Assessment status updated to '${status}'`,
      data: { assessment },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/assessments/:id/start
// Student starts the assessment — creates an in_progress submission
const startAssessment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const assessment = await Assessment.findById(id).lean();
    if (!assessment) return next(new AppError('Assessment not found', 404));

    if (assessment.status !== 'active') {
      return next(new AppError('This assessment is not currently active', 403));
    }

    // check time window
    const now = new Date();
    if (assessment.startsAt && now < new Date(assessment.startsAt)) {
      return next(new AppError('Assessment has not started yet', 403));
    }
    if (assessment.endsAt && now > new Date(assessment.endsAt)) {
      return next(new AppError('Assessment window has ended', 403));
    }

    const student = await Student.findOne({ user: req.user._id }).lean();
    if (!student) return next(new AppError('Student profile not found', 404));

    // check duplicate
    const existing = await AssessmentSubmission.findOne({
      assessment: id,
      student: student._id,
    });
    if (existing) {
      if (existing.status !== 'in_progress') {
        return next(new AppError('You have already submitted this assessment', 400));
      }
      // return existing in-progress submission so frontend can resume
      return res.status(200).json({
        success: true,
        message: 'Resuming existing submission',
        data: { submission: existing, assessment },
      });
    }

    // create fresh submission
    const submission = await AssessmentSubmission.create({
      assessment: id,
      student: student._id,
      drive: assessment.drive,
      startedAt: now,
      totalMarksPossible: assessment.totalMarks,
    });

    return res.status(201).json({
      success: true,
      message: 'Assessment started',
      data: { submission, assessment },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/assessments/:id/submissions
// TPO/Recruiter sees all submissions for an assessment
const getSubmissions = async (req, res, next) => {
  try {
    const { id } = req.params;

    const assessment = await Assessment.findById(id).lean();
    if (!assessment) return next(new AppError('Assessment not found', 404));

    const submissions = await AssessmentSubmission.find({ assessment: id })
      .populate({
        path: 'student',
        select: 'rollNumber branch cgpa',
        populate: { path: 'user', select: 'name email' },
      })
      .sort({ percentageScore: -1, submittedAt: 1 })
      .lean();

    const stats = {
      total: submissions.length,
      submitted: submissions.filter((s) => s.status === 'submitted' || s.status === 'graded').length,
      inProgress: submissions.filter((s) => s.status === 'in_progress').length,
      avgScore: submissions.length
        ? Math.round(
            submissions.reduce((sum, s) => sum + s.percentageScore, 0) / submissions.length
          )
        : 0,
    };

    return res.status(200).json({
      success: true,
      data: { assessment: { _id: id, title: assessment.title }, stats, submissions },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/assessments/:id/my-submission
// Student gets their own submission
const getMySubmission = async (req, res, next) => {
  try {
    const { id } = req.params;

    const student = await Student.findOne({ user: req.user._id }).lean();
    if (!student) return next(new AppError('Student profile not found', 404));

    const submission = await AssessmentSubmission.findOne({
      assessment: id,
      student: student._id,
    }).lean();

    if (!submission) return next(new AppError('No submission found', 404));

    return res.status(200).json({
      success: true,
      data: { submission },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/assessments/:id/stats ────────────────────────
// Score aggregation: leaderboard + distribution + pass rate
// Roles: tpo, recruiter, admin
const getAssessmentStats = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { topN = 10, passMark = 40 } = req.query;

    const assessment = await Assessment.findById(id)
      .select('title totalMarks totalQuestions durationMinutes status drive')
      .lean();
    if (!assessment) return next(new AppError('Assessment not found', 404));

    const { stats, distribution, leaderboard } = await computeOAStats(id, {
      topN: Number(topN),
      passMark: Number(passMark),
    });

    return res.status(200).json({
      success: true,
      data: {
        assessment: {
          _id: id,
          title: assessment.title,
          totalMarks: assessment.totalMarks,
          totalQuestions: assessment.totalQuestions,
          durationMinutes: assessment.durationMinutes,
          status: assessment.status,
        },
        stats,
        distribution,
        leaderboard,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/assessments/:id/export?format=xlsx ───────────
// Export OA results to Excel or CSV
// Roles: tpo, recruiter, admin
const exportAssessmentResults = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { format = 'xlsx' } = req.query;

    if (!['xlsx', 'csv'].includes(format)) {
      return next(new AppError("format must be 'xlsx' or 'csv'", 400));
    }

    const assessment = await Assessment.findById(id).lean();
    if (!assessment) return next(new AppError('Assessment not found', 404));

    const submissions = await AssessmentSubmission.find({ assessment: id })
      .populate({
        path: 'student',
        select: 'rollNumber branch cgpa',
        populate: { path: 'user', select: 'name email' },
      })
      .lean();

    if (submissions.length === 0) {
      return next(new AppError('No submissions found for this assessment', 404));
    }

    const safeTitle = assessment.title.replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = new Date().toISOString().slice(0, 10);

    if (format === 'csv') {
      const csv = buildOACSVString(submissions);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="OA_${safeTitle}_${timestamp}.csv"`
      );
      return res.send(csv);
    }

    // xlsx
    const buffer = await buildOAExcelBuffer(submissions, assessment.title);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="OA_${safeTitle}_${timestamp}.xlsx"`
    );
    return res.send(Buffer.from(buffer));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createAssessment,
  getAssessmentsByDrive,
  getAssessmentById,
  updateAssessment,
  deleteAssessment,
  updateAssessmentStatus,
  startAssessment,
  getSubmissions,
  getMySubmission,
  getAssessmentStats,
  exportAssessmentResults,
};