const AppError = require('../utils/AppError');

/**
 * Centralized error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;
  error.code = err.code || 'INTERNAL_SERVER_ERROR';

  // Handle specific database errors (Postgres)
  if (err.code === '23505') {
    // Unique violation
    error = new AppError('A record with that value already exists.', 409, 'DUPLICATE_RESOURCE');
  } else if (err.code === '23503') {
    // Foreign key violation
    error = new AppError('Referenced resource not found.', 400, 'FOREIGN_KEY_VIOLATION');
  } else if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token. Please authenticate.', 401, 'INVALID_TOKEN');
  } else if (err.name === 'TokenExpiredError') {
    error = new AppError('Token has expired. Please log in again.', 401, 'TOKEN_EXPIRED');
  }

  // Consistent JSON response format
  res.status(error.statusCode || 500).json({
    success: false,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred.',
    },
  });
};

module.exports = errorHandler;
