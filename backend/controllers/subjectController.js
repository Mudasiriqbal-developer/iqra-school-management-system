const Subject = require('../models/Subject');
const Assignment = require('../models/Assignment');
const Class = require('../models/Class');

/**
 * @desc    Create a new subject
 * @route   POST /api/subjects
 * @access  Private (Admin)
 */
const createSubject = async (req, res, next) => {
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

    const subject = await Subject.create({ name, classId });

    return res.status(201).json({
      success: true,
      data: subject,
      message: 'Subject created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all subjects
 * @route   GET /api/subjects
 * @access  Private (Admin, Teacher)
 */
const getAllSubjects = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.classId) {
      filter.classId = req.query.classId;
    }

    const subjects = await Subject.find(filter)
      .populate('classId', 'name')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: subjects,
      message: 'Subjects fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get subject by ID
 * @route   GET /api/subjects/:id
 * @access  Private (Admin, Teacher)
 */
const getSubjectById = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id).populate('classId', 'name');
    if (!subject) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Subject not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: subject,
      message: 'Subject fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a subject
 * @route   PUT /api/subjects/:id
 * @access  Private (Admin)
 */
const updateSubject = async (req, res, next) => {
  try {
    const { name, classId } = req.body;

    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Subject not found',
      });
    }

    if (classId) {
      const classExists = await Class.findById(classId);
      if (!classExists) {
        return res.status(404).json({
          success: false,
          data: null,
          message: 'Associated Class not found',
        });
      }
      subject.classId = classId;
    }

    if (name) {
      subject.name = name;
    }

    const updatedSubject = await subject.save();
    const populated = await updatedSubject.populate('classId', 'name');

    return res.status(200).json({
      success: true,
      data: populated,
      message: 'Subject updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a subject
 * @route   DELETE /api/subjects/:id
 * @access  Private (Admin)
 */
const deleteSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Subject not found',
      });
    }

    // Check if Assignments reference this Subject
    const assignmentsCount = await Assignment.countDocuments({ subjectId: req.params.id });
    if (assignmentsCount > 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Cannot delete Subject because it is referenced by an Assignment.',
      });
    }

    await Subject.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      data: null,
      message: 'Subject deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSubject,
  getAllSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
};
