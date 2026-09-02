const mongoose = require('mongoose');

const bookFeeItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  { _id: false }
);

const bookFeePaymentSchema = new mongoose.Schema(
  {
    idempotencyKey: {
      type: String,
      trim: true,
      default: null,
    },
    receiptNumber: {
      type: String,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    method: {
      type: String,
      enum: ['cash', 'bank_transfer', 'card', 'online', 'other'],
      default: 'cash',
    },
    paidOn: {
      type: Date,
      default: Date.now,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    note: {
      type: String,
      trim: true,
    },
  },
  { _id: true }
);

const bookFeeSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      default: null,
    },
    academicYear: {
      type: String,
      trim: true,
      default: null,
    },
    items: {
      type: [bookFeeItemSchema],
      default: [],
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    dueDate: {
      type: Date,
    },
    paid: {
      type: Boolean,
      default: false,
    },
    paidAt: {
      type: Date,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'partial', 'paid'],
      default: 'pending',
    },
    deliveryStatus: {
      type: String,
      enum: ['pending', 'partial', 'delivered'],
      default: 'pending',
    },
    payments: {
      type: [bookFeePaymentSchema],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast lookup & reporting
bookFeeSchema.index({ student: 1, academicYear: 1 });
bookFeeSchema.index({ classId: 1, paymentStatus: 1 });
bookFeeSchema.index({ paymentStatus: 1 });

module.exports = mongoose.model('BookFee', bookFeeSchema);
