const express = require('express');
const { check } = require('express-validator');
const {
  getMonthlyPayrollOverview,
  processSalaryPayout,
  getTeacherPayrollHistory,
} = require('../controllers/payrollController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validationMiddleware');

const router = express.Router();

// All routes require authentication and admin authority
router.use(protect);
router.use(authorize('admin'));

/**
 * @route   GET /api/payroll
 * @desc    Get monthly payroll status and statistics
 * @access  Private (Admin Only)
 */
router.get('/', getMonthlyPayrollOverview);

/**
 * @route   POST /api/payroll
 * @desc    Record/process teacher salary payout
 * @access  Private (Admin Only)
 */
router.post(
  '/',
  [
    check('teacherId', 'Teacher ID is required').isMongoId(),
    check('month', 'Month is required in YYYY-MM format').trim().matches(/^\d{4}-\d{2}$/),
    check('allowances', 'Allowances must be a positive number').optional().isFloat({ min: 0 }),
    check('deductions', 'Deductions must be a positive number').optional().isFloat({ min: 0 }),
    check('paymentMethod', 'Payment method must be cash, bank_transfer, or cheque').optional().isIn(['cash', 'bank_transfer', 'cheque']),
    check('status', 'Status must be paid or pending').optional().isIn(['paid', 'pending']),
  ],
  validateRequest,
  processSalaryPayout
);

/**
 * @route   GET /api/payroll/history/:teacherId
 * @desc    Get payout history of a specific teacher
 * @access  Private (Admin Only)
 */
router.get('/history/:teacherId', getTeacherPayrollHistory);

module.exports = router;
