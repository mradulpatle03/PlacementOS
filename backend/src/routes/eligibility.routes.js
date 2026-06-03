// Day 32 — Eligibility Routes
const express = require('express');
const router = express.Router();
const { checkMyEligibility, getEligibleStudents, exportEligibleStudents } = require('../controllers/eligibility.controller');
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");

// Student checks their own eligibility for a specific drive
router.get(
  '/:id/check-eligibility',
  requireAuth,
  requireRole('student'),
  checkMyEligibility
);

// TPO gets full eligible + ineligible student list for a drive
router.get(
  '/:id/eligible-students',
  requireAuth,
  requireRole('tpo', 'admin'),
  getEligibleStudents
);

// TPO exports eligible students list as Excel
router.get(
  '/:id/eligible-students/export',
  requireAuth,
  requireRole('tpo', 'admin'),
  exportEligibleStudents
);

module.exports = router;