const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  otp: {
    type: String,
    required: true,
  },
  purpose: {
    type: String,
    enum: ['register', 'forgot-password'],
    required: true,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  resetToken: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300, // TTL index — document auto-deletes after 5 minutes (300 sec)
  },
});

module.exports = mongoose.model('Otp', otpSchema);