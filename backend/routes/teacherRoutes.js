const express = require('express');
const { check } = require('express-validator');
const {
  createTeacher,
  getAllTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
} = require('../controllers/teacherController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validationMiddleware');

const router = express.Router();

// All routes require authentication and admin authority
router.use(protect);
router.use(authorize('admin'));

/**
 * @route   GET /api/teachers
 * @desc    Get all teachers
 * @access  Private (Admin Only)
 */
router.get('/', getAllTeachers);

/**
 * @route   GET /api/teachers/:id
 * @desc    Get teacher by ID
 * @access  Private (Admin Only)
 */
router.get('/:id', getTeacherById);

/**
 * @route   POST /api/teachers
 * @desc    Create a new teacher
 * @access  Private (Admin Only)
 */
router.post(
  '/',
  [
    check('name', 'Name is required').trim().notEmpty(),
    check('email', 'Please include a valid email address').trim().isEmail().normalizeEmail(),
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
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
  [
    check('name', 'Name cannot be empty').optional().trim().notEmpty(),
    check('email', 'Please include a valid email address').optional().trim().isEmail().normalizeEmail(),
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
router.delete('/:id', deleteTeacher);

module.exports = router;
