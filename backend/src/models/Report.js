const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    // who requested it
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // report type
    type: {
      type: String,
      enum: [
        "placement_summary", // overall placement stats — multi-sheet Excel
        "drive_report", // single drive full report
        "branch_report", // branch-wise breakdown
        "company_report", // company-wise history
        "offer_report", // offer letter status report
        "custom", // TPO-defined field selection
      ],
      required: true,
    },

    title: { type: String, required: true, trim: true },

    // filters applied when generating
    filters: {
      driveId: { type: String, default: null },
      branch: { type: String, default: null },
      companyId: { type: String, default: null },
      year: { type: String, default: null },
      status: { type: String, default: null },
      fields: { type: [String], default: [] }, // for custom reports
    },

    format: {
      type: String,
      enum: ["xlsx", "pdf"],
      default: "xlsx",
    },

    // generation lifecycle
    status: {
      type: String,
      enum: ["queued", "processing", "completed", "failed"],
      default: "queued",
    },

    // file location after generation
    fileUrl: { type: String, default: null }, // Cloudinary URL
    publicId: { type: String, default: null }, // for deletion

    errorMessage: { type: String, default: null },

    // email recipient when done
    notifyEmail: { type: String, default: null },

    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

reportSchema.index({ requestedBy: 1, createdAt: -1 });
reportSchema.index({ status: 1 });
// auto-delete completed reports after 7 days
reportSchema.index(
  { completedAt: 1 },
  { expireAfterSeconds: 7 * 24 * 60 * 60 },
);

module.exports = mongoose.model("Report", reportSchema);
