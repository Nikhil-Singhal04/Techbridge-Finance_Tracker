const express = require('express');
const transactionsController = require('../controllers/transactions.controller');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');

const router = express.Router();

// All transaction routes require authentication
router.use(authenticate);

// GET /api/transactions - All roles can view their own transactions
router.get('/', transactionsController.listTransactions);

// GET /api/transactions/:id - All roles can view details of their own transaction
router.get('/:id', transactionsController.getTransaction);

// POST /api/transactions - Only admin and user (read-only gets 403)
router.post('/', authorize('admin', 'user'), transactionsController.createTransaction);

// PUT /api/transactions/:id - Only admin and user (owner or admin only)
router.put('/:id', authorize('admin', 'user'), transactionsController.updateTransaction);

// DELETE /api/transactions/:id - Only admin and user (owner or admin only)
router.delete('/:id', authorize('admin', 'user'), transactionsController.deleteTransaction);

module.exports = router;
