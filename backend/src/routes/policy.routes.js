const express = require("express");
const router = express.Router();

const {
  getPolicy,
  updatePolicy,
  resetPolicy,
} = require("../controllers/policy.controller");

const { requireAuth, requireRole } = require("../middlewares/auth.middleware");

// Any authenticated user — view current policy
router.get("/", requireAuth, getPolicy);

// TPO / Admin only — update policy
router.patch("/", requireAuth, requireRole("tpo", "admin"), updatePolicy);

// TPO / Admin only — reset to defaults
router.post("/reset", requireAuth, requireRole("tpo", "admin"), resetPolicy);

module.exports = router;
