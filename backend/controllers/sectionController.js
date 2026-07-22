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
    const filter = {};
    if (req.query.classId) {
      filter.classId = req.query.classId;
    }

    const sections = await Section.find(filter)
      .populate('classId', 'name')
      .sort({ orderIndex: 1, createdAt: 1 });

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

/**
 * @desc    Assign class teacher to section
 * @route   PUT /api/sections/:id/class-teacher
 * @access  Private (Admin)
 */
const assignClassTeacher = async (req, res, next) => {
  try {
    const { teacherId } = req.body;

    const section = await Section.findById(req.params.id);
    if (!section) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Section not found',
      });
    }

    // Check if this teacherId is already classTeacherId of a DIFFERENT section
    const otherSection = await Section.findOne({
      classTeacherId: teacherId,
      _id: { $ne: req.params.id },
    }).populate('classId');

    if (otherSection) {
      const className = otherSection.classId ? otherSection.classId.name : 'Unknown Class';
      return res.status(409).json({
        success: false,
        data: null,
        message: `This teacher is already the Class Teacher of ${className}/${otherSection.name}. Unassign them first.`,
      });
    }

    section.classTeacherId = teacherId;
    await section.save();

    // Populate classTeacherId -> userId -> name
    const populated = await Section.findById(section._id)
      .populate({
        path: 'classTeacherId',
        populate: {
          path: 'userId',
          select: 'name',
        },
      })
      .populate('classId', 'name');

    return res.status(200).json({
      success: true,
      data: populated,
      message: 'Class teacher assigned successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Unassign class teacher from section
 * @route   DELETE /api/sections/:id/class-teacher
 * @access  Private (Admin)
 */
const unassignClassTeacher = async (req, res, next) => {
  try {
    const section = await Section.findById(req.params.id);
    if (!section) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Section not found',
      });
    }

    section.classTeacherId = undefined;
    await section.save();

    const populated = await Section.findById(section._id)
      .populate('classId', 'name');

    return res.status(200).json({
      success: true,
      data: populated,
      message: 'Class teacher unassigned successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reorder sections
 * @route   PUT /api/sections/reorder
 * @access  Private (Admin)
 */
const reorderSections = async (req, res, next) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({
        success: false,
        message: 'orderedIds must be an array of Section IDs',
      });
    }

    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { orderIndex: index } },
      },
    }));

    await Section.bulkWrite(bulkOps);

    return res.status(200).json({
      success: true,
      message: 'Sections reordered successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSection,
  getAllSections,
  updateSection,
  deleteSection,
  assignClassTeacher,
  unassignClassTeacher,
  reorderSections,
};
