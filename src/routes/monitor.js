const express = require('express');
const router = express.Router();
const MonitorController = require('../controllers/monitorController');
const LocalMonitorController = require('../controllers/localMonitorController');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');

// 所有监控路由都需要认证
router.use(authenticateToken);

// 获取本地服务器监控数据
router.get('/local', checkPermission('remote-monitor'), LocalMonitorController.getLocalMonitoring);

// 获取所有远程服务器监控数据
router.get('/servers', checkPermission('remote-monitor'), MonitorController.getServersMonitoring);

// 获取单个服务器详细监控数据
router.get('/servers/:serverId', checkPermission('remote-monitor'), MonitorController.getServerMonitoring);

module.exports = router;