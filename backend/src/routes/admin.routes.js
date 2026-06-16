const express = require("express");
const router = express.Router();

const {
  getAuditLogs,
  getAuditLogById,
  getAuditStats,
} = require("../controllers/audit.controller");

const {
  getUsers,
  getUserById,
  updateUserRole,
  toggleUserActive,
  broadcastAnnouncement,
  getAnnouncements,
} = require("../controllers/admin.controller");

const { requireAuth, requireRole } = require("../middlewares/auth.middleware");

router.use(requireAuth, requireRole("admin"));

// ── User management ───────────────────────────────────────────
router.get("/users", getUsers);
router.get("/users/:id", getUserById);
router.patch("/users/:id/role", updateUserRole);
router.patch("/users/:id/toggle", toggleUserActive);

// ── Announcements ─────────────────────────────────────────────
router.post("/announcements", broadcastAnnouncement);
router.get("/announcements", getAnnouncements);

// ── Audit logs ────────────────────────────────────────────────
router.get("/audit/stats", getAuditStats);
router.get("/audit", getAuditLogs);
router.get("/audit/:id", getAuditLogById);

module.exports = router;
