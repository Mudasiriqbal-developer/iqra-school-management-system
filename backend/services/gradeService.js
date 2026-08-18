const Grade = require('../models/Grade');
const Settings = require('../models/Settings');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Assignment = require('../models/Assignment');
const checkTeacherStudentAccess = require('../middleware/checkTeacherStudentAccess');

/**
 * Uploads or updates grades for multiple students in bulk.
 */
const uploadGrades = async (body, user) => {
  const { classId, sectionId, subjectId, examType, grades } = body;

  if (!classId || !sectionId || !subjectId || !examType || !Array.isArray(grades)) {
    const error = new Error('Invalid request body. classId, sectionId, subjectId, examType, and grades array are required');
    error.statusCode = 400;
    throw error;
  }

  // 1. Authorization checks for teachers
  if (user.role === 'teacher') {
    const { hasAccess, teacher } = await checkTeacherStudentAccess(
      user._id || user.id,
      classId,
      sectionId,
      subjectId
    );

    if (!teacher) {
      const error = new Error('Teacher profile not found');
      error.statusCode = 403;
      throw error;
    }

    if (!hasAccess) {
      const error = new Error('Access Denied: You are not assigned to teach this subject in this class & section');
      error.statusCode = 403;
      throw error;
    }
  }

  // 2. Perform bulk upsert operations
  const settings = await Settings.findOne({ schoolId: 'default' });
  const academicYear = settings?.currentSession || '';

  const savedGrades = [];
  for (const record of grades) {
    const { studentId, marksObtained, totalMarks, comments } = record;

    if (!studentId || marksObtained === undefined || !totalMarks) {
      continue; // skip malformed records
    }

    // Verify the student belongs to the specified class and section
    const student = await Student.findOne({ _id: studentId, classId, sectionId });
    if (!student) {
      continue; // skip students not in this class/section
    }

    const updatedGrade = await Grade.findOneAndUpdate(
      { studentId, subjectId, examType, academicYear },
      {
        classId,
        sectionId,
        marksObtained,
        totalMarks,
        academicYear,
        comments: comments || '',
        gradedBy: user._id || user.id,
      },
      { new: true, upsert: true, runValidators: true }
    );
    savedGrades.push(updatedGrade);
  }

  return savedGrades;
};

/**
 * Returns grades for a specific student.
 */
const getStudentGrades = async (studentId, user) => {
  const student = await Student.findById(studentId);
  if (!student) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  // If teacher, check if they teach this student's class and section
  if (user.role === 'teacher') {
    const { hasAccess, teacher } = await checkTeacherStudentAccess(
      user._id || user.id,
      student.classId,
      student.sectionId
    );

    if (!teacher) {
      const error = new Error('Teacher profile not found');
      error.statusCode = 403;
      throw error;
    }

    if (!hasAccess) {
      const error = new Error("Access Denied: You do not teach this student's class section");
      error.statusCode = 403;
      throw error;
    }
  }

  const grades = await Grade.find({ studentId })
    .populate('subjectId', 'name')
    .populate('classId', 'name')
    .populate('sectionId', 'name')
    .populate('gradedBy', 'name');

  return grades;
};

/**
 * Returns grades for the logged-in student.
 */
const getMyGrades = async (user) => {
  let student;

  if (user.role === 'student') {
    student = await Student.findOne({ registrationNumber: user.registrationNumber });
  }

  if (!student) {
    const error = new Error('No student profile found linked to your account');
    error.statusCode = 404;
    throw error;
  }

  const grades = await Grade.find({ studentId: student._id })
    .populate('subjectId', 'name')
    .populate('classId', 'name')
    .populate('sectionId', 'name')
    .populate('gradedBy', 'name');

  return grades;
};

/**
 * Returns grades roster for a specific class, section, subject, and examType.
 */
const getClassGrades = async (query, user) => {
  const { classId, sectionId, subjectId, examType } = query;

  if (!classId || !sectionId || !subjectId) {
    const error = new Error('classId, sectionId, and subjectId are required');
    error.statusCode = 400;
    throw error;
  }

  // Teacher check
  if (user.role === 'teacher') {
    const { hasAccess, teacher } = await checkTeacherStudentAccess(
      user._id || user.id,
      classId,
      sectionId,
      subjectId
    );

    if (!teacher) {
      const error = new Error('Teacher profile not found');
      error.statusCode = 403;
      throw error;
    }

    if (!hasAccess) {
      const error = new Error('Access Denied: You are not assigned to teach this subject in this class section');
      error.statusCode = 403;
      throw error;
    }
  }

  const filter = { classId, sectionId, subjectId };
  if (examType) {
    filter.examType = examType;
  }

  const grades = await Grade.find(filter)
    .populate('studentId', 'fullName registrationNumber')
    .populate('subjectId', 'name');

  return grades;
};

module.exports = {
  uploadGrades,
  getStudentGrades,
  getMyGrades,
  getClassGrades,
};
