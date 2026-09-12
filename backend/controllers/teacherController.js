const User = require('../models/User');
const Teacher = require('../models/Teacher');
const Section = require('../models/Section');
const crypto = require('crypto');
const { generateActivationToken } = require('../utils/tokenUtils');
const { sendTeacherInvitationEmail } = require('../utils/emailService');
const { escapeRegex } = require('../utils/regexHelper');

/**
 * @desc    Create a new teacher (and associated User login)
 * @route   POST /api/teachers
 * @access  Private (Admin)
 */
const createTeacher = async (req, res, next) => {
  let createdUser = null;
  try {
    const { name, email, employeeId, qualification, phone, joiningDate, photoUrl, baseSalary, password, requireVerification = false } = req.body;

    // Normalize email, name, and employeeId (lowercase + trim)
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const normalizedName = typeof name === 'string' ? name.trim() : '';
    const normalizedEmpId = typeof employeeId === 'string' ? employeeId.trim() : '';

    // 1. Check if User with email already exists
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'A user with this email already exists',
      });
    }

    // 2. Check if Teacher with employee ID already exists
    const teacherExists = await Teacher.findOne({ employeeId: normalizedEmpId });
    if (teacherExists) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'A teacher with this employee ID already exists',
      });
    }

    // Strict boolean check for verification mode
    const isVerificationMode = (requireVerification === true || requireVerification === 'true') || !password;

    if (isVerificationMode) {
      // 3. Generate activation token & placeholder password
      const tokenData = generateActivationToken();
      const placeholderPassword = crypto.randomBytes(24).toString('hex');

      // 4. Create the User (plain placeholder password passed; hashed in User pre-save hook)
      createdUser = await User.create({
        name: normalizedName,
        email: normalizedEmail,
        password: placeholderPassword,
        role: 'teacher',
        phone: typeof phone === 'string' ? phone.trim() : phone,
        isActivated: false,
        activationTokenHash: tokenData.tokenHash,
        activationTokenExpires: tokenData.expiresAt,
      });

      // 5. Create the Teacher profile
      try {
        const teacher = await Teacher.create({
          userId: createdUser._id,
          employeeId: normalizedEmpId,
          qualification: typeof qualification === 'string' ? qualification.trim() : qualification,
          joiningDate: joiningDate || Date.now(),
          photoUrl: photoUrl || '',
          baseSalary: baseSalary || 0,
        });

        // 6. Build activation link & send invitation email
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const activationLink = `${frontendUrl}/activate/${tokenData.rawToken}`;

        // Send teacher invitation email asynchronously
        sendTeacherInvitationEmail(normalizedEmail, normalizedName, activationLink)
          .catch((mailErr) => {
            console.error('Failed to send teacher invitation email asynchronously:', mailErr);
          });

        return res.status(201).json({
          success: true,
          data: {
            teacher,
            user: {
              id: createdUser._id,
              name: createdUser.name,
              email: createdUser.email,
              role: createdUser.role,
              phone: createdUser.phone,
              isActivated: createdUser.isActivated,
            },
            activationLink,
          },
          message: 'Teacher created successfully and invitation email is being sent',
        });
      } catch (err) {
        // Rollback: delete the created User if Teacher profile creation fails
        if (createdUser && createdUser._id) {
          await User.findByIdAndDelete(createdUser._id);
        }
        throw err;
      }
    } else {
      // Direct Password Mode (Offline Provisioning)
      if (!password || password.length < 8) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'Password must be at least 8 characters long',
        });
      }

      // Create active user directly (plain password assigned; hashed in User pre-save hook)
      createdUser = await User.create({
        name: normalizedName,
        email: normalizedEmail,
        password,
        role: 'teacher',
        phone: typeof phone === 'string' ? phone.trim() : phone,
        isActivated: true,
        activationTokenHash: null,
        activationTokenExpires: null,
      });

      try {
        const teacher = await Teacher.create({
          userId: createdUser._id,
          employeeId: normalizedEmpId,
          qualification: typeof qualification === 'string' ? qualification.trim() : qualification,
          joiningDate: joiningDate || Date.now(),
          photoUrl: photoUrl || '',
          baseSalary: baseSalary || 0,
        });

        return res.status(201).json({
          success: true,
          data: {
            teacher,
            user: {
              id: createdUser._id,
              name: createdUser.name,
              email: createdUser.email,
              role: createdUser.role,
              phone: createdUser.phone,
              isActivated: createdUser.isActivated,
            },
          },
          message: 'Teacher created and activated successfully',
        });
      } catch (err) {
        if (createdUser && createdUser._id) {
          await User.findByIdAndDelete(createdUser._id);
        }
        throw err;
      }
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all teachers with populated User profiles
 * @route   GET /api/teachers
 * @access  Private (Admin)
 */
