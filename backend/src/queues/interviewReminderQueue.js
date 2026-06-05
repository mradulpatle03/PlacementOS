const { createQueue, QUEUE_NAMES } = require("../config/queues");

const interviewReminderQueue = createQueue(QUEUE_NAMES.INTERVIEW_REMINDER);

/**
 * Schedule both reminder jobs for an interview.
 *
 * @param {object} interview  - populated Interview doc (plain object)
 * @param {string} studentEmail
 * @param {string} studentName
 */
const scheduleInterviewReminders = async (
  interview,
  studentEmail,
  studentName,
) => {
  const scheduledAt = new Date(interview.scheduledAt);
  const now = new Date();

  const delay24h = scheduledAt.getTime() - now.getTime() - 24 * 60 * 60 * 1000;
  const delay1h = scheduledAt.getTime() - now.getTime() - 60 * 60 * 1000;

  const basePayload = {
    interviewId: interview._id.toString(),
    studentEmail,
    studentName,
    scheduledAt: interview.scheduledAt,
    round: interview.round,
    driveTitle: interview.drive?.title || "",
    companyName: interview.drive?.company?.name || "",
    mode: interview.mode,
    venue: interview.venue || "",
    meetingLink: interview.meetingLink || "",
  };

  const jobs = [];

  // 24h reminder — only schedule if more than 24h away
  if (delay24h > 0) {
    const job24h = await interviewReminderQueue.add(
      "reminder-24h",
      { ...basePayload, reminderType: "24h" },
      {
        delay: delay24h,
        jobId: `interview-reminder-24h-${interview._id}`, // deduplicate
        attempts: 3,
        backoff: { type: "exponential", delay: 10000 },
      },
    );
    jobs.push({
      type: "24h",
      jobId: job24h.id,
      firesAt: new Date(now.getTime() + delay24h),
    });
    console.log(
      `[ReminderQueue] 24h reminder scheduled for interview ${interview._id}`,
      `fires at ${new Date(now.getTime() + delay24h).toISOString()}`,
    );
  }

  // 1h reminder — only schedule if more than 1h away
  if (delay1h > 0) {
    const job1h = await interviewReminderQueue.add(
      "reminder-1h",
      { ...basePayload, reminderType: "1h" },
      {
        delay: delay1h,
        jobId: `interview-reminder-1h-${interview._id}`,
        attempts: 3,
        backoff: { type: "exponential", delay: 10000 },
      },
    );
    jobs.push({
      type: "1h",
      jobId: job1h.id,
      firesAt: new Date(now.getTime() + delay1h),
    });
    console.log(
      `[ReminderQueue] 1h reminder scheduled for interview ${interview._id}`,
      `fires at ${new Date(now.getTime() + delay1h).toISOString()}`,
    );
  }

  return jobs;
};

/**
 * Remove scheduled reminders for an interview (on cancel / reschedule).
 * BullMQ jobIds are deterministic so we can remove by ID.
 */
const cancelInterviewReminders = async (interviewId) => {
  const id = interviewId.toString();
  try {
    await Promise.allSettled([
      interviewReminderQueue.remove(`interview-reminder-24h-${id}`),
      interviewReminderQueue.remove(`interview-reminder-1h-${id}`),
    ]);
    console.log(`[ReminderQueue] Reminders cancelled for interview ${id}`);
  } catch (err) {
    console.error(
      `[ReminderQueue] Failed to cancel reminders for ${id}:`,
      err.message,
    );
  }
};

module.exports = {
  interviewReminderQueue,
  scheduleInterviewReminders,
  cancelInterviewReminders,
};
