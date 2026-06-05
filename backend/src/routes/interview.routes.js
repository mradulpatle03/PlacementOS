const express = require('express');
const router  = express.Router();

const {
  createSlot,
  createBulkSlots,
  getSlots,
  getAvailableSlots,
  bookSlot,
  deleteSlot,
  scheduleInterview,
  getInterviews,
  getMyInterviews,
  getInterviewById,
  rescheduleInterview,
  cancelInterview,
  recordResult,
} = require('../controllers/interview.controller');

const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const {
  validate,
  scheduleInterviewSchema,
  rescheduleInterviewSchema,
  recordResultSchema,
  createSlotSchema,
  createBulkSlotsSchema,
} = require('../validators/interview.validator');

// Slot routes

// GET  /api/v1/interviews/slots?driveId=&round=   (recruiter/TPO — full view)
router.get(
  '/slots',
  requireAuth,
  requireRole('tpo', 'recruiter', 'admin', 'coordinator'),
  getSlots
);

// GET  /api/v1/interviews/slots/available?driveId=&round= (student — books a slot)
router.get(
  '/slots/available',
  requireAuth,
  requireRole('student'),
  getAvailableSlots
);

// POST /api/v1/interviews/slots              (create one slot)
router.post(
  '/slots',
  requireAuth,
  requireRole('tpo', 'recruiter', 'admin'),
  validate(createSlotSchema),
  createSlot
);

// POST /api/v1/interviews/slots/bulk        (create many slots at once)
router.post(
  '/slots/bulk',
  requireAuth,
  requireRole('tpo', 'recruiter', 'admin'),
  validate(createBulkSlotsSchema),
  createBulkSlots
);

// POST /api/v1/interviews/slots/:slotId/book (student books a slot)
router.post(
  '/slots/:slotId/book',
  requireAuth,
  requireRole('student'),
  bookSlot
);

// DELETE /api/v1/interviews/slots/:slotId   (recruiter removes empty slot)
router.delete(
  '/slots/:slotId',
  requireAuth,
  requireRole('tpo', 'recruiter', 'admin'),
  deleteSlot
);

// Interview routes

// GET  /api/v1/interviews/my                (student — own interviews)
router.get(
  '/my',
  requireAuth,
  requireRole('student'),
  getMyInterviews
);

// GET  /api/v1/interviews?driveId=&round=   (recruiter/TPO — drive interviews)
router.get(
  '/',
  requireAuth,
  requireRole('tpo', 'recruiter', 'admin', 'coordinator'),
  getInterviews
);

// POST /api/v1/interviews                   (recruiter directly schedules)
router.post(
  '/',
  requireAuth,
  requireRole('tpo', 'recruiter', 'admin'),
  validate(scheduleInterviewSchema),
  scheduleInterview
);

// GET  /api/v1/interviews/:id
router.get(
  '/:id',
  requireAuth,
  getInterviewById
);

// PUT  /api/v1/interviews/:id/reschedule
router.put(
  '/:id/reschedule',
  requireAuth,
  requireRole('tpo', 'recruiter', 'admin'),
  validate(rescheduleInterviewSchema),
  rescheduleInterview
);

// PATCH /api/v1/interviews/:id/cancel
router.patch(
  '/:id/cancel',
  requireAuth,
  requireRole('tpo', 'recruiter', 'admin'),
  cancelInterview
);

// PATCH /api/v1/interviews/:id/result
router.patch(
  '/:id/result',
  requireAuth,
  requireRole('tpo', 'recruiter', 'admin'),
  validate(recordResultSchema),
  recordResult
);

module.exports = router;