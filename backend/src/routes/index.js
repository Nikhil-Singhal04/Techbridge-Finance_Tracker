const express = require('express');
const authRoutes = require('./auth.routes');
const categoriesRoutes = require('./categories.routes');
const transactionsRoutes = require('./transactions.routes');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');

const router = express.Router();

// Auth routes
router.use('/auth', authRoutes);

// Categories routes
router.use('/categories', categoriesRoutes);

// Transactions routes
router.use('/transactions', transactionsRoutes);

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
