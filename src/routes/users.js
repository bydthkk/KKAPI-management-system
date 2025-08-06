const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');
const { validateCreateUser, validateUpdateUser, validateResetPassword } = require('../middleware/validation');

// 获取用户列表
router.get('/', authenticateToken, userController.getUsers);

// 创建用户
router.post('/', authenticateToken, validateCreateUser, userController.createUser);

// 更新用户
router.put('/:id', authenticateToken, validateUpdateUser, userController.updateUser);

// 重置用户密码
router.put('/:id/reset-password', authenticateToken, validateResetPassword, userController.resetPassword);

// 删除用户
router.delete('/:id', authenticateToken, userController.deleteUser);

// 获取权限菜单列表
router.get('/menu-permissions', authenticateToken, userController.getMenuPermissions);

module.exports = router;