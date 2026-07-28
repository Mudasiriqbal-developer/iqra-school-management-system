const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    schoolName: {
      type: String,
      required: [true, 'School name is required'],
      trim: true,
    },
    logoUrl: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    contactNumber: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      default: '',
    },
    currentSession: {
      type: String,
      required: [true, 'Current session is required'],
      trim: true,
    },
    workingDays: {
      type: [String],
      default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    },
    feeHeads: {
      type: [String],
      default: ['Tuition', 'Admission', 'Exam Fee'],
    },
    lateFeeAmount: {
      type: Number,
      default: 0,
      min: [0, 'Late fee amount cannot be negative'],
    },
    lateFeeAfterDay: {
      type: Number,
      default: 0,
      min: [0, 'Late fee after day cannot be negative'],
    },
    schoolId: {
      type: String,
      unique: true,
      default: 'default',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Settings', settingsSchema);
