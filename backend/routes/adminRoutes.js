const express = require('express');
const { getNavOrder, updateNavOrder } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes here are protected and restricted to admin role
router.use(protect);
router.use(authorize('admin'));

router.route('/settings/nav-order')
  .get(getNavOrder)
  .put(updateNavOrder);

module.exports = router;
