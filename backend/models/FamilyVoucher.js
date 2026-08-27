const mongoose = require('mongoose');

const familyVoucherSchema = new mongoose.Schema(
  {
    familyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Family',
      required: true,
    },
    voucherNumber: {
      type: String,
      required: true,
      unique: true,
    },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
    },
    lineItems: [
      {
        studentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Student',
          required: true,
        },
        studentName: {
          type: String,
          required: true,
        },
        classSection: {
          type: String,
          required: true,
        },
        month: {
          type: String,
          required: true,
        },
        title: {
          type: String,
          default: null,
        },
        type: {
          type: String,
          default: 'monthly',
        },
        amount: {
          type: Number,
          required: true,
        },
        feeRecordId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'FeeRecord',
          required: true,
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'card', 'other'],
      default: 'cash',
    },
    paymentDate: {
      type: Date,
      default: Date.now,
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

module.exports = mongoose.model('FamilyVoucher', familyVoucherSchema);
