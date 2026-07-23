const mongoose = require('mongoose');

const birthdaySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    dob: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },
    group: {
      type: String,
      default: 'Family',
    },
    phone: {
      type: String,
      default: '',
    },
    email: {
      type: String,
      default: '',
      lowercase: true,
      trim: true,
    },
    photo: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
    wishedYears: {
      type: [Number], // years in which user marked "wished"
      default: [],
    },
    memories: [
      {
        year: Number,
        note: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Birthday', birthdaySchema);