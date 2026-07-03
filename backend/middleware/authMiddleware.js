const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protect middleware: Ensures the user is authenticated via JWT.
 * Reads Bearer token from Authorization header.
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Extract token from Bearer <token>
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Fetch user from DB, excluding password
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({
          success: false,
          data: null,
          message: 'Not authorized, user not found',
        });
      }

      return next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'Invalid or expired token',
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      data: null,
      message: 'No token provided',
    });
  }
};

/**
 * Authorize middleware: Restricts route access to specific roles.
 * Higher-order function.
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'Not authorized',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'You do not have permission to access this resource',
      });
    }

    next();
  };
};

module.exports = {
  protect,
  authorize,
};
