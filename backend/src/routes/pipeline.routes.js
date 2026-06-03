const express = require('express');
const router = express.Router();
const {
  moveStage,
  bulkMoveStage,
  getPipelineByDrive,
  getPipelineStages,
  getStageHistory,
  rejectApplication,
} = require('../controllers/pipeline.controller');
const { exportPipelineStage } = require('../controllers/export.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');

// GET /api/v1/pipeline/stages
// Canonical stage list — frontend uses this to build Kanban columns
router.get('/stages', requireAuth, getPipelineStages);

// GET /api/v1/pipeline/drive/:driveId
// All applications grouped by stage — Kanban data
router.get(
  '/drive/:driveId',
  requireAuth,
  requireRole('tpo', 'recruiter', 'admin'),
  getPipelineByDrive
);

// GET /api/v1/pipeline/drive/:driveId/export?stage=shortlisted&format=xlsx
// Excel or CSV export per stage (or all stages if no stage param)
router.get(
  '/drive/:driveId/export',
  requireAuth,
  requireRole('tpo', 'recruiter', 'admin'),
  exportPipelineStage
);

// POST /api/v1/pipeline/bulk-move
// NOTE: defined BEFORE /:id routes to prevent Express matching 'bulk-move' as an id
router.post(
  '/bulk-move',
  requireAuth,
  requireRole('tpo', 'recruiter', 'admin'),
  bulkMoveStage
);

// GET /api/v1/pipeline/:id/history
router.get('/:id/history', requireAuth, getStageHistory);

// PUT /api/v1/pipeline/:id/move-stage
router.put(
  '/:id/move-stage',
  requireAuth,
  requireRole('tpo', 'recruiter', 'admin'),
  moveStage
);

// PUT /api/v1/pipeline/:id/reject
router.put(
  '/:id/reject',
  requireAuth,
  requireRole('tpo', 'recruiter', 'admin'),
  rejectApplication
);

module.exports = router;