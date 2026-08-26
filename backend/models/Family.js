const mongoose = require('mongoose');

const familySchema = new mongoose.Schema(
  {
    familyName: {
      type: String,
      required: [true, 'Family name is required'],
      trim: true,
    },
    guardianName: {
      type: String,
      trim: true,
    },
    contactNumber: {
      type: String,
      required: [true, 'Contact number is required'],
      trim: true,
    },
    alternateContact: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
      },
    ],
    notes: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Family', familySchema);
