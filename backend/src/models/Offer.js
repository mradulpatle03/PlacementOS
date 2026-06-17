const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    // relationships
    drive: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Drive",
      required: true,
    },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      unique: true, // one offer per application
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    // the uploaded PDF
    fileUrl: { type: String, required: true }, // Cloudinary secure_url
    publicId: { type: String, required: true }, // Cloudinary public_id (for deletion)

    // offer details (recruiter fills these on upload)
    ctc: { type: Number, default: null }, // in LPA
    joiningDate: { type: Date, default: null },
    designation: { type: String, trim: true, default: "" },
    location: { type: String, trim: true, default: "" },

    // workflow state machine
    // uploaded → verified → accepted / rejected / expired
    status: {
      type: String,
      enum: ["uploaded", "verified", "accepted", "rejected", "expired"],
      default: "uploaded",
    },

    // who uploaded (recruiter / tpo)
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // TPO verification
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    verifiedAt: { type: Date, default: null },

    // student response
    respondedAt: { type: Date, default: null },

    // deadline for student to respond
    responseDeadline: { type: Date, default: null },

    // rejection reason from student
    rejectionReason: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

// indexes
offerSchema.index({ drive: 1 });
offerSchema.index({ student: 1 });
offerSchema.index({ status: 1 });

module.exports = mongoose.model("Offer", offerSchema);
