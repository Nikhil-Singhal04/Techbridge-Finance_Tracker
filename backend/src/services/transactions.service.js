const { query } = require('../db/pool');
const AppError = require('../utils/AppError');
const categoriesService = require('./categories.service');

// Whitelist for allowed sorting columns and directions
const SORT_BY_MAP = {
  date: 't.transaction_date',
  amount: 't.amount',
  created_at: 't.created_at',
};

const SORT_ORDER_MAP = {
  asc: 'ASC',
  desc: 'DESC',
};

/**
 * Get paginated transactions with flexible filtering and sorting
 */
const getTransactions = async ({ currentUser, queryParams }) => {
  const page = Math.max(1, parseInt(queryParams.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit || '10', 10)));
  const offset = (page - 1) * limit;

  const conditions = [];
  const params = [];
  let paramIndex = 1;

  // 1. Ownership / RBAC filtering
  // Admin can view all or filter by specific userId; normal/read-only users view only their own
  if (currentUser.role === 'admin') {
    if (queryParams.userId) {
      conditions.push(`t.user_id = $${paramIndex++}`);
      params.push(parseInt(queryParams.userId, 10));
    } else if (queryParams.all !== 'true') {
      // Default admin view to their own transactions unless ?all=true is explicitly requested
      conditions.push(`t.user_id = $${paramIndex++}`);
      params.push(currentUser.id);
    }
  } else {
    // Regular user and read-only users are strictly scoped to their own transactions
    conditions.push(`t.user_id = $${paramIndex++}`);
    params.push(currentUser.id);
  }

  // 2. Type filter (income / expense)
  if (queryParams.type) {
    if (!['income', 'expense'].includes(queryParams.type)) {
      throw new AppError("Invalid type filter. Must be 'income' or 'expense'.", 400, 'INVALID_INPUT');
    }
    conditions.push(`t.type = $${paramIndex++}`);
    params.push(queryParams.type);
  }

  // 3. Category filter
  if (queryParams.categoryId) {
    conditions.push(`t.category_id = $${paramIndex++}`);
    params.push(parseInt(queryParams.categoryId, 10));
  }

  // 4. Date range filters
  if (queryParams.startDate) {
    conditions.push(`t.transaction_date >= $${paramIndex++}`);
    params.push(queryParams.startDate);
  }
  if (queryParams.endDate) {
    conditions.push(`t.transaction_date <= $${paramIndex++}`);
    params.push(queryParams.endDate);
  }

  // 5. Amount range filters
  if (queryParams.minAmount !== undefined && queryParams.minAmount !== '') {
    conditions.push(`t.amount >= $${paramIndex++}`);
    params.push(parseFloat(queryParams.minAmount));
  }
  if (queryParams.maxAmount !== undefined && queryParams.maxAmount !== '') {
    conditions.push(`t.amount <= $${paramIndex++}`);
    params.push(parseFloat(queryParams.maxAmount));
  }

  // 6. Search filter (ILIKE on description or category name)
  if (queryParams.search && queryParams.search.trim()) {
    const searchTerm = `%${queryParams.search.trim()}%`;
    conditions.push(`(t.description ILIKE $${paramIndex} OR c.name ILIKE $${paramIndex})`);
    params.push(searchTerm);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // 7. Sort Whitelisting
  const sortByCol = SORT_BY_MAP[queryParams.sortBy] || 't.transaction_date';
  const sortDirection = SORT_ORDER_MAP[queryParams.sortOrder?.toLowerCase()] || 'DESC';

  // Count total matching records
  const countSql = `
    SELECT COUNT(*)::int AS total
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    ${whereClause}
  `;
  const countResult = await query(countSql, params);
  const total = countResult.rows[0]?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  // Query records with pagination
  const dataParams = [...params, limit, offset];
  const dataSql = `
    SELECT 
      t.id,
      t.user_id,
      t.category_id,
      c.name AS category_name,
      t.type,
      t.amount::numeric::float AS amount,
      t.description,
      TO_CHAR(t.transaction_date, 'YYYY-MM-DD') AS transaction_date,
      t.created_at,
      t.updated_at
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    ${whereClause}
    ORDER BY ${sortByCol} ${sortDirection}, t.id DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;

  const dataResult = await query(dataSql, dataParams);

  return {
    data: dataResult.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
};

/**
 * Get single transaction by ID with permission check
 */
const getTransactionById = async (id, currentUser) => {
  const sql = `
    SELECT 
      t.id,
      t.user_id,
      t.category_id,
      c.name AS category_name,
      t.type,
      t.amount::numeric::float AS amount,
      t.description,
      TO_CHAR(t.transaction_date, 'YYYY-MM-DD') AS transaction_date,
      t.created_at,
      t.updated_at
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.id = $1
  `;
  const result = await query(sql, [id]);

  if (result.rows.length === 0) {
    throw new AppError('Transaction not found.', 404, 'NOT_FOUND');
  }

  const transaction = result.rows[0];

  // Only owner or admin may view
  if (currentUser.role !== 'admin' && transaction.user_id !== currentUser.id) {
    throw new AppError('Transaction not found.', 404, 'NOT_FOUND');
  }

  return transaction;
};

/**
 * Create new transaction
 */
const createTransaction = async ({ userId, type, amount, categoryId, description, transactionDate }) => {
  // Validate type
  if (!['income', 'expense'].includes(type)) {
    throw new AppError("Type must be either 'income' or 'expense'.", 400, 'INVALID_INPUT');
  }

  // Validate amount
  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    throw new AppError('Amount must be a positive number greater than 0.', 400, 'INVALID_INPUT');
  }

  // Validate category and ensure category type matches transaction type
  const category = await categoriesService.getCategoryById(categoryId);
  if (!category) {
    throw new AppError('Specified category does not exist.', 400, 'CATEGORY_NOT_FOUND');
  }
  if (category.type !== type) {
    throw new AppError(
      `Category '${category.name}' is of type '${category.type}', which does not match transaction type '${type}'.`,
      400,
      'CATEGORY_TYPE_MISMATCH'
    );
  }

  // Validate date
  if (!transactionDate || isNaN(new Date(transactionDate).getTime())) {
    throw new AppError('Valid transaction date (YYYY-MM-DD) is required.', 400, 'INVALID_INPUT');
  }

  // Validate description length
  if (description && description.length > 255) {
    throw new AppError('Description must be 255 characters or fewer.', 400, 'INVALID_INPUT');
  }

  const insertSql = `
    INSERT INTO transactions (user_id, category_id, type, amount, description, transaction_date)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, user_id, category_id, type, amount::numeric::float AS amount, description, 
              TO_CHAR(transaction_date, 'YYYY-MM-DD') AS transaction_date, created_at, updated_at
  `;

  const insertRes = await query(insertSql, [
    userId,
    categoryId,
    type,
    parsedAmount,
    description || null,
    transactionDate,
  ]);

  const newTx = insertRes.rows[0];
  newTx.category_name = category.name;
  return newTx;
};

/**
 * Update transaction by ID
 */
const updateTransaction = async (id, updateData, currentUser) => {
  // Check existence and ownership
  const existingRes = await query('SELECT * FROM transactions WHERE id = $1', [id]);
  if (existingRes.rows.length === 0) {
    throw new AppError('Transaction not found.', 404, 'NOT_FOUND');
  }

  const existing = existingRes.rows[0];
  if (currentUser.role !== 'admin' && existing.user_id !== currentUser.id) {
    throw new AppError('You do not have permission to modify this transaction.', 403, 'FORBIDDEN');
  }

  const targetType = updateData.type || existing.type;
  const targetCategoryId = updateData.categoryId !== undefined ? updateData.categoryId : existing.category_id;

  // If type or category changed, validate category existence and type match
  if (updateData.type || updateData.categoryId !== undefined) {
    if (!['income', 'expense'].includes(targetType)) {
      throw new AppError("Type must be either 'income' or 'expense'.", 400, 'INVALID_INPUT');
    }
    const category = await categoriesService.getCategoryById(targetCategoryId);
    if (!category) {
      throw new AppError('Specified category does not exist.', 400, 'CATEGORY_NOT_FOUND');
    }
    if (category.type !== targetType) {
      throw new AppError(
        `Category '${category.name}' is of type '${category.type}', which does not match transaction type '${targetType}'.`,
        400,
        'CATEGORY_TYPE_MISMATCH'
      );
    }
  }

  let parsedAmount = existing.amount;
  if (updateData.amount !== undefined) {
    parsedAmount = parseFloat(updateData.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new AppError('Amount must be a positive number greater than 0.', 400, 'INVALID_INPUT');
    }
  }

  if (updateData.transactionDate && isNaN(new Date(updateData.transactionDate).getTime())) {
    throw new AppError('Valid transaction date (YYYY-MM-DD) is required.', 400, 'INVALID_INPUT');
  }

  if (updateData.description && updateData.description.length > 255) {
    throw new AppError('Description must be 255 characters or fewer.', 400, 'INVALID_INPUT');
  }

  const targetDate = updateData.transactionDate || existing.transaction_date;
  const targetDescription = updateData.description !== undefined ? updateData.description : existing.description;

  const updateSql = `
    UPDATE transactions
    SET type = $1,
        category_id = $2,
        amount = $3,
        description = $4,
        transaction_date = $5,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $6
    RETURNING id, user_id, category_id, type, amount::numeric::float AS amount, description, 
              TO_CHAR(transaction_date, 'YYYY-MM-DD') AS transaction_date, created_at, updated_at
  `;

  const updateRes = await query(updateSql, [
    targetType,
    targetCategoryId,
    parsedAmount,
    targetDescription,
    targetDate,
    id,
  ]);

  const updatedTx = updateRes.rows[0];
  const cat = await categoriesService.getCategoryById(updatedTx.category_id);
  updatedTx.category_name = cat ? cat.name : null;
  return updatedTx;
};

/**
 * Delete transaction by ID
 */
const deleteTransaction = async (id, currentUser) => {
  const existingRes = await query('SELECT * FROM transactions WHERE id = $1', [id]);
  if (existingRes.rows.length === 0) {
    throw new AppError('Transaction not found.', 404, 'NOT_FOUND');
  }

  const existing = existingRes.rows[0];
  if (currentUser.role !== 'admin' && existing.user_id !== currentUser.id) {
    throw new AppError('You do not have permission to delete this transaction.', 403, 'FORBIDDEN');
  }

  await query('DELETE FROM transactions WHERE id = $1', [id]);
  return { id: existing.id, userId: existing.user_id };
};

module.exports = {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
};
