const express = require('express');
const { getPromotionPreview, executePromotion } = require('../controllers/promotionController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/preview', getPromotionPreview);
router.post('/execute', executePromotion);

module.exports = router;
