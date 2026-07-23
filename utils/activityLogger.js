const ActivityLog = require('../models/ActivityLog');

const logActivity = async (adminId, adminName, action, target = '') => {
  try {
    await ActivityLog.create({ adminId, adminName, action, target });
  } catch (error) {
    console.error('❌ Failed to log activity:', error.message);
  }
};

module.exports = { logActivity };