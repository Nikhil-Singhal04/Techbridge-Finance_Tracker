const express = require('express');
const categoriesController = require('../controllers/categories.controller');
const authenticate = require('../middleware/auth');
const { cacheMiddleware } = require('../services/cache');

const router = express.Router();

// Cache categories for 3600s (1 hour) with key categories:{type|all}
const categoriesKeyBuilder = (req) => {
  const type = req.query.type || 'all';
  return `categories:${type}`;
};

// GET /api/categories (accessible to all roles, cached for 1 hour)
router.get(
  '/',
  authenticate,
  cacheMiddleware(categoriesKeyBuilder, 3600),
  categoriesController.getCategories
);

module.exports = router;
