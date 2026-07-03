/**
 * Centralized error handler middleware.
 * Formats errors to the standardized response shape:
 * { success: false, data: null, message: string }
 */
const errorHandler = (err, req, res, next) => {
  // Determine status code
  const statusCode = err.statusCode || res.statusCode;
  const finalStatusCode = statusCode >= 400 ? statusCode : 500;

  // Log error stack to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack || err);
  } else {
    console.error(err.message || err);
  }

  res.status(finalStatusCode).json({
    success: false,
    data: null,
    message: err.message || 'Internal Server Error',
  });
};

module.exports = {
  errorHandler,
};
