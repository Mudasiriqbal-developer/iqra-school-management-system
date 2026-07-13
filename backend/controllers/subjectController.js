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

    // Find all classes with the same name (all gender variants of this grade)
    const siblingClasses = await Class.find({ name: classExists.name });

    let targetSubject = null;

    for (const siblingClass of siblingClasses) {
      // check if subject already exists for this siblingClass
      let siblingSubject = await Subject.findOne({ name, classId: siblingClass._id });
      if (!siblingSubject) {
        siblingSubject = await Subject.create({ name, classId: siblingClass._id });
      }
      if (siblingClass._id.toString() === classId.toString()) {
        targetSubject = siblingSubject;
      }
    }

    if (!targetSubject) {
      targetSubject = await Subject.findOne({ name, classId });
    }

    return res.status(201).json({
      success: true,
      data: targetSubject,
      message: 'Subject created successfully across all gender variants of this grade',
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
      .sort({ orderIndex: 1, createdAt: 1 });

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
    const { name } = req.body;

    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Subject not found',
      });
    }

    const parentClass = await Class.findById(subject.classId);
    if (!parentClass) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Parent class not found',
      });
    }

    const originalName = subject.name;

    // Find all sibling classes of this grade
    const siblingClasses = await Class.find({ name: parentClass.name });
    const siblingClassIds = siblingClasses.map(c => c._id);

    // Update all subjects with name = originalName in those sibling classes
    await Subject.updateMany(
      { name: originalName, classId: { $in: siblingClassIds } },
      { $set: { name } }
    );

    // Fetch updated subject to return
    const updatedSubject = await Subject.findById(req.params.id).populate('classId', 'name');

    return res.status(200).json({
      success: true,
      data: populated = updatedSubject,
      message: 'Subject updated successfully across all gender variants of this grade',
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

    const parentClass = await Class.findById(subject.classId);
    if (!parentClass) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Parent class not found',
      });
    }

    const originalName = subject.name;

    // Find all sibling classes of this grade
    const siblingClasses = await Class.find({ name: parentClass.name });
    const siblingClassIds = siblingClasses.map(c => c._id);

    // Find all subjects sharing this name in those classes
    const subjectsToDelete = await Subject.find({ name: originalName, classId: { $in: siblingClassIds } });
    const subjectIdsToDelete = subjectsToDelete.map(s => s._id);

    // Check if any Assignments reference any of these subjects
    const assignmentsCount = await Assignment.countDocuments({ subjectId: { $in: subjectIdsToDelete } });
    if (assignmentsCount > 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Cannot delete Subject because it is referenced by an Assignment in one or more gender variants.',
      });
    }

    // Delete all of them
    await Subject.deleteMany({ _id: { $in: subjectIdsToDelete } });

    return res.status(200).json({
      success: true,
      data: null,
      message: 'Subject deleted successfully across all gender variants of this grade',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reorder subjects
 * @route   PUT /api/subjects/reorder
 * @access  Private (Admin)
 */
const reorderSubjects = async (req, res, next) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({
        success: false,
        message: 'orderedIds must be an array of Subject IDs',
      });
    }

    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { orderIndex: index } },
      },
    }));

    await Subject.bulkWrite(bulkOps);

    return res.status(200).json({
      success: true,
      message: 'Subjects reordered successfully',
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
  reorderSubjects,
};
