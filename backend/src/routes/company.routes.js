const router = require("express").Router();
const {
  createCompany,
  getAllCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
  uploadLogo,
  getCompanyStats,
  linkRecruiter,
  unlinkRecruiter,
  getCompanyRecruiters,
  getHiringHistory,
  upsertHiringHistory,
} = require("../controllers/company.controller");
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");
const {
  validate,
  createCompanySchema,
  updateCompanySchema,
  linkRecruiterSchema,
  addHiringHistorySchema,
} = require("../validators/company.validator");
const { imageUpload } = require("../config/multer");
const handleMulterError = require("../middlewares/multerError");

// all company routes are TPO/admin only except GET (recruiters + coordinators can view)
router.post(
  "/",
  requireAuth,
  requireRole("tpo", "admin"),
  validate(createCompanySchema),
  createCompany,
);

router.get(
  "/",
  requireAuth,
  requireRole("tpo", "admin", "coordinator", "recruiter"),
  getAllCompanies,
);

router.get(
  "/:id",
  requireAuth,
  requireRole("tpo", "admin", "coordinator", "recruiter"),
  getCompanyById,
);

router.put(
  "/:id",
  requireAuth,
  requireRole("tpo", "admin"),
  validate(updateCompanySchema),
  updateCompany,
);

router.delete("/:id", requireAuth, requireRole("tpo", "admin"), deleteCompany);

router.post(
  "/:id/logo",
  requireAuth,
  requireRole("tpo", "admin"),
  imageUpload.single("logo"),
  handleMulterError,
  uploadLogo,
);

router.get(
  "/:id/stats",
  requireAuth,
  requireRole("tpo", "admin", "coordinator"),
  getCompanyStats,
);

router.post('/:id/recruiters',
  requireAuth, requireRole('tpo', 'admin'),
  validate(linkRecruiterSchema),
  linkRecruiter
);

router.delete('/:id/recruiters/:recruiterId',
  requireAuth, requireRole('tpo', 'admin'),
  unlinkRecruiter
);

router.get('/:id/recruiters',
  requireAuth, requireRole('tpo', 'admin', 'coordinator'),
  getCompanyRecruiters
);

router.get('/:id/history',
  requireAuth, requireRole('tpo', 'admin', 'coordinator', 'recruiter'),
  getHiringHistory
);

router.post('/:id/history',
  requireAuth, requireRole('tpo', 'admin'),
  validate(addHiringHistorySchema),
  upsertHiringHistory
);

module.exports = router;
