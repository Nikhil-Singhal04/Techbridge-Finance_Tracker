const express = require('express');
const authController = require('../controllers/auth.controller');
const authenticate = require('../middleware/auth');
const { registerValidation, loginValidation } = require('../middleware/validate');

const router = express.Router();

// Public routes
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);

// Protected routes
router.get('/me', authenticate, authController.getMe);

module.exports = router;
