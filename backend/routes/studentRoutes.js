const express = require('express');
const { check, body } = require('express-validator');
const {
  createStudent,
  getAllStudents,
  getStudentById,
  getMyProfile,
  getMyAttendance,
  getMySubjects,
  getMyFeeHistory,
  updateStudent,
  deleteStudent,
  setMonthlyFeeAmount,
  getFeeSummaryByClass,
  generateAdmissionReceiptPDF,
  resetStudentPassword,
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
 * @route   GET /api/students/me/profile
 * @desc    Get the logged-in student's own profile
 * @access  Private (Student)
 */
router.get('/me/profile', authorize('student'), getMyProfile);

/**
 * @route   GET /api/students/me/attendance
 * @desc    Get the logged-in student's attendance rate and day-by-day records
 * @query   from (ISO date, optional) - start of date range
 * @query   to   (ISO date, optional) - end of date range
 * @access  Private (Student)
 */
router.get('/me/attendance', authorize('student'), getMyAttendance);

/**
 * @route   GET /api/students/me/subjects
 * @desc    Get subjects assigned to the logged-in student's class and section
 * @access  Private (Student)
 */
router.get('/me/subjects', authorize('student'), getMySubjects);

/**
 * @route   GET /api/students/me/fees
 * @desc    Get the logged-in student's fee summary and payment history
 * @access  Private (Student)
 */
router.get('/me/fees', authorize('student'), getMyFeeHistory);

/**
 * @route   GET /api/students/:id/admission-receipt-pdf
 * @desc    Generate student admission receipt PDF
 * @access  Private (Admin Only)
 */
router.get('/:id/admission-receipt-pdf', authorize('admin'), generateAdmissionReceiptPDF);

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
    check('email', 'Invalid email format')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isEmail()
      .normalizeEmail({
        gmail_remove_subaddress: false,
        gmail_remove_dots: false,
        outlookdotcom_remove_subaddress: false,
        yahoo_remove_subaddress: false,
        icloud_remove_subaddress: false
      }),
    check('classId', 'Valid Class ID is required').isMongoId(),
    check('sectionId', 'Valid Section ID is required').isMongoId(),
    check('feeInfo.status', 'Fee status must be paid, pending, or overdue').optional().isIn(['paid', 'pending', 'overdue']),
    check('feeInfo.dueDate', 'Fee due date must be a valid date').optional().isISO8601(),
    check('status', 'Status must be active, on_leave, or suspended').optional().isIn(['active', 'on_leave', 'suspended']),
    body('admissionFee').optional().isFloat({ min: 0 }),
    body('books').optional().isArray(),
    body('books.*.title').optional().trim().notEmpty(),
    body('books.*.price').optional().isFloat({ min: 0 }),
    body('admissionPaymentStatus').optional().isIn(['fully_paid', 'unpaid', 'custom_paid']),
    body('admissionAmountPaid').optional().isFloat({ min: 0 }),
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
    check('email', 'Invalid email format')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isEmail()
      .normalizeEmail({
        gmail_remove_subaddress: false,
        gmail_remove_dots: false,
        outlookdotcom_remove_subaddress: false,
        yahoo_remove_subaddress: false,
        icloud_remove_subaddress: false
      }),
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
 * @route   PATCH /api/students/:id/monthly-fee
 * @desc    Set monthly fee amount for a student
 * @access  Private (Admin Only)
 */
router.patch(
  '/:id/monthly-fee',
  authorize('admin'),
  [
    check('monthlyFeeAmount', 'Monthly fee amount must be a non-negative number').isFloat({ min: 0 }),
  ],
  validateRequest,
  setMonthlyFeeAmount
);

/**
 * @route   PUT /api/students/:id/reset-password
 * @desc    Reset student password
 * @access  Private (Admin Only)
 */
router.put('/:id/reset-password', authorize('admin'), resetStudentPassword);

module.exports = router;
