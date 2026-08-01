const studentService = require('../services/studentService');

/**
 * @desc    Create a new student
 * @route   POST /api/students
 * @access  Private (Admin)
 */
const createStudent = async (req, res, next) => {
  try {
    const student = await studentService.createStudent(req.body);
    return res.status(201).json({
      success: true,
      data: student,
      message: 'Student created successfully',
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
 * @desc    Get all students (with filtering, search, pagination, and teacher restrictions)
 * @route   GET /api/students
 * @access  Private (Admin, Teacher)
 */
const getAllStudents = async (req, res, next) => {
  try {
    const { data, message } = await studentService.getAllStudents(req.query, req.user);
    return res.status(200).json({
      success: true,
      data,
      message,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        data: error.data || null,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * @desc    Get student by ID
 * @route   GET /api/students/:id
 * @access  Private (Admin, Teacher)
 */
const getStudentById = async (req, res, next) => {
  try {
    const student = await studentService.getStudentById(req.params.id, req.user);
    return res.status(200).json({
      success: true,
      data: student,
      message: 'Student fetched successfully',
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
 * @desc    Update a student
 * @route   PUT /api/students/:id
 * @access  Private (Admin)
 */
const updateStudent = async (req, res, next) => {
  try {
    const student = await studentService.updateStudent(req.params.id, req.body);
    return res.status(200).json({
      success: true,
      data: student,
      message: 'Student updated successfully',
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
 * @desc    Delete a student (Soft delete via status field)
 * @route   DELETE /api/students/:id
 * @access  Private (Admin)
 */
const deleteStudent = async (req, res, next) => {
  try {
    const student = await studentService.deleteStudent(req.params.id);
    return res.status(200).json({
      success: true,
      data: student,
      message: 'Student deleted successfully (soft delete: status set to suspended)',
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
 * @desc    Reset student password (Admin only)
 * @route   PUT /api/students/:id/reset-password
 * @access  Private (Admin)
 */
const resetStudentPassword = async (req, res, next) => {
  try {
    const message = await studentService.resetStudentPassword(req.params.id, req.body.password);
    return res.status(200).json({
      success: true,
      message,
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
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  resetStudentPassword,
};
