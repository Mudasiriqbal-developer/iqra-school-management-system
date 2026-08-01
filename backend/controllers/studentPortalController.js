const studentPortalService = require('../services/studentPortalService');

/**
 * @desc    Get the logged-in student's own profile
 * @route   GET /api/students/me/profile
 * @access  Private (Student)
 */
const getMyProfile = async (req, res, next) => {
  try {
    const data = await studentPortalService.getMyProfile(req.user);
    return res.status(200).json({
      success: true,
      data,
      message: 'Student profile fetched successfully',
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        data: null,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * @desc    Get the logged-in student's attendance rate and records
 * @route   GET /api/students/me/attendance
 * @access  Private (Student)
 */
const getMyAttendance = async (req, res, next) => {
  try {
    const data = await studentPortalService.getMyAttendance(req.user, req.query);
    return res.status(200).json({
      success: true,
      data,
      message: 'Attendance fetched successfully',
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        data: null,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * @desc    Get subjects assigned to the logged-in student's class and section
 * @route   GET /api/students/me/subjects
 * @access  Private (Student)
 */
const getMySubjects = async (req, res, next) => {
  try {
    const data = await studentPortalService.getMySubjects(req.user);
    return res.status(200).json({
      success: true,
      data,
      message: 'Subjects fetched successfully',
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        data: null,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * @desc    Get the logged-in student's fee info and payment history
 * @route   GET /api/students/me/fees
 * @access  Private (Student)
 */
const getMyFeeHistory = async (req, res, next) => {
  try {
    const data = await studentPortalService.getMyFeeHistory(req.user);
    return res.status(200).json({
      success: true,
      data,
      message: 'Fee history fetched successfully',
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        data: null,
        message: error.message,
      });
    }
    next(error);
  }
};

module.exports = {
  getMyProfile,
  getMyAttendance,
  getMySubjects,
  getMyFeeHistory,
};
