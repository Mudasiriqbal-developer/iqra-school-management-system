const express = require('express');
const { getDashboardSummary } = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

/**
 * @route   GET /api/dashboard/summary
 * @desc    Get dashboard summary statistics
 * @access  Private (Admin Only)
 */
router.get('/summary', authorize('admin'), getDashboardSummary);

module.exports = router;
