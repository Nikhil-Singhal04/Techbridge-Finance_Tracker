const { query } = require('../db/pool');
const AppError = require('../utils/AppError');
const cacheService = require('./cache');

/**
 * List paginated users with optional search
 */
const getUsers = async ({ page = 1, limit = 10, search }) => {
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (search && search.trim()) {
    conditions.push(`(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
    params.push(`%${search.trim()}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countSql = `SELECT COUNT(*)::int AS total FROM users ${whereClause}`;
  const countRes = await query(countSql, params);
  const total = countRes.rows[0]?.total || 0;
  const totalPages = Math.ceil(total / limitNum) || 1;

  const dataParams = [...params, limitNum, offset];
  const dataSql = `
    SELECT id, name, email, role, created_at
    FROM users
    ${whereClause}
    ORDER BY id ASC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;

  const dataRes = await query(dataSql, dataParams);

  return {
    users: dataRes.rows,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
    },
  };
};

/**
 * Get user by ID (excluding password hash)
 */
const getUserById = async (id) => {
  const result = await query(
    'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError('User not found.', 404, 'NOT_FOUND');
  }

  return result.rows[0];
};

/**
 * Update user role (admin cannot demote self)
 */
const updateUserRole = async (targetUserId, newRole, currentAdminUser) => {
  if (!['admin', 'user', 'read-only'].includes(newRole)) {
    throw new AppError("Invalid role. Role must be 'admin', 'user', or 'read-only'.", 400, 'INVALID_ROLE');
  }

  if (targetUserId === currentAdminUser.id && newRole !== 'admin') {
    throw new AppError('Administrators cannot demote their own account.', 400, 'CANNOT_DEMOTE_SELF');
  }

  // Ensure user exists
  const existing = await getUserById(targetUserId);

  const result = await query(
    `UPDATE users
     SET role = $1
     WHERE id = $2
     RETURNING id, name, email, role, created_at`,
    [newRole, targetUserId]
  );

  // Invalidate affected user's cache
  await cacheService.invalidateUserAnalyticsCache(targetUserId);

  return result.rows[0];
};

/**
 * Delete user (admin cannot delete self)
 */
const deleteUser = async (targetUserId, currentAdminUser) => {
  if (targetUserId === currentAdminUser.id) {
    throw new AppError('Administrators cannot delete their own account.', 400, 'CANNOT_DELETE_SELF');
  }

  // Ensure user exists
  await getUserById(targetUserId);

  await query('DELETE FROM users WHERE id = $1', [targetUserId]);

  // Invalidate affected user's cache
  await cacheService.invalidateUserAnalyticsCache(targetUserId);

  return true;
};

module.exports = {
  getUsers,
  getUserById,
  updateUserRole,
  deleteUser,
};
