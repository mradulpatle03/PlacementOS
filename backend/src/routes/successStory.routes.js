const express = require("express");
const router = express.Router();

const {
  createSuccessStory,
  getAllSuccessStories,
  updateSuccessStory,
  deleteSuccessStory,
} = require("../controllers/public.controller");

const { requireAuth, requireRole } = require("../middlewares/auth.middleware");
const { upload } = require("../config/multer");
const handleMulterError = require("../middlewares/multerError");

router.use(requireAuth, requireRole("tpo", "admin"));

router.get("/", getAllSuccessStories);
router.post("/", upload.single("photo"), handleMulterError, createSuccessStory);
router.patch(
  "/:id",
  upload.single("photo"),
  handleMulterError,
  updateSuccessStory,
);
router.delete("/:id", deleteSuccessStory);

module.exports = router;
