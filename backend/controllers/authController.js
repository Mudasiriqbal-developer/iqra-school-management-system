const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { hashToken, generateActivationToken } = require('../utils/tokenUtils');
const { sendActivationConfirmationEmail, sendInvitationEmail, sendResetPasswordEmail } = require('../utils/emailService');
const crypto = require('crypto');

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
    const { name, email, role, phone } = req.body;

    // Check if email already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'A user with this email already exists',
      });
    }

    // Generate activation token & placeholder password
    const tokenData = generateActivationToken();
    const placeholderPassword = crypto.randomBytes(24).toString('hex');

    // Create user (password is hashed in pre-save hook)
    const user = await User.create({
      name,
      email,
      password: placeholderPassword,
      role,
      phone,
      isActivated: false,
      activationTokenHash: tokenData.tokenHash,
      activationTokenExpires: tokenData.expiresAt,
    });

    // Send activation link email
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const activationLink = `${frontendUrl}/activate/${tokenData.rawToken}`;
    
    try {
      await sendInvitationEmail(email, name, role.charAt(0).toUpperCase() + role.slice(1), activationLink);
    } catch (mailErr) {
      console.error('Failed to send invitation email:', mailErr);
    }

    return res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      message: 'User registered successfully and activation email sent',
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

    // Determine query based on whether input is email or registration number
    let user;
    if (email && email.includes('@')) {
      user = await User.findOne({ email: email.toLowerCase() });
    } else if (email) {
      user = await User.findOne({ registrationNumber: email.toLowerCase() });
    }

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

/**
 * @desc    Change password of currently logged in user
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long',
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect current password',
      });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Send password reset token to email
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with that email address',
      });
    }

    // Only allow admin and teacher to use self-service forgot password
    if (user.role !== 'admin' && user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Password recovery is not available for this role. Please contact an administrator.',
      });
    }

    // Generate reset token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);

    user.resetPasswordToken = tokenHash;
    user.resetPasswordExpires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour expiration

    await user.save();

    // Send email
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password/${rawToken}`;

    try {
      await sendResetPasswordEmail(user.email, user.name, resetLink);
    } catch (mailErr) {
      console.error('Failed to send reset password email:', mailErr);
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();
      return res.status(500).json({
        success: false,
        message: 'Email could not be sent. Please try again later.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Password reset link sent to your email.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset password using reset token
 * @route   POST /api/auth/reset-password/:token
 * @access  Public
 */
const resetPassword = async (req, res, next) => {
  try {
    const rawToken = req.params.token;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    const tokenHash = hashToken(rawToken);

    const user = await User.findOne({
      resetPasswordToken: tokenHash,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'This reset link is invalid or has expired',
      });
    }

    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now log in.',
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
  changePassword,
  forgotPassword,
  resetPassword,
};
