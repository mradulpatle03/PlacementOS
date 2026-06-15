const { createQueue, QUEUE_NAMES } = require("../config/queues");

// reuse EMAIL queue name slot — add REPORT to QUEUE_NAMES first
// Since QUEUE_NAMES is defined in queues.js, we extend it here safely
const REPORT_QUEUE_NAME = "report-generation";

const reportQueue = createQueue(REPORT_QUEUE_NAME);

/**
 * Add a report generation job to the queue.
 *
 * @param {object} payload
 * @param {string} payload.reportId   - Report._id (string)
 * @param {string} payload.type       - report type enum
 * @param {object} payload.filters    - filters object from Report
 * @param {string} payload.format     - 'xlsx' | 'pdf'
 * @param {string} payload.notifyEmail - email to notify when done
 */
const addReportJob = (payload, opts = {}) =>
  reportQueue.add("generate-report", payload, {
    attempts: 2,
    backoff: { type: "exponential", delay: 10000 },
    ...opts,
  });

module.exports = { reportQueue, addReportJob, REPORT_QUEUE_NAME };
