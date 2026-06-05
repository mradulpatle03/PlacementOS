const { Queue, Worker, QueueEvents } = require('bullmq');
const { REDIS_URL } = require('./env');

// BullMQ needs a plain ioredis connection config, not an existing client
// Parse the REDIS_URL into host/port so BullMQ can create its own connections
const parseRedisUrl = (url) => {
  try {
    const u = new URL(url);
    return {
      host: u.hostname || '127.0.0.1',
      port: Number(u.port) || 6379,
      password: u.password || undefined,
      db: Number(u.pathname?.slice(1)) || 0,
    };
  } catch {
    return { host: '127.0.0.1', port: 6379 };
  }
};

const connection = parseRedisUrl(REDIS_URL);

// ── Named queues ──────────────────────────────────────────────
const QUEUE_NAMES = {
  EMAIL:              'email',
  INTERVIEW_REMINDER: 'interview-reminder',
};

/**
 * Create a BullMQ Queue instance.
 * @param {string} name
 */
const createQueue = (name) =>
  new Queue(name, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 200 },
    },
  });

module.exports = { connection, QUEUE_NAMES, createQueue, Queue, Worker, QueueEvents };