const Teacher = require('../models/Teacher');
const Assignment = require('../models/Assignment');

/**
 * Reusable middleware to verify that a teacher is assigned to a specific class, section, and subject.
 * Attaches the assignment object to req.assignment if found.
 */
const verifyTeacherAssignment = async (req, res, next) => {
  try {
    // 1. Ensure user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'Not authorized, token missing or invalid',
      });
    }

    // 2. Fetch the teacher profile associated with req.user.id
    const teacher = await Teacher.findOne({ userId: req.user.id });
    if (!teacher) {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'Forbidden: Current user is not registered as a teacher',
      });
    }

    // 3. Read classId, sectionId, and subjectId from req.body (for POST) or req.query (for GET)
    const classId = req.body.classId || req.query.classId;
    const sectionId = req.body.sectionId || req.query.sectionId;
    const subjectId = req.body.subjectId || req.query.subjectId;

    if (!classId || !sectionId || !subjectId) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Bad Request: classId, sectionId, and subjectId are required',
      });
    }

    // 4. Query assignment
    const assignment = await Assignment.findOne({
      teacherId: teacher._id,
      classId,
      sectionId,
      subjectId,
    });

    if (!assignment) {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'You are not assigned to this class/subject',
      });
    }

    // 5. Attach assignment and proceed
    req.assignment = assignment;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  verifyTeacherAssignment,
};
