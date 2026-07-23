const express = require('express');
const router = express.Router();

const {
  updateProfile,
  changePassword,
  updateNotificationPrefs,
  getNotifications,
} = require('../controllers/userController');

const protect = require('../middleware/authMiddleware');

router.use(protect);

router.put('/profile', updateProfile);
router.put('/change-password', changePassword);
router.put('/notification-prefs', updateNotificationPrefs);
router.get('/notifications', getNotifications);

module.exports = router;