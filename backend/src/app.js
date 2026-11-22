const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config');
const { pool } = require('./db/pool');
const redisClient = require('./db/redis');
const sanitizeInput = require('./middleware/sanitize');
const AppError = require('./utils/AppError');
const errorHandler = require('./middleware/errorHandler');
const apiRoutes = require('./routes');
const { swaggerUi, swaggerSpec } = require('./docs/swagger');

const app = express();

// Disable X-Powered-By header for security
app.disable('x-powered-by');

// Security HTTP headers (disable CSP for swagger-ui assets compatibility)
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// CORS configuration
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  })
);

// Body parser with size limit to prevent payload attacks
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Strip HTML/script tags from req.body, req.query, and req.params (XSS sanitization)
app.use(sanitizeInput);

// Request logging in non-test mode
if (config.env !== 'test') {
  app.use(morgan('dev'));
}

// Swagger API Documentation routes
app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoint (verifies DB and Redis)
app.get('/api/health', async (req, res) => {
  const healthStatus = {
    status: 'OK',
    db: 'disconnected',
    redis: 'disconnected',
    timestamp: new Date().toISOString(),
  };

  let hasError = false;

  // 1. Check PostgreSQL
  try {
    const dbRes = await pool.query('SELECT 1 AS alive');
    if (dbRes.rows[0]?.alive === 1) {
      healthStatus.db = 'connected';
    }
  } catch (err) {
    healthStatus.db = `error: ${err.message}`;
    hasError = true;
  }

  // 2. Check Redis
  try {
    if (redisClient && redisClient.status === 'ready') {
      const pong = await redisClient.ping();
      if (pong === 'PONG') {
        healthStatus.redis = 'connected';
      }
    } else if (redisClient) {
      healthStatus.redis = `status: ${redisClient.status}`;
    }
  } catch (err) {
    healthStatus.redis = `error: ${err.message}`;
    hasError = true;
  }

  if (hasError) {
    return res.status(503).json({
      success: false,
      data: healthStatus,
      message: 'One or more underlying services are unhealthy',
    });
  }

  res.status(200).json({
    success: true,
    data: healthStatus,
    message: 'Backend service and data stores are healthy',
  });
});

// Mount main API routes under /api
app.use('/api', apiRoutes);

// 404 Route handler for unmapped endpoints
app.all('*', (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found on this server`, 404, 'NOT_FOUND'));
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
