const express = require('express');
const { check } = require('express-validator');
const {
  submitLeaveRequest,
  getMyLeaveRequests,
  getPendingLeaveRequests,
  getAllLeaveRequests,
  updateLeaveStatus,
} = require('../controllers/leaveController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validationMiddleware');

const router = express.Router();

// All routes require authentication
router.use(protect);

/**
 * ============================================================================
 * TEACHER ROUTES
 * ============================================================================
 */

/**
 * @route   POST /api/leaves
 * @desc    Submit a new leave request
 * @access  Private (Teacher Only)
 */
router.post(
  '/',
  authorize('teacher'),
  [
    check('startDate', 'Start date must be a valid ISO8601 date').trim().isISO8601(),
    check('endDate', 'End date must be a valid ISO8601 date').trim().isISO8601(),
    check('category', 'Category must be sick, casual, maternity, unpaid, or other')
      .trim()
      .isIn(['sick', 'casual', 'maternity', 'unpaid', 'other']),
    check('reason', 'Reason is required and cannot be empty').trim().notEmpty(),
  ],
  validateRequest,
  submitLeaveRequest
);

/**
 * @route   GET /api/leaves/my-leaves
 * @desc    Get all leave requests of the logged-in teacher
 * @access  Private (Teacher Only)
 */
router.get('/my-leaves', authorize('teacher'), getMyLeaveRequests);

/**
 * ============================================================================
 * ADMIN ROUTES
 * ============================================================================
 */

// Restrict all following routes to admins
router.use(authorize('admin'));

/**
 * @route   GET /api/leaves/admin/pending
 * @desc    Get all pending leave requests for review
 * @access  Private (Admin Only)
 */
router.get('/admin/pending', getPendingLeaveRequests);

/**
 * @route   GET /api/leaves/admin/all
 * @desc    Get all leave requests with optional filters
 * @access  Private (Admin Only)
 */
router.get('/admin/all', getAllLeaveRequests);

/**
 * @route   PUT /api/leaves/admin/:id/status
 * @desc    Approve or reject a leave request
 * @access  Private (Admin Only)
 */
router.put(
  '/admin/:id/status',
  [
    check('status', 'Status must be approved or rejected').trim().isIn(['approved', 'rejected']),
    check('adminComments', 'Admin comments must be a string').optional().trim(),
  ],
  validateRequest,
  updateLeaveStatus
);

module.exports = router;
