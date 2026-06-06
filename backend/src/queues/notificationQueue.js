const { createQueue, QUEUE_NAMES } = require('../config/queues');

const notificationQueue = createQueue(QUEUE_NAMES.NOTIFICATION);
const notificationDLQ   = createQueue(QUEUE_NAMES.NOTIFICATION_DLQ);

/**
 * Core enqueue function.
 *
 * @param {object} payload
 * @param {string} payload.recipientId
 * @param {string} [payload.recipientEmail]   - required when channels.email = true
 * @param {string} payload.type               - notification type enum
 * @param {string} payload.title
 * @param {string} payload.message
 * @param {object} [payload.metadata]         - deep-link data { driveId, link, ... }
 * @param {object} [payload.channels]         - { inApp, email }
 * @param {object} [payload.extra]            - template-specific data (studentName, ctc, etc.)
 */
const addNotificationJob = (payload, opts = {}) =>
  notificationQueue.add('send-notification', payload, opts);

// ─────────────────────────────────────────────────────────────
// Convenience helpers
// ─────────────────────────────────────────────────────────────

const notifyDriveOpened = (recipientId, recipientEmail, { drive, company, studentName, ctc }) =>
  addNotificationJob({
    recipientId,
    recipientEmail,
    type:    'drive_opened',
    title:   `New Drive: ${company.name}`,
    message: `${company.name} has opened a new placement drive — "${drive.title}". Apply before the deadline.`,
    metadata: {
      driveId:     drive._id.toString(),
      companyName: company.name,
      link:        `/drives/${drive._id}`,
    },
    channels: { inApp: true, email: true },
    extra: {
      studentName,
      driveTitle:  drive.title,
      companyName: company.name,
      ctc:         ctc || null,
      deadline:    drive.applicationDeadline || null,
      driveId:     drive._id.toString(),
    },
  });

const notifyApplicationStatus = (
  recipientId,
  recipientEmail,
  { studentName, drive, company, newStage, stageLabel, note }
) =>
  addNotificationJob({
    recipientId,
    recipientEmail,
    type:    'application_status',
    title:   `Application Update — ${company.name}`,
    message: `Your application for "${drive.title}" at ${company.name} has moved to: ${stageLabel}.`,
    metadata: {
      driveId:     drive._id ? drive._id.toString() : drive.toString(),
      companyName: company.name,
      link:        '/applications',
    },
    channels: { inApp: true, email: true },
    extra: {
      studentName,
      driveTitle:  drive.title || '',
      companyName: company.name,
      newStage,
      note:        note || '',
    },
  });

const notifyOAReminderJob = (
  recipientId,
  recipientEmail,
  { studentName, company, assessment }
) =>
  addNotificationJob({
    recipientId,
    recipientEmail,
    type:    'oa_reminder',
    title:   `OA Reminder: ${company.name} — ${assessment.title}`,
    message: `Your Online Assessment for ${company.name} opens soon. Be ready!`,
    metadata: {
      assessmentId: assessment._id.toString(),
      companyName:  company.name,
      link:         `/assessments/${assessment._id}/take`,
    },
    channels: { inApp: true, email: true },
    extra: {
      studentName,
      companyName:    company.name,
      assessmentTitle: assessment.title,
      startsAt:       assessment.startsAt || null,
      endsAt:         assessment.endsAt   || null,
    },
  });

const notifyOfferReleased = (
  recipientId,
  recipientEmail,
  { studentName, drive, company, deadline }
) =>
  addNotificationJob({
    recipientId,
    recipientEmail,
    type:    'offer_released',
    title:   `Offer Letter — ${company.name}`,
    message: `Your offer letter for "${drive.title}" at ${company.name} is ready. Please review and respond.`,
    metadata: {
      driveId:     drive._id ? drive._id.toString() : drive.toString(),
      companyName: company.name,
      link:        '/applications',
    },
    channels: { inApp: true, email: true },
    extra: {
      studentName,
      driveTitle:  drive.title || '',
      companyName: company.name,
      deadline:    deadline || null,
    },
  });

const notifyResultDeclared = (
  recipientId,
  recipientEmail,
  { studentName, drive, company, placed }
) =>
  addNotificationJob({
    recipientId,
    recipientEmail,
    type:    'result_declared',
    title:   `Results Declared — ${company.name}`,
    message: placed
      ? `Congratulations! You have been placed at ${company.name}.`
      : `Results for "${drive.title}" at ${company.name} have been declared.`,
    metadata: {
      driveId:     drive._id ? drive._id.toString() : drive.toString(),
      companyName: company.name,
      link:        '/applications',
    },
    channels: { inApp: true, email: true },
    extra: {
      studentName,
      driveTitle:  drive.title || '',
      companyName: company.name,
      placed,
    },
  });

const notifyGeneral = (
  recipientId,
  { title, message, link, linkLabel, recipientEmail, recipientName }
) =>
  addNotificationJob({
    recipientId,
    recipientEmail: recipientEmail || null,
    type:    'general',
    title,
    message,
    metadata: { link: link || null },
    channels: { inApp: true, email: !!recipientEmail },
    extra: { recipientName: recipientName || null, linkLabel: linkLabel || null },
  });

module.exports = {
  notificationQueue,
  notificationDLQ,
  addNotificationJob,
  notifyDriveOpened,
  notifyApplicationStatus,
  notifyOAReminderJob,
  notifyOfferReleased,
  notifyResultDeclared,
  notifyGeneral,
};