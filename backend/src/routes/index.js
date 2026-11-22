const express = require('express');
const authRoutes = require('./auth.routes');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');

const router = express.Router();

// Mount auth routes
router.use('/auth', authRoutes);

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
