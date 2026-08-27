const express = require('express');
const {
  getStudentLedger,
  recordPayment,
  generateReceiptPDF,
  getCurrentMonthFeeList,
  issueOneTimeCharge,
  getOneTimeChargesReport,
  updateOneTimeCharge,
  deleteOneTimeCharge
} = require('../controllers/feeRecordController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply auth middleware to protect and restrict all routes in this file to admin only
router.use(protect);
router.use(authorize('admin'));

router.get('/current-month', getCurrentMonthFeeList);
router.get('/student/:studentId', getStudentLedger);
router.get('/student/:studentId/receipt-pdf', generateReceiptPDF);
router.post('/:id/pay', recordPayment);

// One-time charge endpoints
router.post('/issue-charge', issueOneTimeCharge);
router.get('/one-time-charges', getOneTimeChargesReport);
router.put('/:id/one-time', updateOneTimeCharge);
router.delete('/:id/one-time', deleteOneTimeCharge);

module.exports = router;
