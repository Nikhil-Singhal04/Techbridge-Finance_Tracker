const express = require('express');
const analyticsController = require('../controllers/analytics.controller');
const authenticate = require('../middleware/auth');
const { analyticsLimiter } = require('../middleware/rateLimiters');
const { cacheMiddleware, getAnalyticsCacheKey } = require('../services/cache');

const router = express.Router();

// All analytics routes require authentication and are rate-limited
router.use(authenticate);
router.use(analyticsLimiter);

// Cache builder helper: analytics:{userId}:{endpoint}:{paramsHash}
const analyticsCacheBuilder = (endpoint) => (req) => {
  const targetUserId =
    req.user.role === 'admin' && req.query.userId
      ? req.query.userId
      : req.user.id;
  return getAnalyticsCacheKey(targetUserId, endpoint, req.query);
};

// 15 minutes TTL = 900 seconds
const ANALYTICS_CACHE_TTL = 900;

// GET /api/analytics/summary
router.get(
  '/summary',
  cacheMiddleware(analyticsCacheBuilder('summary'), ANALYTICS_CACHE_TTL),
  analyticsController.getSummary
);

// GET /api/analytics/monthly
router.get(
  '/monthly',
  cacheMiddleware(analyticsCacheBuilder('monthly'), ANALYTICS_CACHE_TTL),
  analyticsController.getMonthly
);

// GET /api/analytics/yearly
router.get(
  '/yearly',
  cacheMiddleware(analyticsCacheBuilder('yearly'), ANALYTICS_CACHE_TTL),
  analyticsController.getYearly
);

// GET /api/analytics/category-breakdown
router.get(
  '/category-breakdown',
  cacheMiddleware(analyticsCacheBuilder('category-breakdown'), ANALYTICS_CACHE_TTL),
  analyticsController.getCategoryBreakdown
);

// GET /api/analytics/trends
router.get(
  '/trends',
  cacheMiddleware(analyticsCacheBuilder('trends'), ANALYTICS_CACHE_TTL),
  analyticsController.getTrends
);

module.exports = router;
