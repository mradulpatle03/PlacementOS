const { redis } = require("../config/redis");

const DEFAULT_TTL = 5 * 60; // 5 minutes
const STUDENT_TTL = 2 * 60; // 2 minutes  — student data changes more often
const DRIVE_TTL = 60; // 60 seconds — active drive funnel is very live

/**
 * withCache(key, ttl, computeFn)
 *
 * Try Redis first. On HIT return parsed value.
 * On MISS compute, store in Redis, return value.
 * On any Redis error fall through to computeFn (fail-open).
 */
const withCache = async (key, ttl = DEFAULT_TTL, computeFn) => {
  // attempt cache read
  try {
    const cached = await redis.get(key);
    if (cached !== null) {
      console.log(`[Cache HIT]  ${key}`);
      return JSON.parse(cached);
    }
  } catch (err) {
    console.log(`[Cache] Redis GET failed (${key}):`, err.message);
  }

  // compute fresh value
  const data = await computeFn();

  // attempt cache write
  try {
    await redis.set(key, JSON.stringify(data), "EX", ttl);
    console.log(`[Cache SET]  ${key}  TTL=${ttl}s`);
  } catch (err) {
    console.log(`[Cache] Redis SET failed (${key}):`, err.message);
  }

  return data;
};

/**
 * invalidateCache(pattern)
 * Delete all keys matching a glob pattern.
 */
const invalidateCache = async (pattern) => {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(
        `[Cache] Invalidated ${keys.length} key(s) for pattern "${pattern}"`,
      );
    }
  } catch (err) {
    console.log(`[Cache] Invalidation failed for "${pattern}":`, err.message);
  }
};

/**
 * getCacheStats()
 * Returns all current analytics cache keys and their TTLs.
 * Used by the /analytics/cache/status endpoint.
 */
const getCacheStats = async () => {
  try {
    const keys = await redis.keys("analytics:*");
    if (keys.length === 0) return { keys: [], count: 0 };

    const ttls = await Promise.all(
      keys.map(async (k) => ({
        key: k,
        ttlSeconds: await redis.ttl(k),
      })),
    );

    return {
      count: keys.length,
      keys: ttls.sort((a, b) => a.key.localeCompare(b.key)),
    };
  } catch (err) {
    console.log("[Cache] getCacheStats failed:", err.message);
    return { count: 0, keys: [], error: err.message };
  }
};

/**
 * Cache key builders — all key strings in one place.
 */
const CACHE_KEYS = {
  tpo: (year) => `analytics:tpo:${year || "all"}`,
  branch: (b, year) => `analytics:branch:${b}:${year || "all"}`,
  company: (id) => `analytics:company:${id}`,
  studentMe: (userId) => `analytics:student:${userId}`,
  overallFunnel: (year) => `analytics:funnel:overall:${year || "all"}`,
  driveFunnel: (driveId) => `analytics:funnel:drive:${driveId}`,
  driveConversion: (limit) => `analytics:funnel:drives:${limit || 10}`,
};

module.exports = {
  withCache,
  invalidateCache,
  getCacheStats,
  CACHE_KEYS,
  DEFAULT_TTL,
  STUDENT_TTL,
  DRIVE_TTL,
};
