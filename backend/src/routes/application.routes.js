const express = require('express');
const router = express.Router();
const { applyToDrive, withdrawApplication, getMyApplications, getApplicationsByDrive } = require('../controllers/application.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const { PIPELINE_STAGES, STAGE_LABELS } = require('../services/pipeline.service');

// GET /api/v1/applications/pipeline-stages
// Returns the canonical stage list — useful for frontend Kanban column setup
router.get('/pipeline-stages', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      stages: PIPELINE_STAGES.map((s) => ({
        key: s,
        label: STAGE_LABELS[s],
      })),
    },
  });
});


// Student applies to a drive
router.post(
  '/apply',
  requireAuth,
  requireRole('student'),
  applyToDrive
);

// Student withdraws their application
router.patch(
  '/:id/withdraw',
  requireAuth,
  requireRole('student'),
  withdrawApplication
);

router.get(
  '/my',
  requireAuth,
  requireRole('student'),
  getMyApplications
);

router.get(
  '/drive/:driveId',
  requireAuth,
  requireRole('tpo', 'recruiter', 'admin'),
  getApplicationsByDrive
);

module.exports = router;