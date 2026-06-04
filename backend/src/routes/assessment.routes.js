const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/assessment.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const { validate, createAssessmentSchema, updateAssessmentSchema } = require('../validators/assessment.validator');

// Drive-scoped listing
// GET /api/v1/assessments/drive/:driveId
router.get(
  '/drive/:driveId',
  requireAuth,
  getAssessmentsByDrive
);

// CRUD
// POST /api/v1/assessments
router.post(
  '/',
  requireAuth,
  requireRole('tpo', 'recruiter', 'admin'),
  validate(createAssessmentSchema),
  createAssessment
);

// GET /api/v1/assessments/:id
router.get('/:id', requireAuth, getAssessmentById);

// PUT /api/v1/assessments/:id
router.put(
  '/:id',
  requireAuth,
  requireRole('tpo', 'recruiter', 'admin'),
  validate(updateAssessmentSchema),
  updateAssessment
);

// DELETE /api/v1/assessments/:id
router.delete(
  '/:id',
  requireAuth,
  requireRole('tpo', 'admin'),
  deleteAssessment
);

// PATCH /api/v1/assessments/:id/status
router.patch(
  '/:id/status',
  requireAuth,
  requireRole('tpo', 'recruiter', 'admin'),
  updateAssessmentStatus
);

// Student actions
// POST /api/v1/assessments/:id/start
router.post(
  '/:id/start',
  requireAuth,
  requireRole('student'),
  startAssessment
);

// GET /api/v1/assessments/:id/my-submission
router.get(
  '/:id/my-submission',
  requireAuth,
  requireRole('student'),
  getMySubmission
);

// Recruiter / TPO — view results
// GET /api/v1/assessments/:id/submissions
router.get(
  '/:id/submissions',
  requireAuth,
  requireRole('tpo', 'recruiter', 'admin'),
  getSubmissions
);

// GET /api/v1/assessments/:id/stats
router.get(
  '/:id/stats',
  requireAuth,
  requireRole('tpo', 'recruiter', 'admin'),
  getAssessmentStats
);

// GET /api/v1/assessments/:id/export?format=xlsx
router.get(
  '/:id/export',
  requireAuth,
  requireRole('tpo', 'recruiter', 'admin'),
  exportAssessmentResults
);

module.exports = router;