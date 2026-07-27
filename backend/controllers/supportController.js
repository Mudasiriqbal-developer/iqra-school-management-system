const SupportTicket = require('../models/SupportTicket');
const User = require('../models/User');
const { sendSupportTicketNotificationEmail } = require('../utils/emailService');

/**
 * @desc    Create a new support ticket
 * @route   POST /api/support/tickets
 * @access  Private (Admin / Teacher)
 */
const createTicket = async (req, res, next) => {
  try {
    const { category, subject, message } = req.body;

    if (!category || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide category, subject, and message',
      });
    }

    const ticket = await SupportTicket.create({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      category,
      subject,
      message,
    });

    // Send email notification to Admin
    try {
      // Find all admin emails in the system
      const admins = await User.find({ role: 'admin' }).select('email');
      let adminEmails = admins.map(admin => admin.email).filter(Boolean);

      if (adminEmails.length === 0 && process.env.EMAIL_USER) {
        adminEmails = [process.env.EMAIL_USER];
      }

      if (adminEmails.length > 0) {
        await sendSupportTicketNotificationEmail(adminEmails, ticket, req.user);
      }
    } catch (emailErr) {
      // Log email failure but don't crash/fail the HTTP response
      console.error('Failed to send admin notification email:', emailErr);
    }

    res.status(201).json({
      success: true,
      data: ticket,
      message: 'Support ticket submitted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all support tickets (newest first)
 * @route   GET /api/support/tickets
 * @access  Private (Admin Only)
 */
const getAllTickets = async (req, res, next) => {
  try {
    const tickets = await SupportTicket.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: tickets,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get logged-in user's own tickets (newest first)
 * @route   GET /api/support/tickets/my
 * @access  Private (Admin / Teacher)
 */
const getMyTickets = async (req, res, next) => {
  try {
    const tickets = await SupportTicket.find({ userId: req.user._id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: tickets,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update support ticket status
 * @route   PATCH /api/support/tickets/:id
 * @access  Private (Admin Only)
 */
const updateTicketStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!status || !['Open', 'In Progress', 'Resolved'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid status: Open, In Progress, or Resolved',
      });
    }

    const ticket = await SupportTicket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    ticket.status = status;
    await ticket.save();

    res.status(200).json({
      success: true,
      data: ticket,
      message: `Ticket status updated to ${status}`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTicket,
  getAllTickets,
  getMyTickets,
  updateTicketStatus,
};
