const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    targetRoles: {
      type: [String],
      enum: ["student", "recruiter", "coordinator", "tpo", "admin"],
      default: ["student", "recruiter", "coordinator", "tpo"],
    },
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date, default: null },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

announcementSchema.index({ isActive: 1, expiresAt: 1 });
// auto-expire docs 30 days after expiresAt
announcementSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, sparse: true },
);

module.exports = mongoose.model("Announcement", announcementSchema);
