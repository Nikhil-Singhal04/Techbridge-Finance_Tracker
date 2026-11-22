const rateLimit = require('express-rate-limit');
const config = require('../config');

// Reusable handler to return consistent JSON 429 response
const rateLimitHandler = (message) => {
  return (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: message || 'Too many requests. Please try again later.',
      },
    });
  };
};

/**
 * Auth rate limiter: 5 requests per 15 minutes
 * Applied to /api/auth/login and /api/auth/register
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '60', 10),
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.rateLimit.disabled,
  handler: rateLimitHandler('Too many authentication attempts. Please try again after 15 minutes.'),
});

/**
 * Transactions rate limiter: 100 requests per 1 hour
 * Applied to /api/transactions
 */
const transactionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.TRANSACTION_RATE_LIMIT_MAX || '100', 10),
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.rateLimit.disabled,
  handler: rateLimitHandler('Transaction rate limit exceeded. Please try again after 1 hour.'),
});

/**
 * Analytics rate limiter: 50 requests per 1 hour
 * Applied to /api/analytics
 */
const analyticsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.ANALYTICS_RATE_LIMIT_MAX || '50', 10),
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.rateLimit.disabled,
  handler: rateLimitHandler('Analytics rate limit exceeded. Please try again after 1 hour.'),
});

module.exports = {
  authLimiter,
  transactionLimiter,
  analyticsLimiter,
};
