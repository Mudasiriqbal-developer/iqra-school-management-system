const express = require('express');
const {
  getFeeSummary,
  getCollectedStudents,
  getPartialStudents,
  getRemainingStudents,
  exportDrillDownPDF
} = require('../controllers/feeController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply auth middleware to protect and restrict all routes in this file to admin only
router.use(protect);
router.use(authorize('admin'));

router.get('/summary', getFeeSummary);
router.get('/collected-students', getCollectedStudents);
router.get('/partial-students', getPartialStudents);
router.get('/remaining-students', getRemainingStudents);
router.get('/drilldown/export-pdf', exportDrillDownPDF);

module.exports = router;
