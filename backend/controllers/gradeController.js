const gradeService = require('../services/gradeService');

/**
 * @desc    Upload or update grades for multiple students in a class/section/subject (Bulk Upsert)
 * @route   POST /api/grades
 * @access  Private (Admin, Teacher)
 */
const uploadGrades = async (req, res, next) => {
  try {
    const savedGrades = await gradeService.uploadGrades(req.body, req.user);
    return res.status(200).json({
      success: true,
      data: savedGrades,
      message: `Successfully updated ${savedGrades.length} student grade records`,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
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
    const grades = await gradeService.getStudentGrades(req.params.studentId, req.user);
    return res.status(200).json({
      success: true,
      data: grades,
      message: 'Student grades fetched successfully',
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
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
    const grades = await gradeService.getMyGrades(req.user);
    return res.status(200).json({
      success: true,
      data: grades,
      message: 'My grades fetched successfully',
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
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
    const grades = await gradeService.getClassGrades(req.query, req.user);
    return res.status(200).json({
      success: true,
      data: grades,
      message: 'Class grades fetched successfully',
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

module.exports = {
  uploadGrades,
  getStudentGrades,
  getMyGrades,
  getClassGrades,
};
