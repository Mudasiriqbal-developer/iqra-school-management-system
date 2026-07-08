const mongoose = require('mongoose');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Assignment = require('../models/Assignment');
const Attendance = require('../models/Attendance');
const Class = require('../models/Class');
const Section = require('../models/Section');
const Subject = require('../models/Subject');

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
 * @desc    Get the logged-in student's own profile
 * @route   GET /api/students/me/profile
 * @access  Private (Student)
 */
const getMyProfile = async (req, res, next) => {
  try {
    // req.user is the authenticated User document (set by protect middleware)
    const userEmail = req.user.email;

    // Find Student record whose email matches the logged-in User's email
    const student = await Student.findOne({ email: userEmail })
      .populate('classId', 'name')
      .populate('sectionId', 'name');

    if (!student) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'No student profile found linked to your account',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        student,
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          phone: req.user.phone,
        },
      },
      message: 'Student profile fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get the logged-in student's attendance rate and records
 * @route   GET /api/students/me/attendance
 * @access  Private (Student)
 */
const getMyAttendance = async (req, res, next) => {
  try {
    const userEmail = req.user.email;

    const student = await Student.findOne({ email: userEmail });
    if (!student) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'No student profile found linked to your account',
      });
    }

    // Optional date range filters via query params
    const { from, to } = req.query;
    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);

    // Build the match stage
    const matchStage = {
      classId: student.classId,
      sectionId: student.sectionId,
      'records.studentId': student._id,
    };
    if (Object.keys(dateFilter).length > 0) {
      matchStage.date = dateFilter;
    }

    // Aggregate to pull only this student's record from each attendance doc
    const results = await Attendance.aggregate([
      { $match: matchStage },
      { $unwind: '$records' },
      { $match: { 'records.studentId': student._id } },
      { $sort: { date: -1 } },
      {
        $project: {
          _id: 0,
          date: 1,
          status: '$records.status',
        },
      },
    ]);

    // Calculate summary statistics
    const totalDays = results.length;
    const presentDays = results.filter(r => r.status === 'present').length;
    const absentDays = results.filter(r => r.status === 'absent').length;
    const lateDays = results.filter(r => r.status === 'late').length;
    const leaveDays = results.filter(r => r.status === 'leave').length;
    const attendanceRate = totalDays > 0
      ? Math.round(((presentDays + lateDays) / totalDays) * 10000) / 100
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalDays,
          presentDays,
          absentDays,
          lateDays,
          leaveDays,
          attendanceRate,
        },
        records: results,
      },
      message: 'Attendance fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get subjects assigned to the logged-in student's class and section
 * @route   GET /api/students/me/subjects
 * @access  Private (Student)
 */
