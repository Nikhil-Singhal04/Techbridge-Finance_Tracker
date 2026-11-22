const transactionsService = require('../services/transactions.service');

/**
 * List transactions with filtering, search, and pagination
 */
const listTransactions = async (req, res, next) => {
  try {
    const result = await transactionsService.getTransactions({
      currentUser: req.user,
      queryParams: req.query,
    });

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      message: 'Transactions retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get transaction by ID
 */
const getTransaction = async (req, res, next) => {
  try {
    const transaction = await transactionsService.getTransactionById(
      parseInt(req.params.id, 10),
      req.user
    );

    res.status(200).json({
      success: true,
      data: transaction,
      message: 'Transaction retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Create a new transaction
 */
const createTransaction = async (req, res, next) => {
  try {
    const { type, amount, categoryId, description, transactionDate, date, userId } = req.body;

    // Admin can specify target user; standard user always creates for themselves
    const targetUserId = req.user.role === 'admin' && userId ? parseInt(userId, 10) : req.user.id;

    const newTransaction = await transactionsService.createTransaction({
      userId: targetUserId,
      type,
      amount,
      categoryId,
      description,
      transactionDate: transactionDate || date,
    });

    res.status(201).json({
      success: true,
      data: newTransaction,
      message: 'Transaction created successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update transaction by ID
 */
const updateTransaction = async (req, res, next) => {
  try {
    const { type, amount, categoryId, description, transactionDate, date } = req.body;

    const updated = await transactionsService.updateTransaction(
      parseInt(req.params.id, 10),
      {
        type,
        amount,
        categoryId,
        description,
        transactionDate: transactionDate || date,
      },
      req.user
    );

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Transaction updated successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete transaction by ID
 */
const deleteTransaction = async (req, res, next) => {
  try {
    await transactionsService.deleteTransaction(parseInt(req.params.id, 10), req.user);

    res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
};
