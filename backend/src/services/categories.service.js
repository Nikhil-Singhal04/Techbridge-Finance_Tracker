const { query } = require('../db/pool');
const AppError = require('../utils/AppError');

/**
 * Get all categories with optional type filter ('income' or 'expense')
 */
const getAllCategories = async (type) => {
  let sql = 'SELECT id, name, type FROM categories';
  const params = [];

  if (type) {
    if (!['income', 'expense'].includes(type)) {
      throw new AppError("Invalid type filter. Must be 'income' or 'expense'.", 400, 'INVALID_INPUT');
    }
    sql += ' WHERE type = $1';
    params.push(type);
  }

  sql += ' ORDER BY name ASC';
  const result = await query(sql, params);
  return result.rows;
};

/**
 * Get category by ID
 */
const getCategoryById = async (id) => {
  const result = await query('SELECT id, name, type FROM categories WHERE id = $1', [id]);
  if (result.rows.length === 0) {
    return null;
  }
  return result.rows[0];
};

module.exports = {
  getAllCategories,
  getCategoryById,
};
