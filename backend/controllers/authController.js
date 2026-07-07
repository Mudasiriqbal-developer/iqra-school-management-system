const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { hashToken } = require('../utils/tokenUtils');
const { sendActivationConfirmationEmail } = require('../utils/emailService');

/**
 * Generate a JWT token containing user ID and role.
 */
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;

    // Check if email already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'A user with this email already exists',
      });
    }

    // Create user (password is hashed in pre-save hook)
    const user = await User.create({
      name,
      email,
      password,
      role,
      phone,
    });

    const token = generateToken(user._id, user.role);

    return res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      },
      message: 'User registered successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'Invalid credentials',
      });
    }

    // Compare passwords
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'Invalid credentials',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'Account deactivated, contact admin',
      });
    }

    // Check if user is activated
    if (user.isActivated === false) {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'Your account has not been activated yet. Please check your email for the activation link, or ask your admin to resend it.',
      });
    }

    const token = generateToken(user._id, user.role);

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      },
      message: 'Login successful',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current logged in user details
 * @route   GET /api/auth/me
 * @access  Private
 */
const getCurrentUser = async (req, res, next) => {
  try {
    // req.user is set by the protect middleware
    return res.status(200).json({
      success: true,
      data: req.user,
      message: 'Current user fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Validate activation token
 * @route   GET /api/auth/activate/:token
 * @access  Public
 */
const validateActivationToken = async (req, res, next) => {
  try {
    const rawToken = req.params.token;
    const tokenHash = hashToken(rawToken);

    const user = await User.findOne({
      activationTokenHash: tokenHash,
      activationTokenExpires: { $gt: new Date() },
      isActivated: false,
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'This activation link is invalid or has expired',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        name: user.name,
        email: user.email,
      },
      message: 'Valid invitation',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Activate account (set password)
 * @route   POST /api/auth/activate/:token
 * @access  Public
 */
const activateAccount = async (req, res, next) => {
  try {
    const rawToken = req.params.token;
    const { password } = req.body;
    const tokenHash = hashToken(rawToken);

    // Re-validate token independently
    const user = await User.findOne({
      activationTokenHash: tokenHash,
      activationTokenExpires: { $gt: new Date() },
      isActivated: false,
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'This activation link is invalid or has expired',
      });
    }

    // Password length validation
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Password must be at least 6 characters',
      });
    }

    // Update password (pre-save hook will hash it automatically)
    user.password = password;
    user.isActivated = true;
    user.activationTokenHash = null;
    user.activationTokenExpires = null;

    await user.save();

    // Send confirmation email
    try {
      await sendActivationConfirmationEmail(user.email, user.name);
    } catch (mailErr) {
      console.error('Failed to send activation confirmation email:', mailErr);
    }

    // Generate JWT for automatic login
    const token = generateToken(user._id, user.role);

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      },
      message: 'Account activated successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
  validateActivationToken,
  activateAccount,
};
