const User = require('../models/User');
const Teacher = require('../models/Teacher');
const Section = require('../models/Section');

/**
 * @desc    Create a new teacher (and associated User login)
 * @route   POST /api/teachers
 * @access  Private (Admin)
 */
const createTeacher = async (req, res, next) => {
  let createdUser = null;
  try {
    const { name, email, password, employeeId, qualification, phone, joiningDate, photoUrl, baseSalary } = req.body;

    // 1. Check if User with email already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'A user with this email already exists',
      });
    }

    // 2. Check if Teacher with employee ID already exists
    const teacherExists = await Teacher.findOne({ employeeId });
    if (teacherExists) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'A teacher with this employee ID already exists',
      });
    }

    // 3. Create the User (role is 'teacher')
    createdUser = await User.create({
      name,
      email,
      password,
      role: 'teacher',
      phone,
    });

    // 4. Create the Teacher profile
    try {
      const teacher = await Teacher.create({
        userId: createdUser._id,
        employeeId,
        qualification,
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
          },
        },
        message: 'Teacher and user login created successfully',
      });
    } catch (err) {
      // Rollback: delete the created User if Teacher profile creation fails
      if (createdUser && createdUser._id) {
        await User.findByIdAndDelete(createdUser._id);
      }
      throw err; // Forward error to outer catch block
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
    const teachers = await Teacher.find()
      .populate('userId', 'name email phone isActive role')
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
 * @desc    Get teacher by ID with populated User profile
 * @route   GET /api/teachers/:id
 * @access  Private (Admin)
 */
const getTeacherById = async (req, res, next) => {
  try {
    const teacher = await Teacher.findById(req.params.id)
      .populate('userId', 'name email phone isActive role');

    if (!teacher) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Teacher not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: teacher,
      message: 'Teacher fetched successfully',
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
    const populated = await updatedTeacher.populate('userId', 'name email phone isActive role');

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

module.exports = {
  createTeacher,
  getAllTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
  getMyClassSection,
};
