const express = require('express');
const {
  getFeeDefaulters,
  exportMonthlyCollectionsCSV,
  exportMonthlyCollectionsPDF,
  exportFeeDefaultersPDF,
  getClassWiseAttendanceSummary
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All report routes are private and restricted to admin only
router.use(protect);
router.use(authorize('admin'));

router.get('/fee-defaulters', getFeeDefaulters);
router.get('/fee-defaulters/export-pdf', exportFeeDefaultersPDF);
router.get('/collections/export', exportMonthlyCollectionsCSV);
router.get('/collections/export-pdf', exportMonthlyCollectionsPDF);
router.get('/attendance-summary', getClassWiseAttendanceSummary);

module.exports = router;
