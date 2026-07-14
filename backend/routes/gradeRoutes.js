const express = require('express');
const { check } = require('express-validator');
const {
  uploadGrades,
  getStudentGrades,
  getMyGrades,
  getClassGrades,
} = require('../controllers/gradeController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(protect);

/**
 * @route   POST /api/grades
 * @desc    Upload or update grades for students (bulk or single)
 * @access  Private (Admin, Teacher)
 */
router.post(
  '/',
  authorize('admin', 'teacher'),
  [
    check('classId', 'Valid Class ID is required').isMongoId(),
    check('sectionId', 'Valid Section ID is required').isMongoId(),
    check('subjectId', 'Valid Subject ID is required').isMongoId(),
    check('examType', 'Exam type must be first_term, second_term, final_term, quiz, assignment, midterm, or final').isIn([
      'quiz',
      'assignment',
      'midterm',
      'final',
      'first_term',
      'second_term',
      'final_term',
    ]),
    check('grades', 'Grades must be an array').isArray(),
  ],
  validateRequest,
  uploadGrades
);

/**
 * @route   GET /api/grades/student/:studentId
 * @desc    Get grades for a specific student
 * @access  Private (Admin, Teacher)
 */
router.get('/student/:studentId', authorize('admin', 'teacher'), getStudentGrades);

/**
 * @route   GET /api/grades/me
 * @desc    Get logged-in student's or parent's child's grades
 * @access  Private (Student, Parent)
 */
router.get('/me', authorize('student', 'parent'), getMyGrades);

/**
 * @route   GET /api/grades/class-section
 * @desc    Get grades roster for a class section and subject
 * @access  Private (Admin, Teacher)
 */
router.get('/class-section', authorize('admin', 'teacher'), getClassGrades);

module.exports = router;
