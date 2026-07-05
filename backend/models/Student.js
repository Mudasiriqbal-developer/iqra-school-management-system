const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    registrationNumber: {
      type: String,
      required: [true, 'Registration number is required'],
      unique: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    fatherName: {
      type: String,
      required: [true, "Father's name is required"],
      trim: true,
    },
    gender: {
      type: String,
      enum: {
        values: ['male', 'female', 'other'],
        message: 'Gender must be male, female, or other',
      },
      required: [true, 'Gender is required'],
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },
    fatherContact: {
      type: String,
      required: [true, "Father's contact is required"],
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class ID is required'],
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      required: [true, 'Section ID is required'],
    },
    feeInfo: {
      amountDue: {
        type: Number,
        default: 0,
      },
      amountPaid: {
        type: Number,
        default: 0,
      },
      status: {
        type: String,
        enum: ['paid', 'pending', 'overdue'],
        default: 'pending',
      },
      dueDate: {
        type: Date,
      },
      history: [
        {
          amount: { type: Number, required: true },
          paidOn: { type: Date, default: Date.now },
          method: {
            type: String,
            required: true,
            enum: ['cash', 'bank_transfer', 'card', 'other'],
            default: 'cash',
          },
        },
      ],
    },
    status: {
      type: String,
      enum: ['active', 'on_leave', 'suspended'],
      default: 'active',
    },
    photoUrl: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Student', studentSchema);
