const express = require('express');
const { check } = require('express-validator');
const {
  createSection,
  getAllSections,
  getSectionById,
  updateSection,
  deleteSection,
  assignClassTeacher,
  unassignClassTeacher,
  reorderSections,
} = require('../controllers/sectionController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(protect);

/**
 * @route   PUT /api/sections/reorder
 * @desc    Reorder sections
 * @access  Private (Admin)
 */
router.put('/reorder', authorize('admin'), reorderSections);

/**
 * @route   GET /api/sections
 * @desc    Get all sections
 * @access  Private (Admin, Teacher)
 */
router.get('/', authorize('admin', 'teacher'), getAllSections);

/**
 * @route   GET /api/sections/:id
 * @desc    Get section by ID
 * @access  Private (Admin, Teacher)
 */
router.get('/:id', authorize('admin', 'teacher'), getSectionById);

/**
 * @route   POST /api/sections
 * @desc    Create a new section
 * @access  Private (Admin)
 */
router.post(
  '/',
  authorize('admin'),
  [
    check('name', 'Section name is required').trim().notEmpty(),
    check('classId', 'Valid Class ID is required').isMongoId(),
  ],
  validateRequest,
  createSection
);

/**
 * @route   PUT /api/sections/:id
 * @desc    Update a section
 * @access  Private (Admin)
 */
router.put(
  '/:id',
  authorize('admin'),
  [
    check('name', 'Section name must be a string').optional().trim().notEmpty(),
    check('classId', 'Valid Class ID must be a Mongo ID').optional().isMongoId(),
  ],
  validateRequest,
  updateSection
);

/**
 * @route   DELETE /api/sections/:id
 * @desc    Delete a section
 * @access  Private (Admin)
 */
router.delete('/:id', authorize('admin'), deleteSection);

/**
 * @route   PUT /api/sections/:id/class-teacher
 * @desc    Assign class teacher to section
 * @access  Private (Admin)
 */
router.put(
  '/:id/class-teacher',
  authorize('admin'),
  [
    check('teacherId', 'Valid Teacher ID is required').isMongoId(),
  ],
  validateRequest,
  assignClassTeacher
);

/**
 * @route   DELETE /api/sections/:id/class-teacher
 * @desc    Unassign class teacher from section
 * @access  Private (Admin)
 */
router.delete(
  '/:id/class-teacher',
  authorize('admin'),
  unassignClassTeacher
);

module.exports = router;
