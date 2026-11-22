const AppError = require('../utils/AppError');

/**
 * Role-Based Access Control (RBAC) middleware
 * Ensures req.user.role is included in the allowed roles list.
 *
 * @param {...string} allowedRoles - 'admin', 'user', 'read-only'
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required before checking permissions.', 401, 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action.', 403, 'FORBIDDEN')
      );
    }

    next();
  };
};

module.exports = authorize;
