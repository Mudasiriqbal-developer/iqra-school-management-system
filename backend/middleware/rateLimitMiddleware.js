const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for user login attempts.
 * Allows up to 10 attempts per 15-minute window per IP.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 attempts
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: () => process.env.NODE_ENV === 'test', // Bypass in test runner
  handler: (req, res, next, options) => {
    return res.status(options.statusCode).json({
      success: false,
      message: 'Too many login attempts from this IP. Please try again in 15 minutes.'
    });
  }
});

/**
 * Rate limiter for password recovery requests to prevent SMTP abuse.
 * Allows up to 5 attempts per 15-minute window per IP.
 */
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 requests
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  handler: (req, res, next, options) => {
    return res.status(options.statusCode).json({
      success: false,
      message: 'Too many password reset requests from this IP. Please try again in 15 minutes.'
    });
  }
});

module.exports = {
  loginLimiter,
  forgotPasswordLimiter
};
