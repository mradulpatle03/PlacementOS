const {
  getTPOAnalytics,
  getBranchAnalytics,
  getCompanyAnalytics,
  getStudentAnalytics,
  getDriveFunnel,
  getOverallFunnel,
  getDriveConversionSummary,
} = require('../services/analytics.service');

const Student  = require('../models/Student');
const AppError = require('../utils/AppError');
const {
  withCache,
  invalidateCache,
  getCacheStats,
  CACHE_KEYS,
  DEFAULT_TTL,
  STUDENT_TTL,
  DRIVE_TTL,
} = require('../utils/analyticsCache');

const VALID_BRANCHES = ['CSE', 'IT', 'ECE', 'EEE', 'ME', 'CE', 'Other'];

// ── GET /api/v1/analytics/tpo?year=2025 ───────────────────────
const tpoAnalytics = async (req, res, next) => {
  try {
    const { year } = req.query;
    const key      = CACHE_KEYS.tpo(year);

    const data = await withCache(key, DEFAULT_TTL, () =>
      getTPOAnalytics({ year })
    );

    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/analytics/branch/:branch?year=2025 ────────────
const branchAnalytics = async (req, res, next) => {
  try {
    const { branch } = req.params;
    const { year }   = req.query;

    if (!VALID_BRANCHES.includes(branch)) {
      return next(new AppError(`Invalid branch "${branch}"`, 400));
    }

    const key  = CACHE_KEYS.branch(branch, year);
    const data = await withCache(key, DEFAULT_TTL, () =>
      getBranchAnalytics({ branch, year })
    );

    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/analytics/company/:id ─────────────────────────
const companyAnalytics = async (req, res, next) => {
  try {
    const key  = CACHE_KEYS.company(req.params.id);
    const data = await withCache(key, DEFAULT_TTL, () =>
      getCompanyAnalytics({ companyId: req.params.id })
    );

    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/analytics/student/me ──────────────────────────
const studentAnalytics = async (req, res, next) => {
  try {
    const student = await Student.findOne({ user: req.user._id })
      .select('_id')
      .lean();
    if (!student) return next(new AppError('Student profile not found', 404));

    // per-user key so one student's cache doesn't bleed into another
    const key  = CACHE_KEYS.studentMe(req.user._id.toString());
    const data = await withCache(key, STUDENT_TTL, () =>
      getStudentAnalytics({ studentId: student._id })
    );

    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/analytics/funnel?year=2025 ────────────────────
const overallFunnel = async (req, res, next) => {
  try {
    const { year } = req.query;
    const key      = CACHE_KEYS.overallFunnel(year);

    const data = await withCache(key, DEFAULT_TTL, () =>
      getOverallFunnel({ year })
    );

    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/analytics/funnel/drive/:driveId ───────────────
const driveFunnel = async (req, res, next) => {
  try {
    const key  = CACHE_KEYS.driveFunnel(req.params.driveId);

    // short TTL — changes frequently during active recruitment
    const data = await withCache(key, DRIVE_TTL, () =>
      getDriveFunnel({ driveId: req.params.driveId })
    );

    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/analytics/funnel/drives?limit=10 ─────────────
const driveConversionSummary = async (req, res, next) => {
  try {
    const limit = req.query.limit || 10;
    const key   = CACHE_KEYS.driveConversion(limit);

    const data = await withCache(key, DEFAULT_TTL, () =>
      getDriveConversionSummary({ limit })
    );

    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/v1/analytics/cache/invalidate ───────────────────
const invalidateAnalyticsCache = async (req, res, next) => {
  try {
    await invalidateCache('analytics:*');
    return res.status(200).json({
      success: true,
      message: 'Analytics cache cleared',
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/analytics/cache/status ───────────────────────
// Shows which cache keys are live and their remaining TTL
const cacheStatus = async (req, res, next) => {
  try {
    const stats = await getCacheStats();
    return res.status(200).json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  tpoAnalytics,
  branchAnalytics,
  companyAnalytics,
  studentAnalytics,
  overallFunnel,
  driveFunnel,
  driveConversionSummary,
  invalidateAnalyticsCache,
  cacheStatus,
};