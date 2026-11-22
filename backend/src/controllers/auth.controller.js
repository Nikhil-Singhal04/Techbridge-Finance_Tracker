const authService = require('../services/auth.service');

/**
 * Handle user registration
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const result = await authService.registerUser({ name, email, password });

    res.status(201).json({
      success: true,
      data: {
        token: result.token,
        user: result.user,
      },
      message: 'User registered successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Handle user login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser({ email, password });

    res.status(200).json({
      success: true,
      data: {
        token: result.token,
        user: result.user,
      },
      message: 'Login successful',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get current authenticated user
 */
const getMe = async (req, res, next) => {
  try {
    const user = await authService.getCurrentUser(req.user.id);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          created_at: user.created_at,
        },
      },
      message: 'Current user fetched successfully',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  getMe,
};
