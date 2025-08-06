const express = require('express');
const router = express.Router();
const parameterController = require('../controllers/parameterController');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');
const { validateParameter } = require('../middleware/validation');

router.use(authenticateToken);

router.get('/', checkPermission('parameters'), parameterController.getParameters);
router.get('/:id', checkPermission('parameters'), parameterController.getParameter);
router.post('/', checkPermission('parameters'), validateParameter, parameterController.createParameter);
router.put('/:id', checkPermission('parameters'), validateParameter, parameterController.updateParameter);
router.delete('/:id', checkPermission('parameters'), parameterController.deleteParameter);
router.get('/:id/execute', checkPermission('parameters'), parameterController.executeParameter);

module.exports = router;