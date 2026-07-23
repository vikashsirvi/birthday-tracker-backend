const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema(
  {
    to: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['otp', 'welcome', 'password-reset', 'reminder', 'broadcast', 'other'],
      default: 'other',
    },
    status: {
      type: String,
      enum: ['sent', 'failed'],
      default: 'sent',
    },
    error: {
      type: String,
      default: '',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EmailLog', emailLogSchema);