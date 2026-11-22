const express = require('express');
const authRoutes = require('./auth.routes');
const categoriesRoutes = require('./categories.routes');
const transactionsRoutes = require('./transactions.routes');
const analyticsRoutes = require('./analytics.routes');
const usersRoutes = require('./users.routes');
const metricsRoutes = require('./metrics.routes');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');

const router = express.Router();

// Auth routes (/api/auth)
router.use('/auth', authRoutes);

// Categories routes (/api/categories)
router.use('/categories', categoriesRoutes);

// Transactions routes (/api/transactions)
router.use('/transactions', transactionsRoutes);

// Analytics routes (/api/analytics)
router.use('/analytics', analyticsRoutes);

// Admin users management routes (/api/users)
router.use('/users', usersRoutes);

// Metrics routes (/api/metrics)
router.use('/metrics', metricsRoutes);

// Test route to verify RBAC protection (admin only)
router.get('/admin-test', authenticate, authorize('admin'), (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      message: 'Admin access granted.',
      user: req.user,
    },
  });
});

module.exports = router;
