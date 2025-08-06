const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');

router.use(authenticateToken);

router.get('/stats', checkPermission('dashboard'), dashboardController.getStats);
router.get('/recent-tasks', checkPermission('dashboard'), dashboardController.getRecentTasks);
router.get('/status', checkPermission('dashboard'), dashboardController.getSystemStatus);
router.get('/task-stats', checkPermission('dashboard'), dashboardController.getTaskStatsByDate);

module.exports = router;