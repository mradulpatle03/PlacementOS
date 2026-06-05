const { createQueue, QUEUE_NAMES } = require('../config/queues');

const emailQueue = createQueue(QUEUE_NAMES.EMAIL);

/**
 * Add an email job to the queue.
 *
 * @param {{ to, subject, html }} payload
 * @param {object} opts  - BullMQ job options (delay, jobId, etc.)
 */
const addEmailJob = async (payload, opts = {}) => {
  return emailQueue.add('send-email', payload, opts);
};

module.exports = { emailQueue, addEmailJob };