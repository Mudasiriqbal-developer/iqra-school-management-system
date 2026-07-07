const express = require('express');
const { check } = require('express-validator');
const {
  createExpense,
  getExpenses,
  updateExpense,
  deleteExpense,
} = require('../controllers/expenseController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validationMiddleware');

const router = express.Router();

// All routes require authentication and admin authority
router.use(protect);
router.use(authorize('admin'));

/**
 * @route   GET /api/expenses
 * @desc    Get filtered list of expenses
 * @access  Private (Admin Only)
 */
router.get('/', getExpenses);

/**
 * @route   POST /api/expenses
 * @desc    Create a new expense
 * @access  Private (Admin Only)
 */
router.post(
  '/',
  [
    check('title', 'Expense title is required').trim().notEmpty(),
    check('category', 'Category must be a valid option').trim().isIn(['rent', 'utilities', 'salaries', 'maintenance', 'stationery', 'assets', 'other']),
    check('amount', 'Amount must be a positive number').isFloat({ min: 0 }),
    check('date', 'Date must be a valid ISO8601 date').optional().isISO8601(),
    check('description', 'Description must be a string').optional().trim(),
    check('paidTo', 'Paid to must be a string').optional().trim(),
  ],
  validateRequest,
  createExpense
);

/**
 * @route   PUT /api/expenses/:id
 * @desc    Update an expense record
 * @access  Private (Admin Only)
 */
router.put(
  '/:id',
  [
    check('title', 'Title cannot be empty').optional().trim().notEmpty(),
    check('category', 'Category must be a valid option').optional().trim().isIn(['rent', 'utilities', 'salaries', 'maintenance', 'stationery', 'assets', 'other']),
    check('amount', 'Amount must be a positive number').optional().isFloat({ min: 0 }),
    check('date', 'Date must be a valid ISO8601 date').optional().isISO8601(),
    check('description', 'Description must be a string').optional().trim(),
    check('paidTo', 'Paid to must be a string').optional().trim(),
  ],
  validateRequest,
  updateExpense
);

/**
 * @route   DELETE /api/expenses/:id
 * @desc    Delete an expense record
 * @access  Private (Admin Only)
 */
router.delete('/:id', deleteExpense);

module.exports = router;
