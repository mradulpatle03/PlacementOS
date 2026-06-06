const { Queue, Worker, QueueEvents } = require('bullmq');
const { REDIS_URL } = require('./env');

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

const QUEUE_NAMES = {
  EMAIL:              'email',
  INTERVIEW_REMINDER: 'interview-reminder',
  NOTIFICATION:       'notification',
  NOTIFICATION_DLQ:   'notification-dlq',
};

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