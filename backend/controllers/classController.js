const Class = require('../models/Class');
const Section = require('../models/Section');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const Assignment = require('../models/Assignment');

/**
 * @desc    Create a new class
 * @route   POST /api/classes
 * @access  Private (Admin)
 */
const createClass = async (req, res, next) => {
  try {
    const { name } = req.body;

    const existingClass = await Class.findOne({ name });
    if (existingClass) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Class with this name already exists',
      });
    }

    const newClass = await Class.create({ name });

    return res.status(201).json({
      success: true,
      data: newClass,
      message: 'Class created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all classes
 * @route   GET /api/classes
 * @access  Private (Admin, Teacher)
 */
const getAllClasses = async (req, res, next) => {
  try {
    const classes = await Class.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: classes,
      message: 'Classes fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get class by ID
 * @route   GET /api/classes/:id
 * @access  Private (Admin, Teacher)
 */
const getClassById = async (req, res, next) => {
  try {
    const singleClass = await Class.findById(req.params.id);
    if (!singleClass) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Class not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: singleClass,
      message: 'Class fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a class
 * @route   PUT /api/classes/:id
 * @access  Private (Admin)
 */
const updateClass = async (req, res, next) => {
  try {
    const { name } = req.body;

    const singleClass = await Class.findById(req.params.id);
    if (!singleClass) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Class not found',
      });
    }

    if (name && name !== singleClass.name) {
      const duplicateClass = await Class.findOne({ name });
      if (duplicateClass) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'Class with this name already exists',
        });
      }
    }

    singleClass.name = name || singleClass.name;
    const updatedClass = await singleClass.save();

    return res.status(200).json({
      success: true,
      data: updatedClass,
      message: 'Class updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a class
 * @route   DELETE /api/classes/:id
 * @access  Private (Admin)
 */
const deleteClass = async (req, res, next) => {
  try {
    const singleClass = await Class.findById(req.params.id);
    if (!singleClass) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Class not found',
      });
    }

    // Check for child records referencing this class
    const sectionsCount = await Section.countDocuments({ classId: req.params.id });
    const subjectsCount = await Subject.countDocuments({ classId: req.params.id });
    const studentsCount = await Student.countDocuments({ classId: req.params.id });
    const assignmentsCount = await Assignment.countDocuments({ classId: req.params.id });

    if (sectionsCount > 0 || subjectsCount > 0 || studentsCount > 0 || assignmentsCount > 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Cannot delete Class because it is referenced by other records (Section, Subject, Student, or Assignment).',
      });
    }

    await Class.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      data: null,
      message: 'Class deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createClass,
  getAllClasses,
  getClassById,
  updateClass,
  deleteClass,
};
