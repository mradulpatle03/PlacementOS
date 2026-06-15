const Offer = require("../models/Offer");
const Application = require("../models/Application");
const Drive = require("../models/Drive");
const Student = require("../models/Student");
const AppError = require("../utils/AppError");
const {
  uploadBufferToCloudinary,
  deleteFromCloudinary,
} = require("../utils/cloudinaryUpload");
const { notifyOfferReleased } = require("../queues/notificationQueue");
const User = require("../models/User");

// ── POST /offers/upload ───────────────────────────────────────
// Recruiter or TPO uploads an offer letter PDF for a student
const uploadOffer = async (req, res, next) => {
  try {
    if (!req.file)
      return next(new AppError("Offer letter PDF is required", 400));

    const {
      applicationId,
      ctc,
      joiningDate,
      designation,
      location,
      responseDeadline,
    } = req.body;

    if (!applicationId)
      return next(new AppError("applicationId is required", 400));

    // 1. fetch application + drive + student
    const application = await Application.findById(applicationId)
      .populate("drive")
      .populate({
        path: "student",
        populate: { path: "user", select: "name email" },
      })
      .lean();

    if (!application) return next(new AppError("Application not found", 404));

    const drive = application.drive;
    const student = application.student;

    // 2. application must be at 'offered' stage
    if (application.status !== "offered") {
      return next(
        new AppError(
          `Offer can only be uploaded for applications at "offered" stage (current: ${application.status})`,
          400,
        ),
      );
    }

    // 3. prevent duplicate offer
    const existing = await Offer.findOne({ application: applicationId });
    if (existing) {
      return next(
        new AppError(
          "An offer letter already exists for this application",
          409,
        ),
      );
    }

    // 4. upload PDF to Cloudinary
    const cloudRes = await uploadBufferToCloudinary(req.file.buffer, {
      folder: `placementos/offers/${drive._id}`,
      resource_type: "raw",
      public_id: `offer_${applicationId}_${Date.now()}`,
      format: "pdf",
    });

    console.log(`Offer uploaded to Cloudinary: ${cloudRes.public_id}`);

    // 5. create offer document
    const company = await require("../models/Company")
      .findById(drive.company)
      .lean();

    const offer = await Offer.create({
      drive: drive._id,
      application: applicationId,
      student: student._id,
      company: drive.company,
      fileUrl: cloudRes.secure_url,
      publicId: cloudRes.public_id,
      ctc: ctc ? Number(ctc) : null,
      joiningDate: joiningDate ? new Date(joiningDate) : null,
      designation: designation || "",
      location: location || "",
      responseDeadline: responseDeadline ? new Date(responseDeadline) : null,
      uploadedBy: req.user._id,
      status: "uploaded",
    });

    // 6. notify student (non-fatal)
    try {
      if (student?.user) {
        await notifyOfferReleased(
          student.user._id.toString(),
          student.user.email,
          {
            studentName: student.user.name,
            drive: { _id: drive._id, title: drive.title },
            company: { name: company?.name || "Company" },
            deadline: responseDeadline || null,
          },
        );
      }
    } catch (notifErr) {
      console.log("[Offer] Notification failed (non-fatal):", notifErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Offer letter uploaded successfully",
      data: { offer },
    });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /offers/:id/verify ──────────────────────────────────
// TPO verifies an uploaded offer letter
const verifyOffer = async (req, res, next) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return next(new AppError("Offer not found", 404));

    if (offer.status !== "uploaded") {
      return next(
        new AppError(
          `Only uploaded offers can be verified (current: ${offer.status})`,
          400,
        ),
      );
    }

    offer.status = "verified";
    offer.verifiedBy = req.user._id;
    offer.verifiedAt = new Date();
    await offer.save();

    return res.status(200).json({
      success: true,
      message: "Offer letter verified",
      data: { offer },
    });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /offers/:id/accept ──────────────────────────────────
// Student accepts an offer
const acceptOffer = async (req, res, next) => {
  try {
    // find student profile
    const student = await Student.findOne({ user: req.user._id });
    if (!student) return next(new AppError("Student profile not found", 404));

    const offer = await Offer.findOne({
      _id: req.params.id,
      student: student._id,
    });
    if (!offer) return next(new AppError("Offer not found", 404));

    if (offer.status !== "verified") {
      return next(
        new AppError(
          offer.status === "uploaded"
            ? "Offer is pending TPO verification and cannot be accepted yet"
            : `Cannot accept offer with status: ${offer.status}`,
          400,
        ),
      );
    }

    // check response deadline
    if (offer.responseDeadline && new Date() > offer.responseDeadline) {
      offer.status = "expired";
      await offer.save();
      return next(
        new AppError("The response deadline for this offer has passed", 400),
      );
    }

    offer.status = "accepted";
    offer.respondedAt = new Date();
    await offer.save();

    // update application status → accepted
    await Application.findByIdAndUpdate(offer.application, {
      status: "accepted",
    });

    // update student placement status → placed
    student.placementStatus = "placed";
    await student.save();

    // bust analytics cache — placement % changed
    try {
      const { invalidateCache } = require("../utils/analyticsCache");
      await invalidateCache("analytics:*");
    } catch (_) {}

    return res.status(200).json({
      success: true,
      message: "Offer accepted successfully",
      data: { offer },
    });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /offers/:id/reject ──────────────────────────────────
// Student rejects an offer
const rejectOffer = async (req, res, next) => {
  try {
    const student = await Student.findOne({ user: req.user._id });
    if (!student) return next(new AppError("Student profile not found", 404));

    const offer = await Offer.findOne({
      _id: req.params.id,
      student: student._id,
    });
    if (!offer) return next(new AppError("Offer not found", 404));

    if (!["uploaded", "verified"].includes(offer.status)) {
      return next(
        new AppError(`Cannot reject offer with status: ${offer.status}`, 400),
      );
    }

    const { reason } = req.body;

    offer.status = "rejected";
    offer.respondedAt = new Date();
    offer.rejectionReason = reason || "";
    await offer.save();

    // move application back to hr stage (or keep at offered — TPO decides)
    // we do NOT revert placement status since student rejected voluntarily
    await Application.findByIdAndUpdate(offer.application, {
      status: "rejected",
    });

    return res.status(200).json({
      success: true,
      message: "Offer rejected",
      data: { offer },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /offers/drive/:driveId ────────────────────────────────
// TPO / Recruiter — list all offers for a drive
const getOffersByDrive = async (req, res, next) => {
  try {
    const { driveId } = req.params;
    const { status } = req.query;

    const filter = { drive: driveId };
    if (status) filter.status = status;

    const offers = await Offer.find(filter)
      .populate({
        path: "student",
        select: "branch cgpa rollNumber",
        populate: { path: "user", select: "name email" },
      })
      .populate("uploadedBy", "name email role")
      .populate("verifiedBy", "name")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: { total: offers.length, offers },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /offers/my ────────────────────────────────────────────
// Student — list their own offers
const getMyOffers = async (req, res, next) => {
  try {
    const student = await Student.findOne({ user: req.user._id }).lean();
    if (!student) return next(new AppError("Student profile not found", 404));

    const offers = await Offer.find({ student: student._id })
      .populate("drive", "title")
      .populate("company", "name logo")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: { total: offers.length, offers },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /offers/:id ───────────────────────────────────────────
// Single offer detail — student (own), TPO/recruiter (any)
const getOfferById = async (req, res, next) => {
  try {
    const offer = await Offer.findById(req.params.id)
      .populate("drive", "title company")
      .populate("company", "name logo")
      .populate("uploadedBy", "name email role")
      .populate("verifiedBy", "name")
      .populate({
        path: "student",
        select: "branch cgpa rollNumber",
        populate: { path: "user", select: "name email" },
      })
      .lean();

    if (!offer) return next(new AppError("Offer not found", 404));

    // students can only view their own offers
    if (req.user.role === "student") {
      const student = await Student.findOne({ user: req.user._id }).lean();
      if (!student || offer.student._id.toString() !== student._id.toString()) {
        return next(new AppError("Offer not found", 404));
      }
    }

    return res.status(200).json({
      success: true,
      data: { offer },
    });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /offers/:id ────────────────────────────────────────
// TPO only — delete an offer (e.g. uploaded by mistake)
const deleteOffer = async (req, res, next) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return next(new AppError("Offer not found", 404));

    // cannot delete accepted offers
    if (offer.status === "accepted") {
      return next(new AppError("Cannot delete an accepted offer", 400));
    }

    // delete PDF from Cloudinary
    await deleteFromCloudinary(offer.publicId);

    await offer.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Offer deleted",
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  uploadOffer,
  verifyOffer,
  acceptOffer,
  rejectOffer,
  getOffersByDrive,
  getMyOffers,
  getOfferById,
  deleteOffer,
};
