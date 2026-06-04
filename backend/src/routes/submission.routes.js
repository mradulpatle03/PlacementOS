const express = require('express');
const router = express.Router();
const {
  submitAssessment,
  logViolation,
  runCode,
  getSubmissionById,
} = require('../controllers/submission.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');

// Run code (live test — no submission saved)
// POST /api/v1/submissions/run-code
router.post(
  '/run-code',
  requireAuth,
  requireRole('student'),
  runCode
);

// Submit finalized answers
// POST /api/v1/submissions/:submissionId/submit
router.post(
  '/:submissionId/submit',
  requireAuth,
  requireRole('student'),
  submitAssessment
);

// Log anti-cheat violation
// POST /api/v1/submissions/:submissionId/violation
router.post(
  '/:submissionId/violation',
  requireAuth,
  requireRole('student'),
  logViolation
);

// Get a single submission
// GET /api/v1/submissions/:submissionId
router.get(
  '/:submissionId',
  requireAuth,
  getSubmissionById
);

module.exports = router;