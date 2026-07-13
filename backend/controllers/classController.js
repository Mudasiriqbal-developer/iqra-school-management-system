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
    const { name, gender } = req.body;
    const classGender = gender || 'mixed';

    const existingClass = await Class.findOne({ name, gender: classGender });
    if (existingClass) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Class with this name and gender already exists',
      });
    }

    const newClass = await Class.create({ name, gender: classGender });

    // Copy over existing subjects for this grade if any sibling class exists
    try {
      const siblingClass = await Class.findOne({ name, _id: { $ne: newClass._id } });
      if (siblingClass) {
        const siblingSubjects = await Subject.find({ classId: siblingClass._id });
        if (siblingSubjects && siblingSubjects.length > 0) {
          const subjectsToCreate = siblingSubjects.map(sub => ({
            name: sub.name,
            classId: newClass._id,
            orderIndex: sub.orderIndex || 0
          }));
          await Subject.insertMany(subjectsToCreate);
        }
      }
    } catch (subjectCopyError) {
      console.error('Failed to copy subjects for newly created class variant:', subjectCopyError);
    }

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
    const classes = await Class.find().sort({ orderIndex: 1, createdAt: 1 });

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
    const { name, gender } = req.body;

    const singleClass = await Class.findById(req.params.id);
    if (!singleClass) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Class not found',
      });
    }

    const targetName = name || singleClass.name;
    const targetGender = gender || singleClass.gender;

    if (name || gender) {
      const duplicateClass = await Class.findOne({ name: targetName, gender: targetGender });
      if (duplicateClass && duplicateClass._id.toString() !== req.params.id) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'Class with this name and gender already exists',
        });
      }
    }

    singleClass.name = targetName;
    singleClass.gender = targetGender;
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

/**
 * @desc    Reorder classes
 * @route   PUT /api/classes/reorder
 * @access  Private (Admin)
 */
const reorderClasses = async (req, res, next) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({
        success: false,
        message: 'orderedIds must be an array of Class IDs',
      });
    }

    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { orderIndex: index } },
      },
    }));

    await Class.bulkWrite(bulkOps);

    return res.status(200).json({
      success: true,
      message: 'Classes reordered successfully',
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
  reorderClasses,
};
