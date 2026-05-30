const router = require("express").Router();
const {
  uploadResume,
  getMyResumes,
  deleteResume,
  setPrimary,
  updateLabel,
  getStudentResumes,
  getResumeScore,
  previewResume,
} = require("../controllers/resume.controller");
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");
const {
  validate,
  uploadResumeSchema,
} = require("../validators/resume.validator");
const upload = require("../config/multer");
const handleMulterError = require("../middlewares/multerError");

// Student: own resumes
router.post(
  "/upload",
  requireAuth,
  requireRole("student"),
  upload.single("resume"), // field name must be 'resume'
  handleMulterError,
  validate(uploadResumeSchema),
  uploadResume,
);

router.get("/", requireAuth, requireRole("student"), getMyResumes);
router.delete("/:id", requireAuth, requireRole("student"), deleteResume);
router.put("/:id/primary", requireAuth, requireRole("student"), setPrimary);
router.put("/:id/label", requireAuth, requireRole("student"), updateLabel);
router.get("/:id/score", requireAuth, requireRole("student"), getResumeScore);
router.get("/:id/preview", requireAuth, previewResume); // all roles can preview
// TPO / Recruiter: view student resumes
router.get(
  "/student/:studentId",
  requireAuth,
  requireRole("tpo", "admin", "recruiter", "coordinator"),
  getStudentResumes,
);

module.exports = router;
