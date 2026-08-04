const User = require('../models/User');
const defaultNavOrder = require('../config/defaultNavOrder');

/**
 * @desc    Get admin navigation sidebar order
 * @route   GET /api/admin/settings/nav-order
 * @access  Private (Admin Only)
 */
const getNavOrder = async (req, res, next) => {
  try {
    const admin = await User.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    const order = admin.navOrder && admin.navOrder.length > 0
      ? admin.navOrder
      : defaultNavOrder.map(item => item.key);

    return res.status(200).json({
      success: true,
      order,
      message: 'Navigation order fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update admin navigation sidebar order
 * @route   PUT /api/admin/settings/nav-order
 * @access  Private (Admin Only)
 */
const updateNavOrder = async (req, res, next) => {
  try {
    const { order } = req.body;

    if (!Array.isArray(order)) {
      return res.status(400).json({
        success: false,
        message: 'Order must be an array of nav item keys',
      });
    }

    const defaultKeys = defaultNavOrder.map(item => item.key);

    // Treat empty array as "reset to default"
    if (order.length === 0) {
      await User.findByIdAndUpdate(
        req.user.id,
        { navOrder: [] },
        { new: true }
      );
      return res.status(200).json({
        success: true,
        order: defaultKeys,
        message: 'Navigation order reset to default',
      });
    }

    // Validation: check length
    if (order.length !== defaultKeys.length) {
      return res.status(400).json({
        success: false,
        message: `Order must contain exactly ${defaultKeys.length} items`,
      });
    }

    // Check for duplicates
    const uniqueKeys = new Set(order);
    if (uniqueKeys.size !== order.length) {
      return res.status(400).json({
        success: false,
        message: 'Order contains duplicate keys',
      });
    }

    // Check for invalid keys
    const hasInvalidKeys = order.some(key => !defaultKeys.includes(key));
    if (hasInvalidKeys) {
      return res.status(400).json({
        success: false,
        message: 'Order contains invalid navigation keys',
      });
    }

    // Save order
    const admin = await User.findByIdAndUpdate(
      req.user.id,
      { navOrder: order },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      order: admin.navOrder,
      message: 'Navigation order updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNavOrder,
  updateNavOrder,
};
