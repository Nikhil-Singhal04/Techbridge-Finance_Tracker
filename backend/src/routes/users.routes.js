const express = require('express');
const usersController = require('../controllers/users.controller');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');

const router = express.Router();

// All user management routes require admin privileges
router.use(authenticate);
router.use(authorize('admin'));

// GET /api/users - Paginated user list with search
router.get('/', usersController.listUsers);

// GET /api/users/:id - User details
router.get('/:id', usersController.getUser);

// PATCH /api/users/:id/role - Update user role
router.patch('/:id/role', usersController.updateUserRole);

// DELETE /api/users/:id - Delete user
router.delete('/:id', usersController.deleteUser);

module.exports = router;
