const mongoose = require('mongoose');

const platformSettingsSchema = new mongoose.Schema(
  {
    allowRegistration: {
      type: Boolean,
      default: true,
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PlatformSettings', platformSettingsSchema);