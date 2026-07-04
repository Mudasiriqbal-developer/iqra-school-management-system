const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Assignment = require('../models/Assignment');
const Class = require('../models/Class');
const Section = require('../models/Section');

/**
 * @desc    Create a new student
 * @route   POST /api/students
 * @access  Private (Admin)
 */
const createStudent = async (req, res, next) => {
  try {
    const {
      registrationNumber,
      fullName,
      fatherName,
      gender,
      dateOfBirth,
      fatherContact,
      email,
      address,
      classId,
      sectionId,
      feeInfo,
      status,
      photoUrl,
    } = req.body;

    // 1. Check registration number unique
    const registrationExists = await Student.findOne({ registrationNumber });
    if (registrationExists) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'A student with this registration number already exists',
      });
    }

    // 2. Check if Class and Section exist
    const classExists = await Class.findById(classId);
    if (!classExists) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Class not found',
      });
    }

    const sectionExists = await Section.findById(sectionId);
    if (!sectionExists) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Section not found',
      });
    }

    // 3. Create student
    const student = await Student.create({
      registrationNumber,
      fullName,
      fatherName,
      gender,
      dateOfBirth,
      fatherContact,
      email,
      address,
      classId,
      sectionId,
      feeInfo,
      status,
      photoUrl,
    });

    return res.status(201).json({
      success: true,
      data: student,
      message: 'Student created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all students (with filtering, search, pagination, and teacher restrictions)
 * @route   GET /api/students
 * @access  Private (Admin, Teacher)
 */
const getAllStudents = async (req, res, next) => {
  try {
    const { classId, sectionId, status, search, page = 1, limit = 10 } = req.query;

    const pageVal = parseInt(page, 10);
    const limitVal = parseInt(limit, 10);
    const skipVal = (pageVal - 1) * limitVal;

    const filter = {};

    // Apply status filter if provided
    if (status) {
      filter.status = status;
    }

    // Apply search filter on fullName, registrationNumber, or fatherName
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { registrationNumber: { $regex: search, $options: 'i' } },
        { fatherName: { $regex: search, $options: 'i' } },
      ];
    }

    // Teacher visibility logic
    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ userId: req.user.id });
      if (!teacher) {
        return res.status(200).json({
          success: true,
          data: { students: [], total: 0, page: pageVal, pages: 0 },
          message: 'No students found (no teacher profile matches)',
        });
      }

      // Fetch teacher assignments
      const assignments = await Assignment.find({ teacherId: teacher._id });
      if (assignments.length === 0) {
        return res.status(200).json({
          success: true,
          data: { students: [], total: 0, page: pageVal, pages: 0 },
          message: 'No students found (teacher has no assignments)',
        });
      }

      // Handle combination logic
      if (classId && sectionId) {
        // Intersect requested combination with assignments
        const isAssigned = assignments.some(
          a => a.classId.toString() === classId && a.sectionId.toString() === sectionId
        );
        if (!isAssigned) {
          // Silently return empty results
          return res.status(200).json({
            success: true,
            data: { students: [], total: 0, page: pageVal, pages: 0 },
            message: 'No students found (not assigned to this combination)',
          });
        }
        filter.classId = classId;
        filter.sectionId = sectionId;
      } else if (classId) {
        // Teacher requested specific class. Filter assignments matching this classId.
        const assignedSections = assignments
          .filter(a => a.classId.toString() === classId)
          .map(a => a.sectionId);
        
        if (assignedSections.length === 0) {
          return res.status(200).json({
            success: true,
            data: { students: [], total: 0, page: pageVal, pages: 0 },
            message: 'No students found',
          });
        }
        filter.classId = classId;
        filter.sectionId = { $in: assignedSections };
      } else if (sectionId) {
        // Teacher requested specific section. Filter assignments matching this sectionId.
        const assignedClasses = assignments
          .filter(a => a.sectionId.toString() === sectionId)
          .map(a => a.classId);

        if (assignedClasses.length === 0) {
          return res.status(200).json({
            success: true,
            data: { students: [], total: 0, page: pageVal, pages: 0 },
            message: 'No students found',
          });
        }
        filter.classId = { $in: assignedClasses };
        filter.sectionId = sectionId;
      } else {
        // Neither classId nor sectionId specified. Return students from all assigned combinations.
        const assignmentConditions = assignments.map(a => ({
          classId: a.classId,
          sectionId: a.sectionId,
        }));
        filter.$and = [
          {
            $or: assignmentConditions,
          },
        ];
      }
    } else {
      // Admin filter logic (directly apply parameters if present)
      if (classId) filter.classId = classId;
      if (sectionId) filter.sectionId = sectionId;
    }

    // Execute query with pagination
    const total = await Student.countDocuments(filter);
    const students = await Student.find(filter)
      .populate('classId', 'name')
      .populate('sectionId', 'name')
      .skip(skipVal)
      .limit(limitVal)
      .sort({ createdAt: -1 });

    const pages = Math.ceil(total / limitVal);

    return res.status(200).json({
      success: true,
      data: {
        students,
        total,
        page: pageVal,
        pages,
      },
      message: 'Students fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get student by ID
 * @route   GET /api/students/:id
 * @access  Private (Admin, Teacher)
 */
const getStudentById = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('classId', 'name')
      .populate('sectionId', 'name');

    if (!student) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Student not found',
      });
    }

    // If teacher, check if assigned to student's class + section
    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ userId: req.user.id });
      if (!teacher) {
        return res.status(403).json({
          success: false,
          data: null,
          message: 'Teacher profile not found',
        });
      }

      const assigned = await Assignment.findOne({
        teacherId: teacher._id,
        classId: student.classId,
        sectionId: student.sectionId,
      });

      if (!assigned) {
        return res.status(403).json({
          success: false,
          data: null,
          message: "You are not assigned to this student's class",
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: student,
      message: 'Student fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a student
 * @route   PUT /api/students/:id
 * @access  Private (Admin)
 */
const updateStudent = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Student not found',
      });
    }

    const {
      registrationNumber,
      fullName,
      fatherName,
      gender,
      dateOfBirth,
      fatherContact,
      email,
      address,
      classId,
      sectionId,
      feeInfo,
      status,
      photoUrl,
    } = req.body;

    // Check unique registration number if changed
    if (registrationNumber && registrationNumber !== student.registrationNumber) {
      const duplicate = await Student.findOne({ registrationNumber });
      if (duplicate) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'A student with this registration number already exists',
        });
      }
      student.registrationNumber = registrationNumber;
    }

    if (classId) {
      const classExists = await Class.findById(classId);
      if (!classExists) {
        return res.status(404).json({
          success: false,
          data: null,
          message: 'Class not found',
        });
      }
      student.classId = classId;
    }

    if (sectionId) {
      const sectionExists = await Section.findById(sectionId);
      if (!sectionExists) {
        return res.status(404).json({
          success: false,
          data: null,
          message: 'Section not found',
        });
      }
      student.sectionId = sectionId;
    }

    if (fullName) student.fullName = fullName;
    if (fatherName) student.fatherName = fatherName;
    if (gender) student.gender = gender;
    if (dateOfBirth) student.dateOfBirth = dateOfBirth;
    if (fatherContact) student.fatherContact = fatherContact;
    if (email !== undefined) student.email = email;
    if (address !== undefined) student.address = address;
    if (feeInfo) {
      // Merge or update fee fields
      student.feeInfo = {
        status: feeInfo.status || student.feeInfo.status,
        dueDate: feeInfo.dueDate || student.feeInfo.dueDate,
        history: feeInfo.history || student.feeInfo.history,
      };
    }
    if (status) student.status = status;
    if (photoUrl !== undefined) student.photoUrl = photoUrl;

    const updatedStudent = await student.save();
    const populated = await updatedStudent.populate(['classId', 'sectionId']);

    return res.status(200).json({
      success: true,
      data: populated,
      message: 'Student updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a student (Soft delete via status field)
 * @route   DELETE /api/students/:id
 * @access  Private (Admin)
 */
const deleteStudent = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Student not found',
      });
    }

    // Soft delete: set status to suspended
    student.status = 'suspended';
    await student.save();

    return res.status(200).json({
      success: true,
      data: student,
      message: 'Student deleted successfully (soft delete: status set to suspended)',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
};
