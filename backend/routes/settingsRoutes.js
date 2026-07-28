const express = require('express');
const { check } = require('express-validator');
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validationMiddleware');

const router = express.Router();

// All routes require authentication
router.use(protect);

/**
 * @route   GET /api/settings
 * @desc    Fetch current settings (accessible to all authenticated users)
 * @access  Private
 */
router.get('/', getSettings);

/**
 * @route   PUT /api/settings
 * @desc    Update settings (admin only, partial updates allowed)
 * @access  Private (Admin Only)
 */
router.put(
  '/',
  authorize('admin'),
  [
    check('schoolName', 'School name cannot be empty').optional().trim().notEmpty(),
    check('logoUrl', 'Logo URL must be a valid string').optional().trim(),
    check('address', 'Address must be a string').optional().trim(),
    check('contactNumber', 'Contact number must be a string').optional().trim(),
    check('email', 'Email must be a valid email address').optional({ checkFalsy: true }).trim().isEmail(),
    check('currentSession', 'Current session cannot be empty').optional().trim().notEmpty(),
    check('workingDays', 'Working days must be an array').optional().isArray(),
    check('workingDays.*', 'Working day must be a valid string').optional().isString(),
    check('feeHeads', 'Fee heads must be an array').optional().isArray(),
    check('feeHeads.*', 'Fee head must be a valid string').optional().isString(),
    check('lateFeeAmount', 'Late fee amount must be a non-negative number').optional().isFloat({ min: 0 }),
    check('lateFeeAfterDay', 'Late fee after day must be a non-negative integer').optional().isInt({ min: 0 }),
  ],
  validateRequest,
  updateSettings
);

module.exports = router;
