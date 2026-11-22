const config = require('./config');
const app = require('./app');
const { pool } = require('./db/pool');
const redisClient = require('./db/redis');

const PORT = config.port;

const server = app.listen(PORT, () => {
  console.log(`[Server] Finance Tracker API running in ${config.env} mode on port ${PORT}`);
  console.log(`[Server] Health check available at: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  console.log(`\n[Server] Received ${signal}. Closing HTTP server and database connections...`);
  
  server.close(async () => {
    console.log('[Server] HTTP server closed.');

    try {
      await pool.end();
      console.log('[Server] PostgreSQL pool closed.');
    } catch (err) {
      console.error('[Server] Error closing PostgreSQL pool:', err.message);
    }

    try {
      if (redisClient) {
        await redisClient.quit();
        console.log('[Server] Redis client disconnected.');
      }
    } catch (err) {
      console.error('[Server] Error closing Redis connection:', err.message);
    }

    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
