const studentImportService = require('../services/studentImportService');

/**
 * @desc    Download student import Excel template
 * @route   GET /api/students/import/template
 * @access  Private (Admin Only)
 */
const getImportTemplate = async (req, res, next) => {
  try {
    const buffer = await studentImportService.generateImportTemplate();

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="student-import-template.xlsx"'
    );
    res.setHeader('Content-Length', buffer.length);

    return res.status(200).send(buffer);
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
 * @desc    Validate uploaded student spreadsheet without saving to database
 * @route   POST /api/students/import/validate
 * @access  Private (Admin Only)
 */
const validateImport = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'No file uploaded. Please upload a .csv, .xlsx, or .xls file.',
      });
    }

    const validationResult = await studentImportService.validateImportFile(req.file.buffer);

    return res.status(200).json({
      success: true,
      data: validationResult,
      message: 'Import file validated successfully',
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
 * @desc    Commit validated student records to database (stateless, TOCTOU transaction protected)
 * @route   POST /api/students/import/commit
 * @access  Private (Admin Only)
 */
const commitImport = async (req, res, next) => {
  try {
    const { rows } = req.body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'No valid student rows provided to commit',
      });
    }

    const result = await studentImportService.commitImport(rows);

    return res.status(200).json({
      success: true,
      data: result,
      message: `Import completed: ${result.successCount} succeeded, ${result.failedCount} failed.`,
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
  getImportTemplate,
  validateImport,
  commitImport,
};
