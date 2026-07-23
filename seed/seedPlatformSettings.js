require('dotenv').config();
const connectDB = require('../config/db');
const PlatformSettings = require('../models/PlatformSettings');

const seedPlatformSettings = async () => {
  try {
    await connectDB();

    const existing = await PlatformSettings.findOne();
    if (existing) {
      console.log('⚠️ Platform settings already exist');
      process.exit(0);
    }

    const settings = await PlatformSettings.create({
      allowRegistration: true,
      maintenanceMode: false,
    });

    console.log('✅ Platform settings created:', settings);
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to seed platform settings:', error.message);
    process.exit(1);
  }
};

seedPlatformSettings();