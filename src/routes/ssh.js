const express = require('express');
const router = express.Router();
const sshController = require('../controllers/sshController');
const { validateSSHConnection, validateCommand } = require('../middleware/validation');

router.post('/test-connection', validateSSHConnection, sshController.testConnection);

router.post('/execute', validateCommand, sshController.executeCommand);

router.post('/server-info', validateSSHConnection, sshController.getServerInfo);

router.get('/allowed-commands', sshController.getAllowedCommands);

router.put('/security-settings', sshController.updateSecuritySettings);

module.exports = router;