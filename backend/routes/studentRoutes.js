const express = require('express');
const { check } = require('express-validator');
const {
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  setFeeStructure,
  recordFeePayment,
  getFeeSummaryByClass,
} = require('../controllers/studentController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(protect);

/**
 * @route   GET /api/students
 * @desc    Get all students
 * @access  Private (Admin, Teacher)
 */
router.get('/', authorize('admin', 'teacher'), getAllStudents);

/**
 * @route   GET /api/students/fee-summary
 * @desc    Get fee summary aggregated by class/section, or school-wide
 * @access  Private (Admin Only)
 */
router.get('/fee-summary', authorize('admin'), getFeeSummaryByClass);

/**
 * @route   GET /api/students/:id
 * @desc    Get student by ID
 * @access  Private (Admin, Teacher)
 */
router.get('/:id', authorize('admin', 'teacher'), getStudentById);

/**
 * @route   POST /api/students
 * @desc    Create a new student
 * @access  Private (Admin Only)
 */
router.post(
  '/',
  authorize('admin'),
  [
    check('registrationNumber', 'Registration number is required').trim().notEmpty(),
    check('fullName', 'Full name is required').trim().notEmpty(),
    check('fatherName', 'Father name is required').trim().notEmpty(),
    check('gender', 'Gender must be male, female, or other').isIn(['male', 'female', 'other']),
    check('dateOfBirth', 'Valid date of birth is required').isISO8601(),
    check('fatherContact', 'Father contact number is required').trim().notEmpty(),
    check('email', 'Invalid email format').optional({ nullable: true, checkFalsy: true }).trim().isEmail().normalizeEmail(),
    check('classId', 'Valid Class ID is required').isMongoId(),
    check('sectionId', 'Valid Section ID is required').isMongoId(),
    check('feeInfo.status', 'Fee status must be paid, pending, or overdue').optional().isIn(['paid', 'pending', 'overdue']),
    check('feeInfo.dueDate', 'Fee due date must be a valid date').optional().isISO8601(),
    check('status', 'Status must be active, on_leave, or suspended').optional().isIn(['active', 'on_leave', 'suspended']),
  ],
  validateRequest,
  createStudent
);

/**
 * @route   PUT /api/students/:id
 * @desc    Update a student
 * @access  Private (Admin Only)
 */
router.put(
  '/:id',
  authorize('admin'),
  [
    check('registrationNumber', 'Registration number cannot be empty').optional().trim().notEmpty(),
    check('fullName', 'Full name cannot be empty').optional().trim().notEmpty(),
    check('fatherName', 'Father name cannot be empty').optional().trim().notEmpty(),
    check('gender', 'Gender must be male, female, or other').optional().isIn(['male', 'female', 'other']),
    check('dateOfBirth', 'Valid date of birth is required').optional().isISO8601(),
    check('fatherContact', 'Father contact number cannot be empty').optional().trim().notEmpty(),
    check('email', 'Invalid email format').optional({ nullable: true, checkFalsy: true }).trim().isEmail().normalizeEmail(),
    check('classId', 'Valid Class ID must be a Mongo ID').optional().isMongoId(),
    check('sectionId', 'Valid Section ID must be a Mongo ID').optional().isMongoId(),
    check('feeInfo.status', 'Fee status must be paid, pending, or overdue').optional().isIn(['paid', 'pending', 'overdue']),
    check('feeInfo.dueDate', 'Fee due date must be a valid date').optional().isISO8601(),
    check('status', 'Status must be active, on_leave, or suspended').optional().isIn(['active', 'on_leave', 'suspended']),
  ],
  validateRequest,
  updateStudent
);

/**
 * @route   DELETE /api/students/:id
 * @desc    Delete (soft delete) a student
 * @access  Private (Admin Only)
 */
router.delete('/:id', authorize('admin'), deleteStudent);

/**
 * @route   PATCH /api/students/:id/fee-structure
 * @desc    Set fee structure for a student
 * @access  Private (Admin Only)
 */
router.patch(
  '/:id/fee-structure',
  authorize('admin'),
  [
    check('amountDue', 'Amount due must be a number greater than 0').isFloat({ gt: 0 }),
    check('dueDate', 'Due date must be a valid ISO8601 date').optional({ nullable: true }).isISO8601(),
  ],
  validateRequest,
  setFeeStructure
);

/**
 * @route   POST /api/students/:id/fee-payment
 * @desc    Record fee payment for a student
 * @access  Private (Admin Only)
 */
router.post(
  '/:id/fee-payment',
  authorize('admin'),
  [
    check('amount', 'Payment amount must be a number greater than 0').isFloat({ gt: 0 }),
    check('method', 'Payment method must be cash, bank_transfer, card, or other').optional().isIn(['cash', 'bank_transfer', 'card', 'other']),
    check('paidOn', 'Paid date must be a valid ISO8601 date').optional({ nullable: true }).isISO8601(),
  ],
  validateRequest,
  recordFeePayment
);

module.exports = router;
