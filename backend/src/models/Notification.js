const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    // who receives this notification
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // notification type — maps to email template + display icon
    type: {
      type: String,
      enum: [
        "drive_opened", // new drive published
        "drive_closed", // drive closed
        "application_status", // pipeline stage moved
        "oa_reminder", // OA starting soon
        "interview_reminder", // interview reminder
        "offer_released", // offer letter uploaded
        "result_declared", // final result
        "general", // broadcast / announcement
      ],
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    // optional deep-link data so frontend can navigate
    metadata: {
      driveId: { type: String, default: null },
      companyName: { type: String, default: null },
      applicationId: { type: String, default: null },
      assessmentId: { type: String, default: null },
      interviewId: { type: String, default: null },
      link: { type: String, default: null }, // relative URL e.g. /drives/:id
    },

    // delivery channels attempted
    channels: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
    },

    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// indexes
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1 });
notificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 },
); // TTL: 90 days

module.exports = mongoose.model("Notification", notificationSchema);
