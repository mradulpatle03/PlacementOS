const Assessment = require('../models/Assessment');
const AssessmentSubmission = require('../models/AssessmentSubmission');
const Student = require('../models/Student');
const AppError = require('../utils/AppError');
const { gradeSubmission } = require('../services/grading.service');

// POST /api/v1/submissions/:submissionId/submit
// Student submits their assessment (manual or auto-submit on time-up)
const submitAssessment = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const { answers = [], autoSubmitted = false } = req.body;

    const student = await Student.findOne({ user: req.user._id }).lean();
    if (!student) return next(new AppError('Student profile not found', 404));

    const submission = await AssessmentSubmission.findById(submissionId);
    if (!submission) return next(new AppError('Submission not found', 404));

    // ownership check
    if (submission.student.toString() !== student._id.toString()) {
      return next(new AppError('Unauthorized', 403));
    }

    // already submitted
    if (submission.status !== 'in_progress') {
      return next(new AppError('Submission already finalized', 400));
    }

    // fetch full assessment (need questions with correct answers)
    const assessment = await Assessment.findById(submission.assessment).lean();
    if (!assessment) return next(new AppError('Assessment not found', 404));

    // check time limit (server-side enforcement)
    const startedAt = new Date(submission.startedAt);
    const now = new Date();
    const elapsedSeconds = Math.floor((now - startedAt) / 1000);
    const limitSeconds = assessment.durationMinutes * 60;
    const isOverTime = elapsedSeconds > limitSeconds + 30; // 30s grace for network

    // map submitted answers onto submission
    // answers: [{ questionId, questionType, selectedOptionIndex?, code?, language? }]
    submission.answers = answers.map((a) => ({
      questionId: a.questionId,
      questionType: a.questionType,
      selectedOptionIndex: a.selectedOptionIndex ?? null,
      code: a.code || '',
      language: a.language || '',
      isCorrect: null,
      marksAwarded: 0,
    }));

    submission.autoSubmitted = autoSubmitted || isOverTime;
    submission.submittedAt = now;
    submission.timeTakenSeconds = Math.min(elapsedSeconds, limitSeconds);
    submission.status = 'submitted';
    submission.totalMarksPossible = assessment.totalMarks;

    await submission.save();

    // kick off grading (async — don't block response)
    gradeSubmission(submission, assessment)
      .then(async ({ totalMarksAwarded, percentageScore }) => {
        submission.totalMarksAwarded = totalMarksAwarded;
        submission.percentageScore = percentageScore;
        submission.status = 'graded';
        submission.gradedAt = new Date();
        await submission.save();
        console.log(
          `[Grading] Submission ${submissionId} graded: ${percentageScore}% (${totalMarksAwarded}/${assessment.totalMarks})`
        );
      })
      .catch((err) => {
        console.error(`[Grading Error] Submission ${submissionId}:`, err.message);
      });

    return res.status(200).json({
      success: true,
      message: autoSubmitted
        ? 'Assessment auto-submitted successfully'
        : 'Assessment submitted successfully',
      data: {
        submissionId: submission._id,
        status: submission.status,
        autoSubmitted: submission.autoSubmitted,
        timeTakenSeconds: submission.timeTakenSeconds,
        totalMarksPossible: submission.totalMarksPossible,
        // score shown only after grading — client should poll getMySubmission
        message: 'Results will be available shortly after grading.',
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/submissions/:submissionId/violation
// Student reports an anti-cheat violation (tab switch, fullscreen exit, etc.)
const logViolation = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const { type } = req.body;

    const VALID_TYPES = ['tab_switch', 'fullscreen_exit', 'copy_paste', 'focus_lost'];
    if (!VALID_TYPES.includes(type)) {
      return next(new AppError(`Invalid violation type. Must be one of: ${VALID_TYPES.join(', ')}`, 400));
    }

    const student = await Student.findOne({ user: req.user._id }).lean();
    if (!student) return next(new AppError('Student profile not found', 404));

    const submission = await AssessmentSubmission.findById(submissionId);
    if (!submission) return next(new AppError('Submission not found', 404));

    if (submission.student.toString() !== student._id.toString()) {
      return next(new AppError('Unauthorized', 403));
    }

    if (submission.status !== 'in_progress') {
      return next(new AppError('Assessment already finalized', 400));
    }

    submission.violations.push({ type, at: new Date() });
    submission.violationCount = submission.violations.length;
    await submission.save();

    // fetch assessment settings to check max allowed tab switches
    const assessment = await Assessment.findById(submission.assessment)
      .select('settings title')
      .lean();

    const maxTabSwitches = assessment?.settings?.maxTabSwitches ?? 3;
    const tabSwitchCount = submission.violations.filter((v) => v.type === 'tab_switch').length;
    const shouldAutoSubmit =
      !assessment?.settings?.allowTabSwitch && tabSwitchCount >= maxTabSwitches;

    return res.status(200).json({
      success: true,
      data: {
        violationCount: submission.violationCount,
        shouldAutoSubmit,    // frontend reads this and triggers auto-submit if true
        message: shouldAutoSubmit
          ? `Maximum violations reached. Assessment will be auto-submitted.`
          : `Violation logged (${submission.violationCount} total).`,
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/submissions/run-code
// Student runs code against visible test cases only (live test during OA)
const runCode = async (req, res, next) => {
  try {
    const { code, language, input = '' } = req.body;

    if (!code || !language) {
      return next(new AppError('code and language are required', 400));
    }

    const SUPPORTED = ['python', 'javascript', 'java', 'cpp', 'c', 'go', 'rust', 'ruby', 'typescript'];
    if (!SUPPORTED.includes(language.toLowerCase())) {
      return next(new AppError(`Unsupported language. Supported: ${SUPPORTED.join(', ')}`, 400));
    }

    const { executeCode } = require('../services/judge.service');
    const result = await executeCode(code, language, input);

    return res.status(200).json({
      success: true,
      data: {
        stdout: result.stdout,
        stderr: result.stderr,
        status: result.status,
        time: result.time,
        memory: result.memory,
      },
    });
  } catch (err) {
    // judge API failures should return a clean error, not 500
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.response?.status >= 500) {
      return next(new AppError('Code execution service is currently unavailable. Try again.', 503));
    }
    next(err);
  }
};

// GET /api/v1/submissions/:submissionId
// Get a submission by ID (student gets own; TPO/recruiter gets any)
const getSubmissionById = async (req, res, next) => {
  try {
    const { submissionId } = req.params;

    const submission = await AssessmentSubmission.findById(submissionId)
      .populate({
        path: 'student',
        select: 'rollNumber branch cgpa',
        populate: { path: 'user', select: 'name email' },
      })
      .populate('assessment', 'title totalMarks durationMinutes settings')
      .lean();

    if (!submission) return next(new AppError('Submission not found', 404));

    // students can only see their own
    if (req.user.role === 'student') {
      const student = await Student.findOne({ user: req.user._id }).lean();
      if (!student || submission.student._id.toString() !== student._id.toString()) {
        return next(new AppError('Unauthorized', 403));
      }

      // hide results if assessment doesn't allow showing after submit
      const showResult = submission.assessment?.settings?.showResultAfterSubmit ?? false;
      if (!showResult && submission.status === 'graded') {
        return res.status(200).json({
          success: true,
          data: {
            submission: {
              _id: submission._id,
              status: submission.status,
              submittedAt: submission.submittedAt,
              autoSubmitted: submission.autoSubmitted,
              message: 'Results will be shared by the recruiter.',
            },
          },
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: { submission },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  submitAssessment,
  logViolation,
  runCode,
  getSubmissionById,
};