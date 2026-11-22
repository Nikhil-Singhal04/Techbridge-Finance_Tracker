const crypto = require('crypto');
const redisClient = require('../db/redis');

/**
 * Check if Redis client is currently connected and ready
 */
const isRedisReady = () => {
  return redisClient && redisClient.status === 'ready';
};

/**
 * Retrieve cached value by key
 * Gracefully returns null if Redis is unavailable
 */
const getCache = async (key) => {
  if (!isRedisReady()) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.warn(`[Cache Warning] Failed to get cache for key '${key}':`, err.message);
    return null;
  }
};

/**
 * Set cache value with TTL in seconds
 * Fails open if Redis is down
 */
const setCache = async (key, value, ttlSeconds) => {
  if (!isRedisReady()) return false;
  try {
    const serialized = JSON.stringify(value);
    if (ttlSeconds && ttlSeconds > 0) {
      await redisClient.set(key, serialized, 'EX', ttlSeconds);
    } else {
      await redisClient.set(key, serialized);
    }
    return true;
  } catch (err) {
    console.warn(`[Cache Warning] Failed to set cache for key '${key}':`, err.message);
    return false;
  }
};

/**
 * Delete cache key
 */
const delCache = async (key) => {
  if (!isRedisReady()) return false;
  try {
    await redisClient.del(key);
    return true;
  } catch (err) {
    console.warn(`[Cache Warning] Failed to delete cache for key '${key}':`, err.message);
    return false;
  }
};

/**
 * Delete keys matching a pattern using SCAN (not KEYS to prevent blocking)
 */
const delByPattern = async (pattern) => {
  if (!isRedisReady()) return false;
  try {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys && keys.length > 0) {
        await redisClient.del(...keys);
      }
    } while (cursor !== '0');
    return true;
  } catch (err) {
    console.warn(`[Cache Warning] Failed to delete keys matching pattern '${pattern}':`, err.message);
    return false;
  }
};

/**
 * Increment metrics counters in Redis
 */
const incrementMetric = async (metricKey) => {
  if (!isRedisReady()) return;
  try {
    await redisClient.incr(metricKey);
  } catch (err) {
    // Fail silently on metric recording
  }
};

/**
 * Get hit/miss cache metrics from Redis
 */
const getCacheMetrics = async () => {
  if (!isRedisReady()) {
    return { hits: 0, misses: 0, hitRate: '0%' };
  }
  try {
    const [hitsStr, missesStr] = await Promise.all([
      redisClient.get('metrics:cache:hits'),
      redisClient.get('metrics:cache:misses'),
    ]);
    const hits = parseInt(hitsStr || '0', 10);
    const misses = parseInt(missesStr || '0', 10);
    const total = hits + misses;
    const hitRate = total > 0 ? `${((hits / total) * 100).toFixed(2)}%` : '0%';
    return { hits, misses, hitRate };
  } catch (err) {
    return { hits: 0, misses: 0, hitRate: '0%' };
  }
};

/**
 * Create analytics cache key: analytics:{userId}:{endpoint}:{paramsHash}
 */
const getAnalyticsCacheKey = (userId, endpoint, queryParams = {}) => {
  const sortedParams = Object.keys(queryParams)
    .sort()
    .reduce((acc, key) => {
      acc[key] = queryParams[key];
      return acc;
    }, {});
  const paramsHash = crypto
    .createHash('md5')
    .update(JSON.stringify(sortedParams))
    .digest('hex')
    .slice(0, 10);
  return `analytics:${userId}:${endpoint}:${paramsHash}`;
};

/**
 * Invalidate all cached analytics for a user
 */
const invalidateUserAnalyticsCache = async (userId) => {
  if (!userId) return;
  await delByPattern(`analytics:${userId}:*`);
};

/**
 * Reusable cache middleware
 * @param {Function} keyBuilder - (req) => string
 * @param {number} ttlSeconds - TTL in seconds
 */
const cacheMiddleware = (keyBuilder, ttlSeconds) => {
  return async (req, res, next) => {
    let cacheKey;
    try {
      cacheKey = keyBuilder(req);
    } catch {
      res.setHeader('X-Cache', 'MISS');
      return next();
    }

    if (!isRedisReady()) {
      res.setHeader('X-Cache', 'MISS');
      return next();
    }

    try {
      const cached = await getCache(cacheKey);
      if (cached) {
        await incrementMetric('metrics:cache:hits');
        res.setHeader('X-Cache', 'HIT');
        return res.status(200).json(cached);
      }

      // Cache Miss
      await incrementMetric('metrics:cache:misses');
      res.setHeader('X-Cache', 'MISS');

      // Intercept res.json to store successful response in cache
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          setCache(cacheKey, body, ttlSeconds).catch(() => {});
        }
        return originalJson(body);
      };

      next();
    } catch (err) {
      console.warn(`[Cache Middleware Error]:`, err.message);
      res.setHeader('X-Cache', 'MISS');
      next();
    }
  };
};

module.exports = {
  isRedisReady,
  getCache,
  setCache,
  delCache,
  delByPattern,
  incrementMetric,
  getCacheMetrics,
  getAnalyticsCacheKey,
  invalidateUserAnalyticsCache,
  cacheMiddleware,
};
