const Assignment = require('../models/Assignment');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const Section = require('../models/Section');
const Subject = require('../models/Subject');

/**
 * @desc    Create a new teacher assignment
 * @route   POST /api/assignments
 * @access  Private (Admin)
 */
const createAssignment = async (req, res, next) => {
  try {
    const { teacherId, classId, sectionId, subjectId } = req.body;

    // 1. Verify existence of Teacher, Class, Section, and Subject
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Teacher profile not found',
      });
    }

    const singleClass = await Class.findById(classId);
    if (!singleClass) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Class not found',
      });
    }

    const section = await Section.findById(sectionId);
    if (!section) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Section not found',
      });
    }

    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Subject not found',
      });
    }

    // 2. Validate section & subject belong to class
    if (section.classId.toString() !== classId) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'The selected section does not belong to the selected class',
      });
    }

    if (subject.classId.toString() !== classId) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'The selected subject does not belong to the selected class',
      });
    }

    // 3. Validate unique assignment combination of classId + sectionId + subjectId
    const existingAssignment = await Assignment.findOne({ classId, sectionId, subjectId });
    if (existingAssignment) {
      return res.status(409).json({
        success: false,
        data: null,
        message: 'A teacher is already assigned to this Class, Section, and Subject combination',
      });
    }

    // 4. Create assignment
    const assignment = await Assignment.create({
      teacherId,
      classId,
      sectionId,
      subjectId,
    });

    const populated = await assignment.populate([
      { path: 'teacherId', populate: { path: 'userId', select: 'name email' } },
      { path: 'classId', select: 'name' },
      { path: 'sectionId', select: 'name' },
      { path: 'subjectId', select: 'name' },
    ]);

    return res.status(201).json({
      success: true,
      data: populated,
      message: 'Teacher assigned successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all teacher assignments
 * @route   GET /api/assignments
 * @access  Private (Admin)
 */
const getAllAssignments = async (req, res, next) => {
  try {
    const assignments = await Assignment.find()
      .populate({
        path: 'teacherId',
        populate: { path: 'userId', select: 'name email' },
      })
      .populate('classId', 'name')
      .populate('sectionId', 'name')
      .populate('subjectId', 'name')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: assignments,
      message: 'All assignments fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current teacher's assignments
 * @route   GET /api/assignments/my-assignments
 * @access  Private (Teacher)
 */
const getMyAssignments = async (req, res, next) => {
  try {
    // 1. Find teacher profile by req.user.id
    const teacher = await Teacher.findOne({ userId: req.user.id });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Teacher profile not found for this user',
      });
    }

    // 2. Find assignments for this teacher
    const assignments = await Assignment.find({ teacherId: teacher._id })
      .populate('classId', 'name')
      .populate('sectionId', 'name')
      .populate('subjectId', 'name')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: assignments,
      message: 'My assignments fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete/remove an assignment
 * @route   DELETE /api/assignments/:id
 * @access  Private (Admin)
 */
const deleteAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Assignment not found',
      });
    }

    await Assignment.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      data: null,
      message: 'Assignment removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAssignment,
  getAllAssignments,
  getMyAssignments,
  deleteAssignment,
};
