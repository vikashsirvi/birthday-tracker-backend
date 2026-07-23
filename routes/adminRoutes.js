const express = require('express');
const router = express.Router();

const {
  getOverview,
  getUsers,
  suspendUser,
  verifyUser,
  deleteUser,
  resetUserPassword,
  getAdminTestimonials,
  addTestimonial,
  updateTestimonial,
  deleteTestimonial,
  toggleTestimonialApproval,
  getReport,
  getAllBirthdays,
  getEmailLogs,
  getActivityLogs,
  updatePlatformSettings,
  sendBroadcast,
} = require('../controllers/adminController');

const { testimonialValidator } = require('../validators/testimonialValidator');
const protect = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/roleMiddleware');

// All admin routes require login + admin role
router.use(protect, authorizeRoles('admin'));

// Dashboard
router.get('/overview', getOverview);

// Users
router.get('/users', getUsers);
router.patch('/users/:id/suspend', suspendUser);
router.patch('/users/:id/verify', verifyUser);
router.delete('/users/:id', deleteUser);
router.post('/users/:id/reset-password', resetUserPassword);

// Testimonials
router.get('/testimonials', getAdminTestimonials);
router.post('/testimonials', testimonialValidator, addTestimonial);
router.put('/testimonials/:id', testimonialValidator, updateTestimonial);
router.delete('/testimonials/:id', deleteTestimonial);
router.patch('/testimonials/:id/approval', toggleTestimonialApproval);

// Analytics
router.get('/report', getReport);

// All Birthdays (read-only)
router.get('/birthdays', getAllBirthdays);

// Logs
router.get('/email-logs', getEmailLogs);
router.get('/activity-logs', getActivityLogs);

// Settings
router.put('/settings', updatePlatformSettings);

// Broadcast
router.post('/broadcast', sendBroadcast);

module.exports = router;