const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    email: { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true },
    password: { type: String, required: [true, 'Password is required'] },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    isVerified: { type: Boolean, default: false },
    isSuspended: { type: Boolean, default: false },
    suspendedAt: { type: Date, default: null },
    avatar: { type: String, default: '' },
    phone: { type: String, default: '' },
    notificationPrefs: {
      emailReminders: { type: Boolean, default: true },
      whatsappReminders: { type: Boolean, default: false }, // 🆕 opt-in required
      reminderTiming: { type: String, default: '1-day' },
      weeklyDigest: { type: Boolean, default: true },
    },
    streak: { type: Number, default: 0 },
    giftBudget: { type: Number, default: 0 },
    notificationHistory: [
      {
        title: String,
        message: String,
        time: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);