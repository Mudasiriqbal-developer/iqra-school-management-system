const studentPdfService = require('../services/studentPdfService');

/**
 * @desc    Generate student admission receipt PDF
 * @route   GET /api/students/:id/admission-receipt-pdf
 * @access  Private (Admin Only)
 */
const generateAdmissionReceiptPDF = async (req, res, next) => {
  try {
    const student = await studentPdfService.getStudentForReceipt(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Student not found',
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${student.registrationNumber}-admission-receipt.pdf"`
    );

    await studentPdfService.buildAdmissionReceiptPDF(student, res);
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
  generateAdmissionReceiptPDF,
};
