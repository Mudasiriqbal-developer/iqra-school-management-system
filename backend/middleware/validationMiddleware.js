const { validationResult } = require('express-validator');

/**
 * Validation result handler middleware.
 * If validation fails, returns 400 Bad Request with standardized response shape.
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      data: errors.array(),
      message: 'Validation failed: ' + errors.array().map(e => e.msg).join('; '),
    });
  }
  next();
};

module.exports = {
  validateRequest,
};
