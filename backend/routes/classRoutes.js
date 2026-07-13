const express = require('express');
const { check } = require('express-validator');
const {
  createClass,
  getAllClasses,
  getClassById,
  updateClass,
  deleteClass,
  reorderClasses,
} = require('../controllers/classController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validationMiddleware');

const router = express.Router();

// Apply auth protection to all class routes
router.use(protect);

/**
 * @route   PUT /api/classes/reorder
 * @desc    Reorder classes
 * @access  Private (Admin)
 */
router.put('/reorder', authorize('admin'), reorderClasses);

/**
 * @route   GET /api/classes
 * @desc    Get all classes
 * @access  Private (Admin, Teacher)
 */
router.get('/', authorize('admin', 'teacher'), getAllClasses);

/**
 * @route   GET /api/classes/:id
 * @desc    Get class by ID
 * @access  Private (Admin, Teacher)
 */
router.get('/:id', authorize('admin', 'teacher'), getClassById);

/**
 * @route   POST /api/classes
 * @desc    Create a new class
 * @access  Private (Admin)
 */
router.post(
  '/',
  authorize('admin'),
  [
    check('name', 'Class name is required').trim().notEmpty(),
    check('gender', 'Gender must be male, female, or mixed').optional().isIn(['male', 'female', 'mixed']),
  ],
  validateRequest,
  createClass
);

/**
 * @route   PUT /api/classes/:id
 * @desc    Update a class
 * @access  Private (Admin)
 */
router.put(
  '/:id',
  authorize('admin'),
  [
    check('name', 'Class name is required').trim().notEmpty(),
    check('gender', 'Gender must be male, female, or mixed').optional().isIn(['male', 'female', 'mixed']),
  ],
  validateRequest,
  updateClass
);

/**
 * @route   DELETE /api/classes/:id
 * @desc    Delete a class
 * @access  Private (Admin)
 */
router.delete('/:id', authorize('admin'), deleteClass);

module.exports = router;
