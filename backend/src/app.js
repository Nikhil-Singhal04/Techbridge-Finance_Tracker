const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config');
const { pool } = require('./db/pool');
const redisClient = require('./db/redis');
const AppError = require('./utils/AppError');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security HTTP headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: config.clientUrl,
  credentials: true,
}));

// Body parser with size limit to prevent payload attacks
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Request logging
if (config.env !== 'test') {
  app.use(morgan('dev'));
}

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

// 404 Route handler
app.all('*', (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found on this server`, 404, 'NOT_FOUND'));
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
