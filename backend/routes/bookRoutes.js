const express = require('express');
const {
  getBookSummary,
  getBookDues,
  recordBookPayment,
  generateBookReceiptPDF,
  issueBookCharge
} = require('../controllers/bookController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply auth middleware to protect and restrict all routes in this file to admin only
router.use(protect);
router.use(authorize('admin'));

router.get('/summary', getBookSummary);
router.get('/dues', getBookDues);
router.post('/issue', issueBookCharge);
router.post('/:id/pay', recordBookPayment);
router.get('/:id/receipt-pdf', generateBookReceiptPDF);

module.exports = router;
