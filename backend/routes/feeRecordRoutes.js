const express = require('express');
const {
  getStudentFeeRecord,
  getStudentLedger,
  recordPayment,
  generateReceiptPDF,
  getCurrentMonthFeeList
} = require('../controllers/feeRecordController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply auth middleware to protect and restrict all routes in this file to admin only
router.use(protect);
router.use(authorize('admin'));

router.get('/current-month', getCurrentMonthFeeList);
router.get('/student/:studentId/current', getStudentFeeRecord);
router.get('/student/:studentId', getStudentLedger);
router.get('/student/:studentId/receipt-pdf', generateReceiptPDF);
router.post('/:id/pay', recordPayment);

module.exports = router;
