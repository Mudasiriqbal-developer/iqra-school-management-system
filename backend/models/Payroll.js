const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'Teacher ID is required'],
    },
    month: {
      type: String,
      required: [true, 'Month is required in YYYY-MM format'], // e.g. "2026-07"
    },
    baseSalary: {
      type: Number,
      required: [true, 'Base salary is required'],
      min: [0, 'Base salary cannot be negative'],
    },
    allowances: {
      type: Number,
      default: 0,
      min: [0, 'Allowances cannot be negative'],
    },
    deductions: {
      type: Number,
      default: 0,
      min: [0, 'Deductions cannot be negative'],
    },
    netSalary: {
      type: Number,
      required: [true, 'Net salary is required'],
      min: [0, 'Net salary cannot be negative'],
    },
    status: {
      type: String,
      enum: {
        values: ['paid', 'pending'],
        message: 'Status must be paid or pending',
      },
      default: 'pending',
    },
    paidOn: {
      type: Date,
    },
    paymentMethod: {
      type: String,
      enum: {
        values: ['cash', 'bank_transfer', 'cheque'],
        message: 'Payment method must be cash, bank_transfer, or cheque',
      },
      default: 'cash',
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate payouts to the same teacher in the same month
payrollSchema.index({ teacherId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Payroll', payrollSchema);
