const studentFeeService = require('../services/studentFeeService');

/**
 * @desc    Set monthly fee amount for a student
 * @route   PATCH /api/students/:id/monthly-fee
 * @access  Private (Admin Only)
 */
const setMonthlyFeeAmount = async (req, res, next) => {
  try {
    const student = await studentFeeService.setMonthlyFeeAmount(req.params.id, req.body.monthlyFeeAmount);
    return res.status(200).json({
      success: true,
      data: student,
      message: "Monthly fee updated. This will apply starting next month — the current month's bill has already been set.",
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        data: null,
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * @desc    Get fee summary aggregated by class and/or section, or school-wide
 * @route   GET /api/students/fee-summary
 * @access  Private (Admin Only)
 */
const getFeeSummaryByClass = async (req, res, next) => {
  try {
    const data = await studentFeeService.getFeeSummaryByClass(req.query);
    return res.status(200).json({
      success: true,
      data,
      message: 'Fee summary fetched successfully',
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        data: null,
        message: error.message,
      });
    }
    next(error);
  }
};

module.exports = {
  setMonthlyFeeAmount,
  getFeeSummaryByClass,
};
