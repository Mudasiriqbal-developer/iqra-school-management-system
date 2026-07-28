const Settings = require('../models/Settings');

/**
 * @desc    Get current settings (auto-creates default if missing)
 * @route   GET /api/settings
 * @access  Private (Authenticated Users)
 */
const getSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne({ schoolId: 'default' });
    if (!settings) {
      // Auto-create default settings
      settings = await Settings.create({
        schoolId: 'default',
        schoolName: 'Iqra Hadiqa Tul Atfal School System',
        currentSession: '2026-2027',
        workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        feeHeads: ['Tuition', 'Admission', 'Exam Fee'],
        lateFeeAmount: 0,
        lateFeeAfterDay: 0,
      });
    }
    return res.status(200).json({
      success: true,
      data: settings,
      message: 'Settings fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update settings (partial update allowed)
 * @route   PUT /api/settings
 * @access  Private (Admin Only)
 */
const updateSettings = async (req, res, next) => {
  try {
    const settings = await Settings.findOneAndUpdate(
      { schoolId: 'default' },
      req.body,
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      data: settings,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSettings,
  updateSettings,
};
