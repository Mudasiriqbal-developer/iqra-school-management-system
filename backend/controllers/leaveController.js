const LeaveRequest = require('../models/LeaveRequest');
const Teacher = require('../models/Teacher');

/**
 * @desc    Submit a new leave request
 * @route   POST /api/leaves
 * @access  Private (Teacher Only)
 */
const submitLeaveRequest = async (req, res, next) => {
  try {
    const { startDate, endDate, category, reason } = req.body;

    // Find teacher profile using logged in user's ID
    const teacher = await Teacher.findOne({ userId: req.user._id });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Teacher profile not found for the logged-in account',
      });
    }

    // Validate date logic
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Start date cannot be after end date',
      });
    }

    const leaveRequest = await LeaveRequest.create({
      teacherId: teacher._id,
      startDate: start,
      endDate: end,
      category,
      reason,
      status: 'pending',
    });

    return res.status(201).json({
      success: true,
      data: leaveRequest,
      message: 'Leave request submitted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all leave requests of the logged-in teacher
 * @route   GET /api/leaves/my-leaves
 * @access  Private (Teacher Only)
 */
const getMyLeaveRequests = async (req, res, next) => {
  try {
    // Find teacher profile using logged in user's ID
    const teacher = await Teacher.findOne({ userId: req.user._id });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Teacher profile not found for the logged-in account',
      });
    }

    const leaves = await LeaveRequest.find({ teacherId: teacher._id })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: leaves,
      message: 'Your leave requests retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all pending leave requests
 * @route   GET /api/leaves/admin/pending
 * @access  Private (Admin Only)
 */
const getPendingLeaveRequests = async (req, res, next) => {
  try {
    const pendingRequests = await LeaveRequest.find({ status: 'pending' })
      .populate({
        path: 'teacherId',
        populate: {
          path: 'userId',
          select: 'name email phone',
        },
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: pendingRequests,
      message: 'Pending leave requests retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all leave requests with filters (optional status, teacherId, category)
 * @route   GET /api/leaves/admin/all
 * @access  Private (Admin Only)
 */
const getAllLeaveRequests = async (req, res, next) => {
  try {
    const { status, category, teacherId } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    }
    if (category) {
      filter.category = category;
    }
    if (teacherId) {
      filter.teacherId = teacherId;
    }

    const leaves = await LeaveRequest.find(filter)
      .populate({
        path: 'teacherId',
        populate: {
          path: 'userId',
          select: 'name email phone',
        },
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: leaves,
      message: 'All leave requests retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update status of a leave request (Approve/Reject)
 * @route   PUT /api/leaves/admin/:id/status
 * @access  Private (Admin Only)
 */
const updateLeaveStatus = async (req, res, next) => {
  try {
    const { status, adminComments } = req.body;
    const leaveId = req.params.id;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Status must be approved or rejected',
      });
    }

    const leaveRequest = await LeaveRequest.findById(leaveId);
    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Leave request not found',
      });
    }

    leaveRequest.status = status;
    if (adminComments !== undefined) {
      leaveRequest.adminComments = adminComments;
    }

    const updatedLeave = await leaveRequest.save();

    const populated = await updatedLeave.populate({
      path: 'teacherId',
      populate: {
        path: 'userId',
        select: 'name email phone',
      },
    });

    return res.status(200).json({
      success: true,
      data: populated,
      message: `Leave request has been successfully ${status}`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitLeaveRequest,
  getMyLeaveRequests,
  getPendingLeaveRequests,
  getAllLeaveRequests,
  updateLeaveStatus,
};
