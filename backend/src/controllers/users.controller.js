const usersService = require('../services/users.service');

const listUsers = async (req, res, next) => {
  try {
    const result = await usersService.getUsers(req.query);
    res.status(200).json({
      success: true,
      data: result.users,
      pagination: result.pagination,
      message: 'Users retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
};

const getUser = async (req, res, next) => {
  try {
    const user = await usersService.getUserById(parseInt(req.params.id, 10));
    res.status(200).json({
      success: true,
      data: user,
      message: 'User retrieved successfully',
    });
  } catch (err) {
    next(err);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const updated = await usersService.updateUserRole(
      parseInt(req.params.id, 10),
      role,
      req.user
    );
    res.status(200).json({
      success: true,
      data: updated,
      message: 'User role updated successfully',
    });
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    await usersService.deleteUser(parseInt(req.params.id, 10), req.user);
    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listUsers,
  getUser,
  updateUserRole,
  deleteUser,
};
