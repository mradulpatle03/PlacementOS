const SuccessStory = require("../models/SuccessStory");
const Company = require("../models/Company");
const AppError = require("../utils/AppError");
const { getPublicStats } = require("../services/publicStats.service");
const { withCache } = require("../utils/analyticsCache");

// ── GET /api/v1/public/stats ───────────────────────────────────
// Cached 10 min — public landing page hero stats
const getStats = async (req, res, next) => {
  try {
    const data = await withCache("public:stats", 10 * 60, getPublicStats);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/public/recruiters ──────────────────────────────
// Showcase of verified, hiring companies — logos + sector for landing page grid
const getRecruiterShowcase = async (req, res, next) => {
  try {
    const data = await withCache("public:recruiters", 10 * 60, async () => {
      const companies = await Company.find({ isVerified: true })
        .select("name logo sector location")
        .sort({ createdAt: -1 })
        .limit(40)
        .lean();
      return companies;
    });

    return res.status(200).json({ success: true, data: { companies: data } });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/v1/public/success-stories ─────────────────────────
// Published stories — public, no auth
const getPublicSuccessStories = async (req, res, next) => {
  try {
    const { featured, limit = 12 } = req.query;

    const filter = { isPublished: true };
    if (featured === "true") filter.isFeatured = true;

    const stories = await SuccessStory.find(filter)
      .sort({ isFeatured: -1, createdAt: -1 })
      .limit(Number(limit))
      .lean();

    return res.status(200).json({ success: true, data: { stories } });
  } catch (err) {
    next(err);
  }
};

// ── TPO-only CRUD below ─────────────────────────────────────────

// POST /api/v1/admin/success-stories
const createSuccessStory = async (req, res, next) => {
  try {
    const {
      studentName,
      branch,
      graduationYear,
      companyName,
      role,
      ctc,
      testimonial,
      isFeatured,
      studentId,
    } = req.body;

    if (!studentName || !companyName || !testimonial) {
      return next(
        new AppError(
          "studentName, companyName, and testimonial are required",
          400,
        ),
      );
    }

    let photoUrl = null,
      photoPublicId = null;

    if (req.file) {
      const { uploadBufferToCloudinary } = require("../utils/cloudinaryUpload");
      const result = await uploadBufferToCloudinary(req.file.buffer, {
        folder: "placementos/success-stories",
        resource_type: "image",
        public_id: `story_${Date.now()}`,
      });
      photoUrl = result.secure_url;
      photoPublicId = result.public_id;
    }

    const story = await SuccessStory.create({
      student: studentId || null,
      studentName,
      branch: branch || "",
      graduationYear: graduationYear ? Number(graduationYear) : null,
      companyName,
      role: role || "",
      ctc: ctc ? Number(ctc) : null,
      testimonial,
      photoUrl,
      photoPublicId,
      isFeatured: isFeatured === "true" || isFeatured === true,
      isPublished: true,
      createdBy: req.user._id,
    });

    // bust public cache
    const { invalidateCache } = require("../utils/analyticsCache");
    await invalidateCache("public:*");

    return res.status(201).json({
      success: true,
      message: "Success story created",
      data: { story },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/admin/success-stories
// All stories (published + unpublished) for TPO management
const getAllSuccessStories = async (req, res, next) => {
  try {
    const stories = await SuccessStory.find()
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, data: { stories } });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/admin/success-stories/:id
const updateSuccessStory = async (req, res, next) => {
  try {
    const allowedFields = [
      "studentName",
      "branch",
      "graduationYear",
      "companyName",
      "role",
      "ctc",
      "testimonial",
      "isPublished",
      "isFeatured",
    ];

    const updates = {};
    allowedFields.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    // handle new photo upload
    if (req.file) {
      const {
        uploadBufferToCloudinary,
        deleteFromCloudinary,
      } = require("../utils/cloudinaryUpload");

      const existing = await SuccessStory.findById(req.params.id);
      if (existing?.photoPublicId) {
        await deleteFromCloudinary(existing.photoPublicId).catch(() => {});
      }

      const result = await uploadBufferToCloudinary(req.file.buffer, {
        folder: "placementos/success-stories",
        resource_type: "image",
        public_id: `story_${Date.now()}`,
      });
      updates.photoUrl = result.secure_url;
      updates.photoPublicId = result.public_id;
    }

    const story = await SuccessStory.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true },
    );

    if (!story) return next(new AppError("Success story not found", 404));

    const { invalidateCache } = require("../utils/analyticsCache");
    await invalidateCache("public:*");

    return res.status(200).json({
      success: true,
      message: "Success story updated",
      data: { story },
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/admin/success-stories/:id
const deleteSuccessStory = async (req, res, next) => {
  try {
    const story = await SuccessStory.findByIdAndDelete(req.params.id);
    if (!story) return next(new AppError("Success story not found", 404));

    if (story.photoPublicId) {
      const { deleteFromCloudinary } = require("../utils/cloudinaryUpload");
      await deleteFromCloudinary(story.photoPublicId).catch(() => {});
    }

    const { invalidateCache } = require("../utils/analyticsCache");
    await invalidateCache("public:*");

    return res
      .status(200)
      .json({ success: true, message: "Success story deleted" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getStats,
  getRecruiterShowcase,
  getPublicSuccessStories,
  createSuccessStory,
  getAllSuccessStories,
  updateSuccessStory,
  deleteSuccessStory,
};
