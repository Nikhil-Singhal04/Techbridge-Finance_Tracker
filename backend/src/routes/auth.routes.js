const express = require('express');
const authController = require('../controllers/auth.controller');
const authenticate = require('../middleware/auth');
const { registerValidation, loginValidation } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

// Public routes with rate limiting (5 req / 15 min)
router.post('/register', authLimiter, registerValidation, authController.register);
router.post('/login', authLimiter, loginValidation, authController.login);

// Protected routes
router.get('/me', authenticate, authController.getMe);

module.exports = router;
