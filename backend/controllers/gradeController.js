const Grade = require('../models/Grade');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Assignment = require('../models/Assignment');

/**
 * @desc    Upload or update grades for multiple students in a class/section/subject (Bulk Upsert)
 * @route   POST /api/grades
 * @access  Private (Admin, Teacher)
 */
const uploadGrades = async (req, res, next) => {
  try {
    const { classId, sectionId, subjectId, examType, grades } = req.body;

    if (!classId || !sectionId || !subjectId || !examType || !Array.isArray(grades)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request body. classId, sectionId, subjectId, examType, and grades array are required',
      });
    }

    // 1. Authorization checks for teachers
    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ userId: req.user._id });
      if (!teacher) {
        return res.status(403).json({
          success: false,
          message: 'Teacher profile not found',
        });
      }

      // Check assignment
      const assigned = await Assignment.findOne({
        teacherId: teacher._id,
        classId,
        sectionId,
        subjectId,
      });

      if (!assigned) {
        return res.status(403).json({
          success: false,
          message: 'Access Denied: You are not assigned to teach this subject in this class & section',
        });
      }
    }

    // 2. Perform bulk upsert operations
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
        { studentId, subjectId, examType },
        {
          classId,
          sectionId,
          marksObtained,
          totalMarks,
          comments: comments || '',
          gradedBy: req.user._id,
        },
        { new: true, upsert: true, runValidators: true }
      );
      savedGrades.push(updatedGrade);
    }

    return res.status(200).json({
      success: true,
      data: savedGrades,
      message: `Successfully updated ${savedGrades.length} student grade records`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get grades for a specific student
 * @route   GET /api/grades/student/:studentId
 * @access  Private (Admin, Teacher)
 */
const getStudentGrades = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // If teacher, check if they teach this student's class and section
    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ userId: req.user._id });
      if (!teacher) {
        return res.status(403).json({
          success: false,
          message: 'Teacher profile not found',
        });
      }

      const assigned = await Assignment.findOne({
        teacherId: teacher._id,
        classId: student.classId,
        sectionId: student.sectionId,
      });

      if (!assigned) {
        return res.status(403).json({
          success: false,
          message: 'Access Denied: You do not teach this student\'s class section',
        });
      }
    }

    const grades = await Grade.find({ studentId })
      .populate('subjectId', 'name')
      .populate('classId', 'name')
      .populate('sectionId', 'name')
      .populate('gradedBy', 'name');

    return res.status(200).json({
      success: true,
      data: grades,
      message: 'Student grades fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get logged-in student's (or linked parent's child) own grades
 * @route   GET /api/grades/me
 * @access  Private (Student, Parent)
 */
const getMyGrades = async (req, res, next) => {
  try {
    let student;

    if (req.user.role === 'student') {
      student = await Student.findOne({ email: req.user.email });
    } else if (req.user.role === 'parent') {
      // Find any student linked to this parent email
      student = await Student.findOne({ parentEmail: req.user.email });
      if (!student) {
        // Fallback: check if they specified a studentId query param (for parent child switching)
        const { studentId } = req.query;
        if (studentId) {
          student = await Student.findById(studentId);
        }
      }
    }

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'No student profile found linked to your account',
      });
    }

    const grades = await Grade.find({ studentId: student._id })
      .populate('subjectId', 'name')
      .populate('classId', 'name')
      .populate('sectionId', 'name')
      .populate('gradedBy', 'name');

    return res.status(200).json({
      success: true,
      data: grades,
      message: 'My grades fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get grades roster for a specific class, section, subject and examType
 * @route   GET /api/grades/class-section
 * @access  Private (Admin, Teacher)
 */
const getClassGrades = async (req, res, next) => {
  try {
    const { classId, sectionId, subjectId, examType } = req.query;

    if (!classId || !sectionId || !subjectId) {
      return res.status(400).json({
        success: false,
        message: 'classId, sectionId, and subjectId are required',
      });
    }

    // Teacher check
    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ userId: req.user._id });
      if (!teacher) {
        return res.status(403).json({
          success: false,
          message: 'Teacher profile not found',
        });
      }

      const assigned = await Assignment.findOne({
        teacherId: teacher._id,
        classId,
        sectionId,
        subjectId,
      });

      if (!assigned) {
        return res.status(403).json({
          success: false,
          message: 'Access Denied: You are not assigned to teach this subject in this class section',
        });
      }
    }

    const filter = { classId, sectionId, subjectId };
    if (examType) {
      filter.examType = examType;
    }

    const grades = await Grade.find(filter)
      .populate('studentId', 'fullName registrationNumber')
      .populate('subjectId', 'name');

    return res.status(200).json({
      success: true,
      data: grades,
      message: 'Class grades fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadGrades,
  getStudentGrades,
  getMyGrades,
  getClassGrades,
};
