const Section = require('../models/Section');
const Student = require('../models/Student');
const Assignment = require('../models/Assignment');
const Class = require('../models/Class');

/**
 * @desc    Create a new section
 * @route   POST /api/sections
 * @access  Private (Admin)
 */
const createSection = async (req, res, next) => {
  try {
    const { name, classId } = req.body;

    // Check if class exists
    const classExists = await Class.findById(classId);
    if (!classExists) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Associated Class not found',
      });
    }

    // Check unique combination
    const existingSection = await Section.findOne({ name, classId });
    if (existingSection) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Section with this name already exists in the selected class',
      });
    }

    const section = await Section.create({ name, classId });

    return res.status(201).json({
      success: true,
      data: section,
      message: 'Section created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all sections
 * @route   GET /api/sections
 * @access  Private (Admin, Teacher)
 */
const getAllSections = async (req, res, next) => {
  try {
    const sections = await Section.find()
      .populate('classId', 'name')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: sections,
      message: 'Sections fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get section by ID
 * @route   GET /api/sections/:id
 * @access  Private (Admin, Teacher)
 */
const getSectionById = async (req, res, next) => {
  try {
    const section = await Section.findById(req.params.id).populate('classId', 'name');
    if (!section) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Section not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: section,
      message: 'Section fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a section
 * @route   PUT /api/sections/:id
 * @access  Private (Admin)
 */
const updateSection = async (req, res, next) => {
  try {
    const { name, classId } = req.body;

    const section = await Section.findById(req.params.id);
    if (!section) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Section not found',
      });
    }

    const targetClassId = classId || section.classId;
    const targetName = name || section.name;

    // Check if class exists
    if (classId) {
      const classExists = await Class.findById(classId);
      if (!classExists) {
        return res.status(404).json({
          success: false,
          data: null,
          message: 'Associated Class not found',
        });
      }
    }

    // Check unique combination if name or classId changed
    if (name || classId) {
      const duplicateSection = await Section.findOne({ name: targetName, classId: targetClassId });
      if (duplicateSection && duplicateSection._id.toString() !== req.params.id) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'Section with this name already exists in that class',
        });
      }
    }

    section.name = targetName;
    section.classId = targetClassId;

    const updatedSection = await section.save();
    const populated = await updatedSection.populate('classId', 'name');

    return res.status(200).json({
      success: true,
      data: populated,
      message: 'Section updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a section
 * @route   DELETE /api/sections/:id
 * @access  Private (Admin)
 */
const deleteSection = async (req, res, next) => {
  try {
    const section = await Section.findById(req.params.id);
    if (!section) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Section not found',
      });
    }

    // Check if Students or Assignments reference this Section
    const studentsCount = await Student.countDocuments({ sectionId: req.params.id });
    const assignmentsCount = await Assignment.countDocuments({ sectionId: req.params.id });

    if (studentsCount > 0 || assignmentsCount > 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Cannot delete Section because it is referenced by other records (Student or Assignment).',
      });
    }

    await Section.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      data: null,
      message: 'Section deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSection,
  getAllSections,
  getSectionById,
  updateSection,
  deleteSection,
};
