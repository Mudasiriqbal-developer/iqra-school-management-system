const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  createFamily,
  getFamilies,
  getFamilyById,
  updateFamily,
  updateFamilyStudents,
  deleteFamily,
  getFamilyFeeSummary,
  getFamilyBooksSummary,
  payFamilyFees,
  generateFamilyVoucherPDF
} = require('../controllers/familyController');

const router = express.Router();

// All family routes are protected and admin only
router.use(protect);
router.use(authorize('admin'));

router.post('/', createFamily);
router.get('/', getFamilies);
router.get('/:id', getFamilyById);
router.put('/:id', updateFamily);
router.patch('/:id/students', updateFamilyStudents);
router.delete('/:id', deleteFamily);

// Phase 2, 3, 4 endpoints
router.get('/:id/fee-summary', getFamilyFeeSummary);
router.get('/:id/books-summary', getFamilyBooksSummary);
router.post('/:id/pay', payFamilyFees);
router.get('/:familyId/vouchers/:voucherId/pdf', generateFamilyVoucherPDF);

module.exports = router;
