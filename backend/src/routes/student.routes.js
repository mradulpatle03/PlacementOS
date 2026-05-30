const router = require("express").Router();
const {
  getMyProfile,
  updateMyProfile,
  addProject,
  updateProject,
  deleteProject,
  updateSkills,
  getAllStudents,
  getStudentById,
  getProfileCompleteness,
} = require("../controllers/student.controller");
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");
const {
  validate,
  updateStudentSchema,
  addProjectSchema,
  updateProjectSchema,
} = require("../validators/student.validator");

// Student: own profile
router.get("/me", requireAuth, requireRole("student"), getMyProfile);
router.put(
  "/me",
  requireAuth,
  requireRole("student"),
  validate(updateStudentSchema),
  updateMyProfile,
);
router.put("/me/skills", requireAuth, requireRole("student"), updateSkills);
router.post(
  "/me/projects",
  requireAuth,
  requireRole("student"),
  validate(addProjectSchema),
  addProject,
);
router.put(
  "/me/projects/:projectId",
  requireAuth,
  requireRole("student"),
  validate(updateProjectSchema),
  updateProject,
);
router.delete(
  "/me/projects/:projectId",
  requireAuth,
  requireRole("student"),
  deleteProject,
);

// TPO / Admin: all students
router.get(
  "/",
  requireAuth,
  requireRole("tpo", "admin", "coordinator"),
  getAllStudents,
);
router.get(
  "/me/completeness",
  requireAuth,
  requireRole("student"),
  getProfileCompleteness,
);
router.get(
  "/:id",
  requireAuth,
  requireRole("tpo", "admin", "coordinator"),
  getStudentById,
);

module.exports = router;
