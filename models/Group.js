const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true,
    },
    color: {
      type: String,
      default: '#4F6EF7',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Group', groupSchema);