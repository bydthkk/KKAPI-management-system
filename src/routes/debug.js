const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');

// 调试路由 - 检查用户权限和token状态
router.get('/auth-status', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: {
      user: {
        id: req.user.id,
        username: req.user.username,
        role: req.user.role,
        permissions: req.user.permissions,
        status: req.user.status
      },
      timestamp: new Date().toISOString()
    },
    message: '用户认证状态正常'
  });
});

// 调试路由 - 检查dashboard权限
router.get('/dashboard-permission', authenticateToken, checkPermission('dashboard'), (req, res) => {
  res.json({
    success: true,
    data: {
      hasPermission: true,
      user: req.user.username,
      role: req.user.role,
      permissions: req.user.permissions
    },
    message: '用户有dashboard权限'
  });
});

// 调试路由 - 检查admin权限
router.get('/admin-permission', authenticateToken, (req, res) => {
  const isAdmin = req.user.role === 'admin';
  res.json({
    success: true,
    data: {
      isAdmin,
      user: req.user.username,
      role: req.user.role,
      permissions: req.user.permissions
    },
    message: isAdmin ? '用户是管理员' : '用户不是管理员'
  });
});

module.exports = router;