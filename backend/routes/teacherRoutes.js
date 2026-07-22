const express = require('express');
const { check } = require('express-validator');
const {
  createTeacher,
  getAllTeachers,
  updateTeacher,
  deleteTeacher,
  getMyClassSection,
  resendInvitation,
} = require('../controllers/teacherController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validationMiddleware');

const router = express.Router();

// All routes require authentication
router.use(protect);

/**
 * @route   GET /api/teachers/my-class
 * @desc    Get the section where the teacher is class teacher
 * @access  Private (Teacher Only)
 */
router.get('/my-class', authorize('teacher'), getMyClassSection);

/**
 * @route   GET /api/teachers
 * @desc    Get all teachers
 * @access  Private (Admin Only)
 */
router.get('/', authorize('admin'), getAllTeachers);

/**
 * @route   POST /api/teachers
 * @desc    Create a new teacher
 * @access  Private (Admin Only)
 */
router.post(
  '/',
  authorize('admin'),
  [
    check('name', 'Name is required').trim().notEmpty(),
    check('email', 'Please include a valid email address')
      .trim()
      .isEmail()
      .normalizeEmail({
        gmail_remove_subaddress: false,
        gmail_remove_dots: false,
        outlookdotcom_remove_subaddress: false,
        yahoo_remove_subaddress: false,
        icloud_remove_subaddress: false
      }),
    check('employeeId', 'Employee ID is required').trim().notEmpty(),
    check('qualification', 'Qualification must be a string').optional().trim(),
    check('phone', 'Phone must be a string').optional().trim(),
    check('joiningDate', 'Joining date must be a valid date').optional().isISO8601(),
    check('photoUrl', 'Photo URL must be a valid URL string').optional().trim(),
  ],
  validateRequest,
  createTeacher
);

/**
 * @route   PUT /api/teachers/:id
 * @desc    Update teacher profile
 * @access  Private (Admin Only)
 */
router.put(
  '/:id',
  authorize('admin'),
  [
    check('name', 'Name cannot be empty').optional().trim().notEmpty(),
    check('email', 'Please include a valid email address')
      .optional()
      .trim()
      .isEmail()
      .normalizeEmail({
        gmail_remove_subaddress: false,
        gmail_remove_dots: false,
        outlookdotcom_remove_subaddress: false,
        yahoo_remove_subaddress: false,
        icloud_remove_subaddress: false
      }),
    check('employeeId', 'Employee ID cannot be empty').optional().trim().notEmpty(),
    check('qualification', 'Qualification must be a string').optional().trim(),
    check('phone', 'Phone must be a string').optional().trim(),
    check('joiningDate', 'Joining date must be a valid date').optional().isISO8601(),
    check('photoUrl', 'Photo URL must be a valid URL string').optional().trim(),
  ],
  validateRequest,
  updateTeacher
);

/**
 * @route   DELETE /api/teachers/:id
 * @desc    Delete (soft delete) a teacher
 * @access  Private (Admin Only)
 */
router.delete('/:id', authorize('admin'), deleteTeacher);

/**
 * @route   PATCH /api/teachers/:id/resend-invitation
 * @desc    Resend activation email to a teacher
 * @access  Private (Admin Only)
 */
router.patch('/:id/resend-invitation', authorize('admin'), resendInvitation);

module.exports = router;
