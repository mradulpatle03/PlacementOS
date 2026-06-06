const { Worker, QUEUE_NAMES, connection } = require("../config/queues");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { sendMail } = require("../utils/mailer");
const { emitNotification } = require("../sockets");
const {
  driveOpenedEmail,
  applicationStatusEmail,
  oaReminderEmail,
  offerReleasedEmail,
  resultDeclaredEmail,
  generalEmail,
} = require("../utils/emailTemplates");
const { notificationDLQ } = require("./notificationQueue");

const buildEmail = (data) => {
  const { type, title, message, metadata, extra = {} } = data;
  switch (type) {
    case "drive_opened":
      return driveOpenedEmail({
        studentName: extra.studentName || "Student",
        companyName: metadata?.companyName || "",
        driveTitle: extra.driveTitle || title,
        ctc: extra.ctc || null,
        deadline: extra.deadline || null,
        driveId: metadata?.driveId || "",
      });
    case "application_status":
      return applicationStatusEmail({
        studentName: extra.studentName || "Student",
        companyName: metadata?.companyName || "",
        driveTitle: extra.driveTitle || "",
        newStage: extra.newStage || "",
        note: extra.note || "",
      });
    case "oa_reminder":
      return oaReminderEmail({
        studentName: extra.studentName || "Student",
        companyName: metadata?.companyName || "",
        assessmentTitle: extra.assessmentTitle || title,
        startsAt: extra.startsAt || null,
        endsAt: extra.endsAt || null,
        assessmentId: metadata?.assessmentId || "",
      });
    case "offer_released":
      return offerReleasedEmail({
        studentName: extra.studentName || "Student",
        companyName: metadata?.companyName || "",
        driveTitle: extra.driveTitle || "",
        deadline: extra.deadline || null,
      });
    case "result_declared":
      return resultDeclaredEmail({
        studentName: extra.studentName || "Student",
        companyName: metadata?.companyName || "",
        driveTitle: extra.driveTitle || "",
        placed: extra.placed || false,
      });
    case "general":
    default:
      return generalEmail({
        recipientName: extra.recipientName || null,
        title,
        message,
        link: metadata?.link || null,
        linkLabel: extra.linkLabel || "View Details",
      });
  }
};

let notificationWorker = null;

const startNotificationWorker = () => {
  if (notificationWorker) return notificationWorker;

  notificationWorker = new Worker(
    QUEUE_NAMES.NOTIFICATION,
    async (job) => {
      const {
        recipientId,
        recipientEmail,
        type,
        title,
        message,
        metadata = {},
        channels = { inApp: true, email: false },
        extra = {},
      } = job.data;

      console.log(
        `[NotificationWorker] Job ${job.id} | type: ${type} | recipient: ${recipientId}`,
      );

      // ── fetch user preferences (fail-open) ────────────────
      let prefs = null;
      try {
        const user = await User.findById(recipientId)
          .select("notificationPreferences")
          .lean();
        prefs = user?.notificationPreferences || null;
      } catch (_) {
        /* non-fatal */
      }

      const wantsInApp = prefs ? (prefs.inApp?.[type] ?? true) : channels.inApp;
      const wantsEmail = prefs
        ? (prefs.email?.[type] ?? channels.email)
        : channels.email;

      // 1. In-app: save to DB + emit via Socket.IO
      if (wantsInApp) {
        const notification = await Notification.create({
          recipient: recipientId,
          type,
          title,
          message,
          metadata,
          channels: { inApp: true, email: wantsEmail },
        });

        emitNotification(recipientId.toString(), {
          _id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          metadata: notification.metadata,
          isRead: false,
          createdAt: notification.createdAt,
        });

        console.log(
          `[NotificationWorker] In-app saved + emitted for ${recipientId}`,
        );
      }

      // 2. Email — use templated email
      if (wantsEmail && recipientEmail) {
        const { subject, html } = buildEmail({
          type,
          title,
          message,
          metadata,
          extra,
        });
        await sendMail({ to: recipientEmail, subject, html });
        console.log(`[NotificationWorker] Email sent to ${recipientEmail}`);
      }
    },
    { connection, concurrency: 20 },
  );

  notificationWorker.on("completed", (job) => {
    console.log(`[NotificationWorker] Job ${job.id} completed`);
  });

  notificationWorker.on("failed", async (job, err) => {
    console.error(
      `[NotificationWorker] Job ${job?.id} failed (attempt ${job?.attemptsMade}/${job?.opts?.attempts}):`,
      err.message,
    );
    if (job && job.attemptsMade >= (job.opts?.attempts || 3)) {
      try {
        await notificationDLQ.add("dlq-notification", {
          originalJobId: job.id,
          data: job.data,
          error: err.message,
          failedAt: new Date().toISOString(),
        });
        console.log(`[NotificationWorker] Job ${job.id} moved to DLQ`);
      } catch (dlqErr) {
        console.error(
          "[NotificationWorker] Failed to push to DLQ:",
          dlqErr.message,
        );
      }
    }
  });

  console.log("[NotificationWorker] Started");
  return notificationWorker;
};

module.exports = {
  startNotificationWorker,
  notificationWorker: () => notificationWorker,
};
