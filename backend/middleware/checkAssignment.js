const Teacher = require('../models/Teacher');
const Assignment = require('../models/Assignment');
const Section = require('../models/Section');

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

/**
 * Reusable middleware to verify that the teacher is the designated Class Teacher of the section.
 * Attaches the section object to req.section if found.
 */
const verifyClassTeacher = async (req, res, next) => {
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

    // 3. Read classId and sectionId from req.body (for POST) or req.query (for GET)
    const classId = req.body.classId || req.query.classId;
    const sectionId = req.body.sectionId || req.query.sectionId;

    if (!classId || !sectionId) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Bad Request: classId and sectionId are required',
      });
    }

    // 4. Find the Section by sectionId
    const section = await Section.findById(sectionId);
    if (!section) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Section not found',
      });
    }

    // 5. Confirm section.classTeacherId equals this teacher's _id AND section.classId matches the provided classId
    const isClassTeacher = section.classTeacherId && section.classTeacherId.toString() === teacher._id.toString();
    const isMatchingClass = section.classId && section.classId.toString() === classId.toString();

    if (!isClassTeacher || !isMatchingClass) {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'You are not the Class Teacher for this section',
      });
    }

    // 6. Attach teacher profile and section, then proceed
    req.teacher = teacher;
    req.section = section;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  verifyTeacherAssignment,
  verifyClassTeacher,
};
