const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { validateLogin, validateChangePassword, validateUpdateProfile } = require('../middleware/validation');

router.post('/login', validateLogin, authController.login);
router.post('/logout', authenticateToken, authController.logout);
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/change-password', authenticateToken, validateChangePassword, authController.changePassword);
router.put('/profile', authenticateToken, validateUpdateProfile, authController.updateProfile);

module.exports = router;