const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    // who performed the action
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // null for unauthenticated (e.g. public routes)
    },
    userEmail: { type: String, default: null },
    userRole: { type: String, default: null },

    // what action
    action: {
      type: String,
      enum: [
        "CREATE",
        "UPDATE",
        "DELETE",
        "LOGIN",
        "LOGOUT",
        "LOGIN_FAILED",
        "UPLOAD",
        "EXPORT",
        "STATUS_CHANGE",
        "ROLE_CHANGE",
        "VERIFY",
      ],
      required: true,
    },

    // which entity was affected
    entity: {
      type: String,
      enum: [
        "User",
        "Student",
        "Recruiter",
        "Company",
        "Drive",
        "Application",
        "Pipeline",
        "Assessment",
        "Interview",
        "Offer",
        "Report",
        "Policy",
        "Resume",
        "Notification",
        "Auth",
        "System",
      ],
      required: true,
    },

    entityId: { type: String, default: null }, // the _id of affected document
    entityTitle: { type: String, default: null }, // human-readable label

    // http context
    method: { type: String, default: null }, // GET/POST/PUT/PATCH/DELETE
    path: { type: String, default: null }, // /api/v1/drives/...
    statusCode: { type: Number, default: null },

    // change details
    changes: {
      before: { type: mongoose.Schema.Types.Mixed, default: null },
      after: { type: mongoose.Schema.Types.Mixed, default: null },
    },

    // request context
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },

    // extra context (free-form)
    meta: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

// indexes for search endpoints
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ entity: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entityId: 1 });

// TTL — auto-delete audit logs after 90 days
auditLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 },
);

module.exports = mongoose.model("AuditLog", auditLogSchema);
