const express = require('express');
const { check } = require('express-validator');
const {
  createAssignment,
  getAllAssignments,
  getMyAssignments,
  deleteAssignment,
} = require('../controllers/assignmentController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(protect);

/**
 * @route   GET /api/assignments/my-assignments
 * @desc    Get assignments for the logged in teacher
 * @access  Private (Teacher)
 */
router.get('/my-assignments', authorize('teacher'), getMyAssignments);

/**
 * @route   GET /api/assignments
 * @desc    Get all assignments
 * @access  Private (Admin)
 */
router.get('/', authorize('admin'), getAllAssignments);

/**
 * @route   POST /api/assignments
 * @desc    Create a new teacher assignment
 * @access  Private (Admin)
 */
router.post(
  '/',
  authorize('admin'),
  [
    check('teacherId', 'Valid Teacher ID is required').isMongoId(),
    check('classId', 'Valid Class ID is required').isMongoId(),
    check('sectionId', 'Valid Section ID is required').isMongoId(),
    check('subjectId', 'Valid Subject ID is required').isMongoId(),
  ],
  validateRequest,
  createAssignment
);

/**
 * @route   DELETE /api/assignments/:id
 * @desc    Delete/remove an assignment
 * @access  Private (Admin)
 */
router.delete('/:id', authorize('admin'), deleteAssignment);

module.exports = router;
