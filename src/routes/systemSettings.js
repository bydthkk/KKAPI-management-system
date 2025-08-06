const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { checkAdminPermission } = require('../middleware/permission');
const {
  getSettings,
  updateSettings,
  changePassword,
  getSetting,
  resetToDefaults
} = require('../controllers/systemSettingsController');

// 应用认证中间件到所有路由
router.use(authenticateToken);

// 获取所有系统设置 - 所有用户都可以读取
router.get('/', getSettings);

// 获取单个设置项 - 所有用户都可以读取（如后台标题等）
router.get('/:key', getSetting);

// 以下操作仅管理员可执行
// 更新系统设置
router.put('/', checkAdminPermission, updateSettings);

// 修改密码
router.post('/change-password', checkAdminPermission, changePassword);

// 重置为默认设置
router.post('/reset-defaults', checkAdminPermission, resetToDefaults);

module.exports = router;