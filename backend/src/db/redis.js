const Redis = require('ioredis');
const config = require('../config');

let redisClient = null;

try {
  redisClient = new Redis(config.redis.url, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 200, 2000);
      return delay;
    },
    reconnectOnError(err) {
      console.warn('[Redis Reconnect Notice]:', err.message);
      return true;
    },
    lazyConnect: false,
  });

  redisClient.on('connect', () => {
    console.log('[Redis] Connected successfully');
  });

  redisClient.on('ready', () => {
    console.log('[Redis] Client ready for commands');
  });

  redisClient.on('error', (err) => {
    console.error('[Redis Client Error]:', err.message);
  });
} catch (err) {
  console.error('[Redis Initialization Error]:', err.message);
}

module.exports = redisClient;
