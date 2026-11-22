const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db/pool');
const config = require('../config');
const AppError = require('../utils/AppError');

/**
 * Generate signed JWT token containing id, email, and role
 */
const signToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    config.jwt.secret,
    {
      expiresIn: config.jwt.expiresIn,
    }
  );
};

/**
 * Register a new user
 * Explicitly forces role to 'user' regardless of request payload
 */
const registerUser = async ({ name, email, password }) => {
  // Check if user already exists
  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    throw new AppError('Email address is already registered.', 409, 'DUPLICATE_RESOURCE');
  }

  // Hash password with bcrypt (cost factor 10)
  const passwordHash = await bcrypt.hash(password, 10);

  // Insert user with default 'user' role
  const result = await query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'user')
     RETURNING id, name, email, role, created_at`,
    [name, email, passwordHash]
  );

  const newUser = result.rows[0];
  const token = signToken(newUser);

  return {
    user: newUser,
    token,
  };
};

/**
 * Login user
 * Prevents account enumeration by returning generic 'Invalid credentials'
 */
const loginUser = async ({ email, password }) => {
  const result = await query(
    'SELECT id, name, email, password_hash, role, created_at FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    throw new AppError('Invalid credentials.', 401, 'INVALID_CREDENTIALS');
  }

  const user = result.rows[0];

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new AppError('Invalid credentials.', 401, 'INVALID_CREDENTIALS');
  }

  const token = signToken(user);

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

/**
 * Get current user profile by user id
 */
const getCurrentUser = async (userId) => {
  const result = await query(
    'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('User not found.', 404, 'NOT_FOUND');
  }

  return result.rows[0];
};

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
  signToken,
};
