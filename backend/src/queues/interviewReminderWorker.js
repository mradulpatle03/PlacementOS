const { Worker, QUEUE_NAMES, connection } = require('../config/queues');
const { sendMail } = require('../utils/mailer');
const Interview = require('../models/Interview');

// ── Email template helpers ────────────────────────────────────

const ROUND_LABEL = {
  interview_1: 'Interview Round 1',
  interview_2: 'Interview Round 2',
  hr:          'HR Round',
};

const buildReminderEmail = (data, type) => {
  const { studentName, scheduledAt, round, driveTitle, companyName, mode, venue, meetingLink } = data;

  const roundLabel  = ROUND_LABEL[round] || round;
  const dateStr     = new Date(scheduledAt).toLocaleString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long',
    day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const timeLabel   = type === '24h' ? '24 hours' : '1 hour';
  const urgentColor = type === '1h'  ? '#ef4444'  : '#4f46e5';

  const locationBlock = mode === 'online' && meetingLink
    ? `<p>🔗 <a href="${meetingLink}" style="color:#4f46e5">Join Meeting Link</a></p>`
    : mode === 'offline' && venue
      ? `<p>📍 Venue: <strong>${venue}</strong></p>`
      : mode === 'hybrid'
        ? `<p>📍 Venue: <strong>${venue || 'TBD'}</strong></p>
           ${meetingLink ? `<p>🔗 <a href="${meetingLink}" style="color:#4f46e5">Join Meeting Link</a></p>` : ''}`
        : '';

  return {
    subject: `⏰ Reminder: Your ${roundLabel} with ${companyName} is in ${timeLabel}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px">
        <h2 style="color:${urgentColor};margin-bottom:4px">PlacementOS</h2>
        <p style="color:#6b7280;margin-top:0">Interview Reminder</p>

        <div style="background:#f9fafb;border-radius:12px;padding:20px;margin:20px 0;border-left:4px solid ${urgentColor}">
          <p style="margin:0 0 8px 0">Hi <strong>${studentName}</strong>,</p>
          <p style="margin:0">
            This is a reminder that your <strong>${roundLabel}</strong> for
            <strong>${driveTitle}</strong> at <strong>${companyName}</strong>
            is scheduled in <strong style="color:${urgentColor}">${timeLabel}</strong>.
          </p>
        </div>

        <div style="margin:16px 0">
          <p>📅 <strong>Date & Time:</strong> ${dateStr}</p>
          <p>🎯 <strong>Round:</strong> ${roundLabel}</p>
          <p>💼 <strong>Company:</strong> ${companyName}</p>
          <p style="text-transform:capitalize">📡 <strong>Mode:</strong> ${mode}</p>
          ${locationBlock}
        </div>

        <div style="background:#fef3c7;border-radius:8px;padding:12px;margin:16px 0">
          <p style="margin:0;font-size:13px;color:#92400e">
            💡 <strong>Tips:</strong> Test your internet connection, keep your resume handy,
            and join 5 minutes early.
          </p>
        </div>

        <p style="color:#6b7280;font-size:12px;margin-top:24px">
          This is an automated reminder from PlacementOS. Do not reply to this email.
        </p>
      </div>
    `,
  };
};

// ── Worker ────────────────────────────────────────────────────

let reminderWorker = null;

const startInterviewReminderWorker = () => {
  if (reminderWorker) return reminderWorker;

  reminderWorker = new Worker(
    QUEUE_NAMES.INTERVIEW_REMINDER,
    async (job) => {
      const { interviewId, studentEmail, studentName, reminderType } = job.data;

      console.log(
        `[ReminderWorker] Processing ${reminderType} reminder for interview ${interviewId}`
      );

      // verify interview still exists and hasn't been cancelled
      const interview = await Interview.findById(interviewId).lean();

      if (!interview) {
        console.log(`[ReminderWorker] Interview ${interviewId} not found — skipping`);
        return;   // job completes without error — no retry needed
      }

      if (interview.status === 'cancelled') {
        console.log(`[ReminderWorker] Interview ${interviewId} cancelled — skipping reminder`);
        return;
      }

      // check reminder not already sent (idempotency)
      const sentKey = reminderType === '24h' ? 'reminders.sent24h' : 'reminders.sent1h';
      const alreadySent = reminderType === '24h'
        ? interview.reminders?.sent24h
        : interview.reminders?.sent1h;

      if (alreadySent) {
        console.log(`[ReminderWorker] ${reminderType} reminder already sent for ${interviewId} — skipping`);
        return;
      }

      // build + send email
      const { subject, html } = buildReminderEmail(job.data, reminderType);
      await sendMail({ to: studentEmail, subject, html });

      // mark as sent on the Interview doc
      await Interview.findByIdAndUpdate(interviewId, {
        $set: { [sentKey]: true },
      });

      console.log(
        `[ReminderWorker] ${reminderType} reminder sent to ${studentEmail} for interview ${interviewId}`
      );
    },
    {
      connection,
      concurrency: 10,
    }
  );

  reminderWorker.on('completed', (job) => {
    console.log(`[ReminderWorker] Job ${job.id} (${job.name}) completed`);
  });

  reminderWorker.on('failed', (job, err) => {
    console.error(
      `[ReminderWorker] Job ${job?.id} failed (attempt ${job?.attemptsMade}/${job?.opts?.attempts}):`,
      err.message
    );
  });

  console.log('[ReminderWorker] Started');
  return reminderWorker;
};

module.exports = { startInterviewReminderWorker, reminderWorker: () => reminderWorker };