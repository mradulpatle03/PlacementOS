const express = require("express");
const router = express.Router();

const {
  tpoAnalytics,
  branchAnalytics,
  companyAnalytics,
  studentAnalytics,
  overallFunnel,
  driveFunnel,
  driveConversionSummary,
  invalidateAnalyticsCache,
  cacheStatus,
} = require("../controllers/analytics.controller");

const { requireAuth, requireRole } = require("../middlewares/auth.middleware");

// ── TPO / Admin / Coordinator ─────────────────────────────────
router.get(
  "/tpo",
  requireAuth,
  requireRole("tpo", "admin", "coordinator"),
  tpoAnalytics,
);

router.get(
  "/branch/:branch",
  requireAuth,
  requireRole("tpo", "admin", "coordinator"),
  branchAnalytics,
);

router.get(
  "/company/:id",
  requireAuth,
  requireRole("tpo", "admin", "coordinator", "recruiter"),
  companyAnalytics,
);

// ── Funnel — specific routes BEFORE parameterised ─────────────
router.get(
  "/funnel",
  requireAuth,
  requireRole("tpo", "admin", "coordinator"),
  overallFunnel,
);

router.get(
  "/funnel/drives",
  requireAuth,
  requireRole("tpo", "admin", "coordinator"),
  driveConversionSummary,
);

router.get(
  "/funnel/drive/:driveId",
  requireAuth,
  requireRole("tpo", "admin", "coordinator", "recruiter"),
  driveFunnel,
);

// ── Student ───────────────────────────────────────────────────
router.get(
  "/student/me",
  requireAuth,
  requireRole("student"),
  studentAnalytics,
);

// ── Cache management (TPO / Admin) ────────────────────────────
// GET  /cache/status before POST /cache/invalidate
// (both are fixed paths so order doesn't cause conflict, but be explicit)
router.get(
  "/cache/status",
  requireAuth,
  requireRole("tpo", "admin"),
  cacheStatus,
);

router.post(
  "/cache/invalidate",
  requireAuth,
  requireRole("tpo", "admin"),
  invalidateAnalyticsCache,
);

module.exports = router;
