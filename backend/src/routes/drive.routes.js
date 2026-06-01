const router = require("express").Router();
const {
  createDrive,
  getAllDrives,
  getDriveById,
  updateDrive,
  deleteDrive,
  updateDriveStatus,
  uploadJD,
  getDriveSummary,
  getDriveStats,
  previewJD,
  getUpcomingDrives,
} = require("../controllers/drive.controller");
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");
const {
  validate,
  createDriveSchema,
  updateDriveSchema,
  updateStatusSchema,
} = require("../validators/drive.validator");
const { upload } = require("../config/multer");
const handleMulterError = require("../middlewares/multerError");

// stats — before /:id to avoid conflict
router.get(
  "/stats",
  requireAuth,
  requireRole("tpo", "admin", "coordinator"),
  getDriveStats,
);

// all roles can list and view drives (filtered inside controller)
router.get("/", requireAuth, getAllDrives);

router.get("/upcoming", requireAuth, getUpcomingDrives);

router.get("/:id", requireAuth, getDriveById);

router.get(
  "/:id/summary",
  requireAuth,
  requireRole("tpo", "admin", "coordinator"),
  getDriveSummary,
);

// TPO / admin only — mutations
router.post(
  "/",
  requireAuth,
  requireRole("tpo", "admin"),
  validate(createDriveSchema),
  createDrive,
);

router.put(
  "/:id",
  requireAuth,
  requireRole("tpo", "admin"),
  validate(updateDriveSchema),
  updateDrive,
);

router.delete("/:id", requireAuth, requireRole("tpo", "admin"), deleteDrive);

router.put(
  "/:id/status",
  requireAuth,
  requireRole("tpo", "admin"),
  updateDriveStatus,
);

router.post(
  "/:id/jd",
  requireAuth,
  requireRole("tpo", "admin"),
  upload.single("jd"),
  handleMulterError,
  uploadJD,
);

router.put(
  "/:id/status",
  requireAuth,
  requireRole("tpo", "admin"),
  validate(updateStatusSchema),
  updateDriveStatus,
);

// add these routes:
router.get(
  "/:id/jd/preview",
  requireAuth,
  previewJD, // all roles can preview JD
);

router.delete(
  "/:id/jd",
  requireAuth,
  requireRole("tpo", "admin"),
  async (req, res, next) => {
    try {
      const Drive = require("../models/Drive");
      const { deleteFromCloudinary } = require("../utils/cloudinaryUpload");
      const { createError } = require("../middlewares/errorHandler");

      const drive = await Drive.findById(req.params.id);
      if (!drive) return next(createError("Drive not found", 404));
      if (!drive.jd?.publicId) return next(createError("No JD to delete", 404));

      await deleteFromCloudinary(drive.jd.publicId);
      drive.jd = undefined;
      await drive.save();

      res.json({ success: true, message: "JD deleted" });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
