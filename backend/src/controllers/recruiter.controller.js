const Recruiter = require("../models/Recruiter");
const User = require("../models/User");
const { createError } = require("../middlewares/errorHandler");

// GET /api/v1/recruiters/me
const getMyProfile = async (req, res, next) => {
  try {
    const recruiter = await Recruiter.findOne({ user: req.user._id })
      .populate("user", "name email")
      .populate("company", "name logo");

    if (!recruiter)
      return next(createError("Recruiter profile not found", 404));
    res.json({ success: true, recruiter });
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/recruiters/me
const updateMyProfile = async (req, res, next) => {
  try {
    const recruiter = await Recruiter.findOneAndUpdate(
      { user: req.user._id },
      { $set: req.body },
      { new: true, runValidators: true },
    )
      .populate("user", "name email")
      .populate("company", "name logo");

    if (!recruiter)
      return next(createError("Recruiter profile not found", 404));
    console.log(`Recruiter profile updated: ${req.user.email}`);
    res.json({ success: true, recruiter });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/recruiters
// TPO/admin: list all recruiters with optional filters
const getAllRecruiters = async (req, res, next) => {
  try {
    const { isVerified, company, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (isVerified !== undefined) filter.isVerified = isVerified === "true";
    if (company) filter.company = company;

    const skip = (Number(page) - 1) * Number(limit);

    const [recruiters, total] = await Promise.all([
      Recruiter.find(filter)
        .populate("user", "name email isActive")
        .populate("company", "name")
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 }),
      Recruiter.countDocuments(filter),
    ]);

    res.json({
      success: true,
      recruiters,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/recruiters/:id
// TPO/admin: get single recruiter
const getRecruiterById = async (req, res, next) => {
  try {
    const recruiter = await Recruiter.findById(req.params.id)
      .populate("user", "name email isActive")
      .populate("company", "name logo");

    if (!recruiter) return next(createError("Recruiter not found", 404));
    res.json({ success: true, recruiter });
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/recruiters/:id/verify
// TPO/admin: approve or reject recruiter verification
const verifyRecruiter = async (req, res, next) => {
  try {
    const { action, rejectionReason } = req.body;

    const recruiter = await Recruiter.findById(req.params.id).populate(
      "user",
      "name email",
    );
    if (!recruiter) return next(createError("Recruiter not found", 404));

    if (action === "approve") {
      recruiter.isVerified = true;
      recruiter.verifiedBy = req.user._id;
      recruiter.verifiedAt = new Date();
      recruiter.rejectionReason = undefined;
      console.log(
        `Recruiter approved: ${recruiter.user.email} by ${req.user.email}`,
      );
    } else {
      recruiter.isVerified = false;
      recruiter.rejectionReason = rejectionReason;
      console.log(
        `Recruiter rejected: ${recruiter.user.email} — reason: ${rejectionReason}`,
      );
    }

    await recruiter.save();
    res.json({
      success: true,
      message:
        action === "approve"
          ? "Recruiter verified successfully"
          : "Recruiter rejected",
      recruiter,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/recruiters/pending
// TPO/admin: list unverified recruiters only
const getPendingRecruiters = async (req, res, next) => {
  try {
    const recruiters = await Recruiter.find({ isVerified: false })
      .populate("user", "name email createdAt")
      .populate("company", "name")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: recruiters.length, recruiters });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  getAllRecruiters,
  getRecruiterById,
  verifyRecruiter,
  getPendingRecruiters,
};
