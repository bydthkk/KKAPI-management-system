const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');

router.use(authenticateToken);

router.get('/', checkPermission('logs'), logController.getLogs);
router.delete('/', requireRole(['admin']), logController.clearLogs);
router.get('/download', requireRole(['admin']), logController.downloadLogs);

module.exports = router;