const express = require("express");
const router = express.Router();

const {
  getAuditLogs,
  getAuditLogById,
  getAuditStats,
} = require("../controllers/audit.controller");

const { requireAuth, requireRole } = require("../middlewares/auth.middleware");

// All admin routes — admin only
router.use(requireAuth, requireRole("admin"));

// Audit logs
// stats before /:id to avoid conflict
router.get("/audit/stats", getAuditStats);
router.get("/audit", getAuditLogs);
router.get("/audit/:id", getAuditLogById);

module.exports = router;
