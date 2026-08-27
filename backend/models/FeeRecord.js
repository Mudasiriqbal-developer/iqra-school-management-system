const mongoose = require('mongoose');

const feeRecordSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    month: {
      type: String,
      required: true, // format "YYYY-MM"
    },
    amountDue: {
      type: Number,
      required: true,
    },
    amountPaid: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'partial', 'paid'],
      default: 'pending',
    },
    type: {
      type: String,
      enum: ['monthly', 'admission', 'one_time'],
      default: 'monthly',
    },
    title: {
      type: String,
      trim: true,
      default: null,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    payments: [
      {
        amount: {
          type: Number,
          required: true,
        },
        type: {
          type: String,
          enum: ['full', 'half', 'custom'],
          required: true,
        },
        method: {
          type: String,
          enum: ['cash', 'bank_transfer', 'card', 'other'],
          default: 'cash',
        },
        paidOn: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound partial UNIQUE index on { studentId, month, type } only for monthly records
feeRecordSchema.index(
  { studentId: 1, month: 1, type: 1 },
  { unique: true, partialFilterExpression: { type: 'monthly' } }
);

module.exports = mongoose.model('FeeRecord', feeRecordSchema);