const getAllTeachers = async (req, res, next) => {
  try {
    const { search, limit } = req.query;
    let query = Teacher.find();

    if (search && typeof search === 'string' && search.trim()) {
      const safeSearch = escapeRegex(search.trim());
      const matchingUsers = await User.find({
        role: 'teacher',
        $or: [
          { name: { $regex: safeSearch, $options: 'i' } },
          { email: { $regex: safeSearch, $options: 'i' } },
          { phone: { $regex: safeSearch, $options: 'i' } }
        ]
      }).select('_id');
      const userIds = matchingUsers.map(u => u._id);

      query = query.where({
        $or: [
          { employeeId: { $regex: safeSearch, $options: 'i' } },
          { qualification: { $regex: safeSearch, $options: 'i' } },
          { userId: { $in: userIds } }
        ]
      });
    }

    if (limit && !isNaN(parseInt(limit, 10))) {
      query = query.limit(parseInt(limit, 10));
    }

    const teachers = await query
      .populate('userId', 'name email phone isActive role isActivated activationTokenExpires')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: teachers,
      message: 'Teachers fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update teacher profile and associated User record
 * @route   PUT /api/teachers/:id
 * @access  Private (Admin)
 */
const updateTeacher = async (req, res, next) => {
  try {
    const { name, email, phone, employeeId, qualification, joiningDate, photoUrl, baseSalary } = req.body;

    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Teacher profile not found',
      });
    }

    // 1. If updating employeeId, check for uniqueness
    if (employeeId && employeeId !== teacher.employeeId) {
      const duplicateTeacher = await Teacher.findOne({ employeeId });
      if (duplicateTeacher) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'Teacher with this employee ID already exists',
        });
      }
      teacher.employeeId = employeeId;
    }

    // 2. If User fields are provided, update them
    if (name || email || phone) {
      const user = await User.findById(teacher.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          data: null,
          message: 'Associated User account not found',
        });
      }

      if (email && email !== user.email) {
        const emailExists = await User.findOne({ email });
        if (emailExists) {
          return res.status(400).json({
            success: false,
            data: null,
            message: 'Email is already in use by another user',
          });
        }
        user.email = email;
      }

      if (name) user.name = name;
      if (phone !== undefined) user.phone = phone;

      await user.save();
    }

    // 3. Update Teacher fields
    if (qualification !== undefined) teacher.qualification = qualification;
    if (joiningDate !== undefined) teacher.joiningDate = joiningDate;
    if (photoUrl !== undefined) teacher.photoUrl = photoUrl;
    if (baseSalary !== undefined) teacher.baseSalary = baseSalary;

    const updatedTeacher = await teacher.save();
    const populated = await updatedTeacher.populate('userId', 'name email phone isActive role isActivated activationTokenExpires');

    return res.status(200).json({
      success: true,
      data: populated,
      message: 'Teacher profile updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete teacher profile (Soft delete: deactivate associated User account)
 * @route   DELETE /api/teachers/:id
 * @access  Private (Admin)
 */
const deleteTeacher = async (req, res, next) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Teacher profile not found',
      });
    }

    // Soft delete: set associated User's isActive to false
    await User.findByIdAndUpdate(teacher.userId, { isActive: false });

    return res.status(200).json({
      success: true,
      data: null,
      message: 'Teacher deactivated successfully (soft delete)',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get the section where the teacher is class teacher
 * @route   GET /api/teachers/my-class
 * @access  Private (Teacher Only)
 */
const getMyClassSection = async (req, res, next) => {
  try {
    // 1. Resolve Teacher profile from req.user.id
    const teacher = await Teacher.findOne({ userId: req.user.id });
    if (!teacher) {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'Forbidden: Current user is not registered as a teacher',
      });
    }

    // 2. Find the ONE Section where classTeacherId equals this teacher's _id
    const section = await Section.findOne({ classTeacherId: teacher._id }).populate('classId', 'name');

    if (!section) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'You are not currently assigned as a Class Teacher',
      });
    }

    return res.status(200).json({
      success: true,
      data: section,
      message: 'Class section fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resend invitation to a teacher (Admin Only)
 * @route   PATCH /api/teachers/:id/resend-invitation
 * @access  Private (Admin)
 */
const resendInvitation = async (req, res, next) => {
  try {
    const teacher = await Teacher.findById(req.params.id).populate('userId');
    if (!teacher) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Teacher profile not found',
      });
    }

    const user = teacher.userId;
    if (!user) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Associated User account not found',
      });
    }

    if (user.isActivated) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "This teacher's account is already active",
      });
    }

    // Generate a NEW activation token (invalidates the old link)
    const tokenData = generateActivationToken();

    user.activationTokenHash = tokenData.tokenHash;
    user.activationTokenExpires = tokenData.expiresAt;
    await user.save();

    // Send invitation email
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const activationLink = `${frontendUrl}/activate/${tokenData.rawToken}`;
    
    // Send teacher invitation email asynchronously
    sendTeacherInvitationEmail(user.email, user.name, activationLink)
      .catch((mailErr) => {
        console.error('Failed to send teacher invitation email during resend asynchronously:', mailErr);
      });

    return res.status(200).json({
      success: true,
      data: {
        activationLink,
      },
      message: 'Invitation email is being resent',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Directly activate a teacher with a new password (Admin Only / Offline recovery)
 * @route   POST /api/teachers/:id/activate-direct
 * @access  Private (Admin Only)
 */
const activateTeacherDirectly = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Password must be at least 8 characters long',
      });
    }

    const teacher = await Teacher.findById(id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Teacher not found',
      });
    }

    const user = await User.findById(teacher.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Associated User account not found',
      });
    }

    // Set password (hashed in User pre-save hook)
    user.password = password;
    user.isActivated = true;
    user.isActive = true;
    user.activationTokenHash = null;
    user.activationTokenExpires = null;
    await user.save();

    return res.status(200).json({
      success: true,
      data: {
        teacher,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          isActivated: user.isActivated,
        },
      },
      message: 'Teacher account activated successfully with direct password',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTeacher,
  getAllTeachers,
  updateTeacher,
  deleteTeacher,
  getMyClassSection,
  resendInvitation,
  activateTeacherDirectly,
};
