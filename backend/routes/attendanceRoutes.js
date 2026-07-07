const express = require('express');
const { check } = require('express-validator');
const {
  markAttendance,
  getAttendanceByClass,
  getStudentAttendanceSummary,
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { verifyClassTeacher } = require('../middleware/checkAssignment');
const { validateRequest } = require('../middleware/validationMiddleware');

const router = express.Router();

router.use(protect);

/**
 * @route   POST /api/attendance
 * @desc    Mark daily attendance for a class section
 * @access  Private (Teacher Only, must be designated Class Teacher)
 */
router.post(
  '/',
  authorize('teacher'),
  verifyClassTeacher,
  [
    check('classId', 'Valid Class ID is required').isMongoId(),
    check('sectionId', 'Valid Section ID is required').isMongoId(),
    check('date', 'Valid Date is required').isISO8601(),
    check('records', 'Records must be an array').isArray(),
    check('records.*.studentId', 'Valid Student ID is required in records').isMongoId(),
    check('records.*.status', 'Status must be one of: present, absent, leave, late')
      .isIn(['present', 'absent', 'leave', 'late']),
  ],
  validateRequest,
  markAttendance
);

/**
 * @route   GET /api/attendance
 * @desc    Get attendance records (Admin can query any class/section, Teacher restricted to their class)
 * @access  Private (Admin, Teacher)
 */
router.get(
  '/',
  authorize('admin', 'teacher'),
  getAttendanceByClass
);

/**
 * @route   GET /api/attendance/summary/:studentId
 * @desc    Get student attendance summary
 * @access  Private (Admin, Teacher)
 */
router.get(
  '/summary/:studentId',
  authorize('admin', 'teacher'),
  [
    check('studentId', 'Valid Student ID is required in URL parameter').isMongoId(),
  ],
  validateRequest,
  getStudentAttendanceSummary
);

module.exports = router;
