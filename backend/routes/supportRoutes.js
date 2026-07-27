const express = require('express');
const { check } = require('express-validator');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validationMiddleware');
const {
  createTicket,
  getAllTickets,
  getMyTickets,
  updateTicketStatus,
} = require('../controllers/supportController');

const router = express.Router();

// All routes require authentication
router.use(protect);

/**
 * @route   POST /api/support/tickets
 * @desc    Create a new support ticket
 * @access  Private (Admin / Teacher)
 */
router.post(
  '/tickets',
  [
    check('category', 'Category is required and must be a valid option')
      .trim()
      .isIn(['Technical Issue', 'Fee Query', 'Account Access', 'Feature Request', 'Other']),
    check('subject', 'Subject is required').trim().notEmpty(),
    check('message', 'Message is required').trim().notEmpty(),
  ],
  validateRequest,
  createTicket
);

/**
 * @route   GET /api/support/tickets/my
 * @desc    Get logged-in user's own tickets
 * @access  Private (Admin / Teacher)
 */
router.get('/tickets/my', getMyTickets);

/**
 * @route   GET /api/support/tickets
 * @desc    Get all support tickets (newest first)
 * @access  Private (Admin Only)
 */
router.get('/tickets', authorize('admin'), getAllTickets);

/**
 * @route   PATCH /api/support/tickets/:id
 * @desc    Update support ticket status
 * @access  Private (Admin Only)
 */
router.patch(
  '/tickets/:id',
  authorize('admin'),
  [
    check('status', 'Status is required and must be Open, In Progress, or Resolved')
      .trim()
      .isIn(['Open', 'In Progress', 'Resolved']),
  ],
  validateRequest,
  updateTicketStatus
);

module.exports = router;
