const express = require("express");
const router = express.Router();

const {
  generateReport,
  getReports,
  getReportById,
  deleteReport,
  getAvailableFields,
  countPreview,
} = require("../controllers/report.controller");

const { requireAuth, requireRole } = require("../middlewares/auth.middleware");

router.use(requireAuth, requireRole("tpo", "admin", "coordinator"));

// specific routes before /:id
router.get("/fields", getAvailableFields);
router.get("/count-preview", countPreview);

router.post("/generate", generateReport);
router.get("/", getReports);
router.get("/:id", getReportById);
router.delete("/:id", deleteReport);

module.exports = router;
