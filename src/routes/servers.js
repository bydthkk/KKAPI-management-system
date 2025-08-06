const express = require('express');
const router = express.Router();
const serverController = require('../controllers/serverController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { checkPermission, checkAnyPermission } = require('../middleware/permission');
const { validateServer } = require('../middleware/validation');

router.use(authenticateToken);

router.get('/', checkAnyPermission(['servers', 'parameters']), serverController.getServers);
router.get('/:id', checkPermission('servers'), serverController.getServer);
router.post('/', checkPermission('servers'), validateServer, serverController.createServer);
router.put('/:id', checkPermission('servers'), validateServer, serverController.updateServer);
router.delete('/:id', checkPermission('servers'), serverController.deleteServer);
router.post('/:id/test', checkPermission('servers'), serverController.testServerConnection);

// 状态检测服务管理
router.get('/status-service/info', serverController.getStatusServiceInfo);
router.post('/status-service/trigger', serverController.triggerStatusCheck);
router.put('/status-service/config', requireRole(['admin']), serverController.configureStatusService);

module.exports = router;