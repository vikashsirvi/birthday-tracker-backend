const mongoose = require('mongoose');

const giftSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    birthdayId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Birthday',
      required: true,
    },
    personName: {
      type: String,
      required: true,
    },
    giftIdea: {
      type: String,
      required: [true, 'Gift idea is required'],
    },
    cost: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Planned', 'Bought', 'Given'],
      default: 'Planned',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Gift', giftSchema);