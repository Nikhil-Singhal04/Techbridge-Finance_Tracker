const express = require('express');
const categoriesController = require('../controllers/categories.controller');
const authenticate = require('../middleware/auth');

const router = express.Router();

// GET /api/categories (accessible to all authenticated roles)
router.get('/', authenticate, categoriesController.getCategories);

module.exports = router;
