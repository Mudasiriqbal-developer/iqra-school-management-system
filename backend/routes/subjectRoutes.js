const express = require('express');
const { check } = require('express-validator');
const {
  createSubject,
  getAllSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
  reorderSubjects,
} = require('../controllers/subjectController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(protect);

/**
 * @route   PUT /api/subjects/reorder
 * @desc    Reorder subjects
 * @access  Private (Admin)
 */
router.put('/reorder', authorize('admin'), reorderSubjects);

/**
 * @route   GET /api/subjects
 * @desc    Get all subjects
 * @access  Private (Admin, Teacher)
 */
router.get('/', authorize('admin', 'teacher'), getAllSubjects);

/**
 * @route   GET /api/subjects/:id
 * @desc    Get subject by ID
 * @access  Private (Admin, Teacher)
 */
router.get('/:id', authorize('admin', 'teacher'), getSubjectById);

/**
 * @route   POST /api/subjects
 * @desc    Create a new subject
 * @access  Private (Admin)
 */
router.post(
  '/',
  authorize('admin'),
  [
    check('name', 'Subject name is required').trim().notEmpty(),
    check('classId', 'Valid Class ID is required').isMongoId(),
  ],
  validateRequest,
  createSubject
);

/**
 * @route   PUT /api/subjects/:id
 * @desc    Update a subject
 * @access  Private (Admin)
 */
router.put(
  '/:id',
  authorize('admin'),
  [
    check('name', 'Subject name must be a string').optional().trim().notEmpty(),
    check('classId', 'Valid Class ID must be a Mongo ID').optional().isMongoId(),
  ],
  validateRequest,
  updateSubject
);

/**
 * @route   DELETE /api/subjects/:id
 * @desc    Delete a subject
 * @access  Private (Admin)
 */
router.delete('/:id', authorize('admin'), deleteSubject);

module.exports = router;
