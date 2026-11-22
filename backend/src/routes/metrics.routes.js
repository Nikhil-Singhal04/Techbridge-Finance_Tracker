const express = require('express');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const { getCacheMetrics } = require('../services/cache');

const router = express.Router();

// GET /api/metrics/cache (admin only)
router.get('/cache', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const metrics = await getCacheMetrics();
    res.status(200).json({
      success: true,
      data: metrics,
      message: 'Cache metrics retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
