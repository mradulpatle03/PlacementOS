const router = require("express").Router();
const {
  getMyProfile,
  updateMyProfile,
  getAllRecruiters,
  getRecruiterById,
  verifyRecruiter,
  getPendingRecruiters,
} = require("../controllers/recruiter.controller");
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");
const {
  validate,
  updateRecruiterSchema,
  verifyRecruiterSchema,
} = require("../validators/recruiter.validator");

// Recruiter: own profile
router.get("/me", requireAuth, requireRole("recruiter"), getMyProfile);
router.put(
  "/me",
  requireAuth,
  requireRole("recruiter"),
  validate(updateRecruiterSchema),
  updateMyProfile,
);

// TPO / Admin
router.get(
  "/pending",
  requireAuth,
  requireRole("tpo", "admin"),
  getPendingRecruiters,
);
router.get("/", requireAuth, requireRole("tpo", "admin"), getAllRecruiters);
router.get("/:id", requireAuth, requireRole("tpo", "admin"), getRecruiterById);
router.put(
  "/:id/verify",
  requireAuth,
  requireRole("tpo", "admin"),
  validate(verifyRecruiterSchema),
  verifyRecruiter,
);

module.exports = router;
