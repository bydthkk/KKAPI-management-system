const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');
const { validateTaskExecution } = require('../middleware/validation');

router.use(authenticateToken);

router.get('/', checkPermission('tasks'), taskController.getTasks);
router.get('/:id', checkPermission('tasks'), taskController.getTask);
router.post('/execute', checkPermission('tasks'), validateTaskExecution, taskController.executeTask);
router.post('/:id/stop', checkPermission('tasks'), taskController.stopTask);
router.delete('/', requireRole(['admin']), taskController.clearTasks);

module.exports = router;