const express = require('express');
const { check, param, validationResult } = require('express-validator');
const {
  registerUser,
  loginUser,
  getCurrentUser,
  validateActivationToken,
  activateAccount,
  changePassword,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

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
 * @desc    Register a new user (Admin Only)
 * @access  Private (Admin Only)
 */
router.post(
  '/register',
  protect,
  authorize('admin'),
  [
    check('name', 'Name is required and must be at least 2 characters')
      .trim()
      .isLength({ min: 2 }),
    check('email', 'Please include a valid email address')
      .trim()
      .isEmail()
      .normalizeEmail(),
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
    check('email', 'Email or Registration Number is required')
      .trim()
      .notEmpty(),
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

/**
 * @route   GET /api/auth/activate/:token
 * @desc    Validate activation token
 * @access  Public
 */
router.get(
  '/activate/:token',
  [
    param('token', 'Token is required').notEmpty(),
  ],
  validateRequest,
  validateActivationToken
);

/**
 * @route   POST /api/auth/activate/:token
 * @desc    Activate account and set password
 * @access  Public
 */
router.post(
  '/activate/:token',
  [
    param('token', 'Token is required').notEmpty(),
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
  ],
  validateRequest,
  activateAccount
);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change password of logged-in user
 * @access  Private
 */
router.put(
  '/change-password',
  protect,
  [
    check('currentPassword', 'Current password is required').notEmpty(),
    check('newPassword', 'New password must be at least 6 characters').isLength({ min: 6 }),
  ],
  validateRequest,
  changePassword
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset token
 * @access  Public
 */
router.post(
  '/forgot-password',
  [
    check('email', 'Please include a valid email address').isEmail().normalizeEmail(),
  ],
  validateRequest,
  forgotPassword
);

/**
 * @route   POST /api/auth/reset-password/:token
 * @desc    Reset password using token
 * @access  Public
 */
router.post(
  '/reset-password/:token',
  [
    param('token', 'Token is required').notEmpty(),
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
  ],
  validateRequest,
  resetPassword
);

module.exports = router;
