const Redis = require('ioredis');
const { REDIS_URL } = require('./env');

const redis = new Redis(REDIS_URL, {
  lazyConnect: true, // don't crash app if redis is down
  maxRetriesPerRequest: 1,
});

redis.on('connect', () => {
  console.log('Redis connected');
});

redis.on('error', (err) => {
  console.log('Redis error:', err.message);
  // not crashing — redis is used for cache/sessions, app can limp without it
});

const connectRedis = async () => {
  try {
    await redis.connect();
  } catch (err) {
    console.log('Redis connection failed:', err.message);
  }
};

module.exports = { redis, connectRedis };