const getMySubjects = async (req, res, next) => {
  try {
    const userEmail = req.user.email;

    const student = await Student.findOne({ email: userEmail })
      .populate('classId', 'name')
      .populate('sectionId', 'name');

    if (!student) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'No student profile found linked to your account',
      });
    }

    // Find all teacher-subject assignments for the student's class + section
    const assignments = await Assignment.find({
      classId: student.classId._id,
      sectionId: student.sectionId._id,
    })
      .populate('subjectId', 'name')
      .populate({
        path: 'teacherId',
        select: 'fullName qualification',
      });

    // Map into a cleaner response shape
    const subjects = assignments.map(a => ({
      subjectId: a.subjectId?._id,
      subjectName: a.subjectId?.name,
      teacher: a.teacherId
        ? {
            teacherId: a.teacherId._id,
            fullName: a.teacherId.fullName,
            qualification: a.teacherId.qualification,
          }
        : null,
    }));

    return res.status(200).json({
      success: true,
      data: {
        class: student.classId,
        section: student.sectionId,
        subjects,
      },
      message: 'Subjects fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get the logged-in student's fee info and payment history
 * @route   GET /api/students/me/fees
 * @access  Private (Student)
 */
const getMyFeeHistory = async (req, res, next) => {
  try {
    const userEmail = req.user.email;

    const student = await Student.findOne({ email: userEmail })
      .populate('classId', 'name')
      .populate('sectionId', 'name');

    if (!student) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'No student profile found linked to your account',
      });
    }

    const feeInfo = student.feeInfo || {
      amountDue: 0,
      amountPaid: 0,
      status: 'pending',
      dueDate: null,
      history: [],
    };

    return res.status(200).json({
      success: true,
      data: {
        studentName: student.fullName,
        registrationNumber: student.registrationNumber,
        class: student.classId,
        section: student.sectionId,
        feeStatus: feeInfo.status,
        amountDue: feeInfo.amountDue,
        amountPaid: feeInfo.amountPaid,
        balance: (feeInfo.amountDue || 0) - (feeInfo.amountPaid || 0),
        dueDate: feeInfo.dueDate,
        history: feeInfo.history || [],
      },
      message: 'Fee history fetched successfully',
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

/**
 * @desc    Set fee structure for a student
 * @route   PATCH /api/students/:id/fee-structure
 * @access  Private (Admin Only)
 */
const setFeeStructure = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Student not found',
      });
    }

    const { amountDue, dueDate } = req.body;

    // Initialize feeInfo if not present
    if (!student.feeInfo) {
      student.feeInfo = { amountDue: 0, amountPaid: 0, status: 'pending', history: [] };
    }

    // Updates ONLY these two fields on the student's feeInfo — does not touch history or amountPaid
    student.feeInfo.amountDue = amountDue;
    if (dueDate !== undefined) {
      student.feeInfo.dueDate = dueDate;
    }

    // Recalculate status after update using the same logic
    const amountPaid = student.feeInfo.amountPaid || 0;
    const today = new Date();
    
    let status = 'pending';
    if (amountPaid >= amountDue && amountDue > 0) {
      status = 'paid';
    } else if (student.feeInfo.dueDate && today > new Date(student.feeInfo.dueDate) && amountPaid < amountDue) {
      status = 'overdue';
    } else {
      status = 'pending';
    }
    student.feeInfo.status = status;

    const updatedStudent = await student.save();
    const populated = await updatedStudent.populate(['classId', 'sectionId']);

    return res.status(200).json({
      success: true,
      data: populated,
      message: 'Student fee structure updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Record fee payment for a student
 * @route   POST /api/students/:id/fee-payment
 * @access  Private (Admin Only)
 */
const recordFeePayment = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Student not found',
      });
    }

    let { amount, method, paidOn, forMonth } = req.body;

    // Initialize feeInfo if not present
    if (!student.feeInfo) {
      student.feeInfo = { amountDue: 0, amountPaid: 0, status: 'pending', history: [] };
    }

    // Infer forMonth if not provided
    if (!forMonth) {
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const referenceDate = student.feeInfo.dueDate
        ? new Date(student.feeInfo.dueDate)
        : (paidOn ? new Date(paidOn) : new Date());
      forMonth = `${monthNames[referenceDate.getMonth()]} ${referenceDate.getFullYear()}`;
    }

    // Push a new entry to feeInfo.history
    const paymentEntry = {
      amount,
      method: method || 'cash',
      paidOn: paidOn ? new Date(paidOn) : new Date(),
      forMonth,
    };
    student.feeInfo.history.push(paymentEntry);

    // Increment feeInfo.amountPaid by the payment amount
    student.feeInfo.amountPaid = (student.feeInfo.amountPaid || 0) + amount;

    // Recalculate feeInfo.status using this logic
    const amountPaid = student.feeInfo.amountPaid || 0;
    const amountDue = student.feeInfo.amountDue || 0;
    const dueDate = student.feeInfo.dueDate;
    const today = new Date();

    let status = 'pending';
    if (amountPaid >= amountDue && amountDue > 0) {
      status = 'paid';
    } else if (dueDate && today > new Date(dueDate) && amountPaid < amountDue) {
      status = 'overdue';
    } else {
      status = 'pending';
    }
    student.feeInfo.status = status;

    // --- AUTOMATIC NEXT MONTH FEE ROLLOVER ---
    if (status === 'paid') {
      const currentDueDate = student.feeInfo.dueDate ? new Date(student.feeInfo.dueDate) : new Date();
      
      // Calculate 28th of next month safely to avoid overflow
      const nextMonthDate = new Date(currentDueDate);
      nextMonthDate.setDate(28);
      nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);

      // Carry over any overpayment
      const overpayment = Math.max(0, amountPaid - amountDue);

      // Roll over fee structure
      student.feeInfo.amountDue = amountDue; // same fee structure amount
      student.feeInfo.amountPaid = overpayment;
      student.feeInfo.dueDate = nextMonthDate;

      // Calculate status for next cycle
      if (overpayment >= amountDue && amountDue > 0) {
        student.feeInfo.status = 'paid';
      } else {
        student.feeInfo.status = 'pending';
      }
    }

    const updatedStudent = await student.save();
    const populated = await updatedStudent.populate(['classId', 'sectionId']);

    return res.status(200).json({
      success: true,
      data: populated,
      message: 'Payment recorded successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get fee summary aggregated by class and/or section, or school-wide
 * @route   GET /api/students/fee-summary
 * @access  Private (Admin Only)
 */
const getFeeSummaryByClass = async (req, res, next) => {
  try {
    const { classId, sectionId } = req.query;

    const filter = {};

    // Validate if classId is a valid Mongo ID if provided
    if (classId) {
      if (!mongoose.Types.ObjectId.isValid(classId)) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'Invalid Class ID format',
        });
      }
      filter.classId = classId;
    }

    // Validate if sectionId is a valid Mongo ID if provided
    if (sectionId) {
      if (!mongoose.Types.ObjectId.isValid(sectionId)) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'Invalid Section ID format',
        });
      }
      filter.sectionId = sectionId;
    }

    // Fetch matching students
    const students = await Student.find(filter);

    let totalStudents = students.length;
    let paidCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;

    for (const student of students) {
      const amountPaid = student.feeInfo?.amountPaid || 0;
      const amountDue = student.feeInfo?.amountDue || 0;
      const status = student.feeInfo?.status || 'pending';

      if (status === 'paid') {
        paidCount++;
      } else if (status === 'overdue') {
        overdueCount++;
      } else {
        pendingCount++;
      }

      totalCollected += amountPaid;
      // sum of amountDue - amountPaid across matched students
      totalOutstanding += (amountDue - amountPaid);
    }

    return res.status(200).json({
      success: true,
      data: {
        totalStudents,
        paidCount,
        pendingCount,
        overdueCount,
        totalCollected,
        totalOutstanding,
      },
      message: 'Fee summary fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createStudent,
  getAllStudents,
  getStudentById,
  getMyProfile,
  getMyAttendance,
  getMySubjects,
  getMyFeeHistory,
  updateStudent,
  deleteStudent,
  setFeeStructure,
  recordFeePayment,
  getFeeSummaryByClass,
};
