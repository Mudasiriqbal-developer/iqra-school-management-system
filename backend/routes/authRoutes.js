const express = require('express');
const { check, validationResult } = require('express-validator');
const {
  registerUser,
  loginUser,
  getCurrentUser,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * Validation result handler middleware.
 * If validation fails, returns 400 Bad Request with standardized response shape.
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      data: errors.array(),
      message: 'Validation failed: ' + errors.array().map(e => e.msg).join('; '),
    });
  }
  next();
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  [
    check('name', 'Name is required and must be at least 2 characters')
      .trim()
      .isLength({ min: 2 }),
    check('email', 'Please include a valid email address')
      .trim()
      .isEmail()
      .normalizeEmail(),
    check('password', 'Password must be at least 6 characters')
      .isLength({ min: 6 }),
    check('role', 'Role must be admin, teacher, student, or parent')
      .trim()
      .isIn(['admin', 'teacher', 'student', 'parent']),
  ],
  validateRequest,
  registerUser
);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 */
router.post(
  '/login',
  [
    check('email', 'Please include a valid email address')
      .trim()
      .isEmail()
      .normalizeEmail(),
    check('password', 'Password is required')
      .notEmpty(),
  ],
  validateRequest,
  loginUser
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user details
 * @access  Private
 */
router.get('/me', protect, getCurrentUser);

module.exports = router;
