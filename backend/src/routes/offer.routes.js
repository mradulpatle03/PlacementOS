const express = require("express");
const router = express.Router();

const {
  uploadOffer,
  verifyOffer,
  acceptOffer,
  rejectOffer,
  getOffersByDrive,
  getMyOffers,
  getOfferById,
  deleteOffer,
} = require("../controllers/offer.controller");

const { requireAuth, requireRole } = require("../middlewares/auth.middleware");
const { upload } = require("../config/multer");
const handleMulterError = require("../middlewares/multerError");

// ── Student routes ────────────────────────────────────────────
router.get("/my", requireAuth, requireRole("student"), getMyOffers);

router.patch("/:id/accept", requireAuth, requireRole("student"), acceptOffer);

router.patch("/:id/reject", requireAuth, requireRole("student"), rejectOffer);

// ── Recruiter + TPO routes ────────────────────────────────────
router.post(
  "/upload",
  requireAuth,
  requireRole("recruiter", "tpo", "admin"),
  upload.single("offerLetter"), // field name: offerLetter
  handleMulterError,
  uploadOffer,
);

router.get(
  "/drive/:driveId",
  requireAuth,
  requireRole("tpo", "admin", "recruiter", "coordinator"),
  getOffersByDrive,
);

// TPO / Admin only
router.patch(
  "/:id/verify",
  requireAuth,
  requireRole("tpo", "admin"),
  verifyOffer,
);

router.delete("/:id", requireAuth, requireRole("tpo", "admin"), deleteOffer);

// ── Any authenticated role (student: own only, others: any) ───
router.get("/:id", requireAuth, getOfferById);

module.exports = router;
