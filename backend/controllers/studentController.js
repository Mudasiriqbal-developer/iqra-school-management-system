const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const Student = require('../models/Student');
const FeeRecord = require('../models/FeeRecord');
const Teacher = require('../models/Teacher');
const Assignment = require('../models/Assignment');
const Attendance = require('../models/Attendance');
const Class = require('../models/Class');
const Section = require('../models/Section');
const Subject = require('../models/Subject');
const User = require('../models/User');
const crypto = require('crypto');
const { generateActivationToken } = require('../utils/tokenUtils');
const { sendInvitationEmail } = require('../utils/emailService');

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
      address,
      classId,
      sectionId,
      monthlyFeeAmount,
      status,
      photoUrl,
      admissionFee,
      books,
      admissionPaymentStatus,
      admissionAmountPaid,
    } = req.body;

    // Validate books if provided
    if (books !== undefined && books !== null) {
      if (!Array.isArray(books)) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'Books must be an array',
        });
      }
      for (const book of books) {
        if (!book || typeof book.title !== 'string' || book.title.trim() === '') {
          return res.status(400).json({
            success: false,
            data: null,
            message: 'Each book must have a non-empty title',
          });
        }
        if (book.price === undefined || book.price === null || typeof book.price !== 'number' || book.price < 0) {
          return res.status(400).json({
            success: false,
            data: null,
            message: 'Each book must have a valid price greater than or equal to 0',
          });
        }
      }
    }

    // Validate admissionFee if provided
    if (admissionFee !== undefined && admissionFee !== null) {
      const feeNum = Number(admissionFee);
      if (isNaN(feeNum) || feeNum < 0) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'Admission fee must be a valid non-negative number',
        });
      }
    }
 
    // 0. Check if User with registrationNumber already exists
    const userExists = await User.findOne({ registrationNumber: registrationNumber.trim() });
    if (userExists) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'A user with this registration number already exists',
      });
    }

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

    // Compute admission total
    const computedBooksTotal = books ? books.reduce((sum, b) => sum + (b.price || 0), 0) : 0;
    const computedAdmissionTotal = (Number(admissionFee) || 0) + computedBooksTotal;

    let finalPaymentStatus = null;
    let finalAmountPaid = 0;

    if (computedAdmissionTotal > 0) {
      if (!admissionPaymentStatus) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'Payment status is required when an admission fee or books are added',
        });
      }

      if (!['fully_paid', 'unpaid', 'custom_paid'].includes(admissionPaymentStatus)) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'Invalid payment status',
        });
      }

      if (admissionPaymentStatus === 'fully_paid') {
        finalPaymentStatus = 'fully_paid';
        finalAmountPaid = computedAdmissionTotal;
      } else if (admissionPaymentStatus === 'unpaid') {
        finalPaymentStatus = 'unpaid';
        finalAmountPaid = 0;
      } else if (admissionPaymentStatus === 'custom_paid') {
        if (admissionAmountPaid === undefined || admissionAmountPaid === null) {
          return res.status(400).json({
            success: false,
            data: null,
            message: 'Admission amount paid is required for custom_paid status',
          });
        }
        const paidNum = Number(admissionAmountPaid);
        if (isNaN(paidNum) || paidNum < 0 || paidNum > computedAdmissionTotal) {
          return res.status(400).json({
            success: false,
            data: null,
            message: 'Admission amount paid must be a valid number between 0 and the total amount inclusive',
          });
        }
        finalPaymentStatus = 'custom_paid';
        finalAmountPaid = paidNum;
      }
    }
 
    // Create student User account immediately active
    const defaultPassword = 'student123';
    await User.create({
      name: fullName,
      registrationNumber: registrationNumber.trim(),
      password: defaultPassword,
      role: 'student',
      phone: fatherContact,
      isActivated: true,
      isActive: true,
    });

    // 3. Create student
    const student = await Student.create({
      registrationNumber,
      fullName,
      fatherName,
      gender,
      dateOfBirth,
      fatherContact,
      address,
      classId,
      sectionId,
      monthlyFeeAmount,
      status,
      photoUrl,
      admissionFee: Number(admissionFee) || 0,
      books: books || [],
      admissionTotal: computedAdmissionTotal,
      admissionPaymentStatus: finalPaymentStatus,
      admissionAmountPaid: finalAmountPaid,
    });



    // Create FeeRecord if there is a remaining balance
    if (computedAdmissionTotal > 0 && finalAmountPaid < computedAdmissionTotal) {
      const now = new Date();
      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const paymentsArray = [];
      if (finalAmountPaid > 0) {
        paymentsArray.push({
          amount: finalAmountPaid,
          type: 'custom',
          method: 'cash',
          paidOn: now,
        });
      }

      await FeeRecord.create({
        studentId: student._id,
        month: monthStr,
        amountDue: computedAdmissionTotal,
        amountPaid: finalAmountPaid,
        status: finalAmountPaid === 0 ? 'pending' : 'partial',
        type: 'admission',
        payments: paymentsArray,
      });
    }

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
    const regNo = req.user.registrationNumber;

    // Find Student record whose registration number matches the logged-in User's registration number
    const student = await Student.findOne({ registrationNumber: regNo })
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
          registrationNumber: req.user.registrationNumber,
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
    const regNo = req.user.registrationNumber;

    const student = await Student.findOne({ registrationNumber: regNo });
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
    const regNo = req.user.registrationNumber;

    const student = await Student.findOne({ registrationNumber: regNo })
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
    const regNo = req.user.registrationNumber;

    const student = await Student.findOne({ registrationNumber: regNo })
      .populate('classId', 'name')
      .populate('sectionId', 'name');

    if (!student) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'No student profile found linked to your account',
      });
    }

    const FeeRecord = require('../models/FeeRecord');
    const records = await FeeRecord.find({ studentId: student._id }).sort({ month: -1 });

    let totalBilled = 0;
    let totalPaid = 0;
    records.forEach(r => {
      totalBilled += r.amountDue;
      totalPaid += r.amountPaid;
    });

    const history = [];
    records.forEach(r => {
      if (r.payments && r.payments.length > 0) {
        r.payments.forEach(p => {
          history.push({
            amount: p.amount,
            paidOn: p.paidOn,
            method: p.method,
            forMonth: r.month
          });
        });
      }
    });

    history.sort((a, b) => new Date(b.paidOn) - new Date(a.paidOn));

    const currentMonthStr = new Date().toISOString().slice(0, 7);
    const currentRecord = records.find(r => r.month === currentMonthStr) || {
      status: 'pending',
      amountDue: student.monthlyFeeAmount || 0,
      amountPaid: 0,
    };

    return res.status(200).json({
      success: true,
      data: {
        studentName: student.fullName,
        registrationNumber: student.registrationNumber,
        class: student.classId,
        section: student.sectionId,
        feeStatus: currentRecord.status,
        amountDue: currentRecord.amountDue,
        amountPaid: currentRecord.amountPaid,
        balance: currentRecord.amountDue - currentRecord.amountPaid,
        dueDate: null,
        history,
        monthlyRecords: records
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
      address,
      classId,
      sectionId,
      monthlyFeeAmount,
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
    if (address !== undefined) student.address = address;
    if (monthlyFeeAmount !== undefined) student.monthlyFeeAmount = monthlyFeeAmount;
    if (status) student.status = status;
    if (photoUrl !== undefined) student.photoUrl = photoUrl;

    // Update matching User account if exists
    const matchingUser = await User.findOne({ registrationNumber: student.registrationNumber });
    if (matchingUser) {
      if (fullName) matchingUser.name = fullName;
      if (fatherContact) matchingUser.phone = fatherContact;
      if (registrationNumber && registrationNumber !== student.registrationNumber) {
        matchingUser.registrationNumber = registrationNumber.trim();
      }
      await matchingUser.save();
    }

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
 * @desc    Set monthly fee amount for a student
 * @route   PATCH /api/students/:id/monthly-fee
 * @access  Private (Admin Only)
 */
const setMonthlyFeeAmount = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Student not found',
      });
    }

    const { monthlyFeeAmount } = req.body;
    student.monthlyFeeAmount = monthlyFeeAmount;

    await student.save();

    return res.status(200).json({
      success: true,
      data: student,
      message: "Monthly fee updated. This will apply starting next month — the current month's bill has already been set.",
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

    const { getOrCreateCurrentMonthRecord } = require('./feeRecordController');

    for (const student of students) {
      // Lazy load/create the current month's record for accurate metrics
      const record = await getOrCreateCurrentMonthRecord(student._id);
      
      const amountPaid = record.amountPaid || 0;
      const amountDue = record.amountDue || 0;
      const status = record.status || 'pending';

      if (status === 'paid') {
        paidCount++;
      } else {
        pendingCount++;
      }

      totalCollected += amountPaid;
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

/**
 * @desc    Generate student admission receipt PDF
 * @route   GET /api/students/:id/admission-receipt-pdf
 * @access  Private (Admin Only)
 */
const generateAdmissionReceiptPDF = async (req, res, next) => {
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

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${student.registrationNumber}-admission-receipt.pdf"`
    );

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    // Header
    doc.font('Helvetica-Bold').fontSize(20).text('IHASS - Iqra Hadiqa Tul Atfal School', { align: 'center' });
    doc.fontSize(14).text('Student Admission Receipt', { align: 'center' });
    doc.moveDown(1.5);

    // Student Details section
    const startY = doc.y;
    doc.font('Helvetica-Bold').fontSize(12).text('Student Details', 50, startY);
    doc.moveTo(50, startY + 15).lineTo(562, startY + 15).stroke();
    doc.moveDown(0.8);

    let infoY = doc.y;
    doc.font('Helvetica-Bold').fontSize(10).text('Full Name:', 50, infoY);
    doc.font('Helvetica').text(student.fullName || 'N/A', 130, infoY);

    doc.font('Helvetica-Bold').text('Reg Number:', 290, infoY);
    doc.font('Helvetica').text(student.registrationNumber || 'N/A', 370, infoY);

    infoY += 18;
    doc.font('Helvetica-Bold').text("Father's Name:", 50, infoY);
    doc.font('Helvetica').text(student.fatherName || 'N/A', 130, infoY);

    doc.font('Helvetica-Bold').text('Class/Section:', 290, infoY);
    const classSection = `${student.classId?.name || 'N/A'} / ${student.sectionId?.name || 'N/A'}`;
    doc.font('Helvetica').text(classSection, 370, infoY);

    infoY += 18;
    doc.font('Helvetica-Bold').text('Date of Birth:', 50, infoY);
    const dob = student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split('T')[0] : 'N/A';
    doc.font('Helvetica').text(dob, 130, infoY);

    doc.font('Helvetica-Bold').text('Admission Date:', 290, infoY);
    const admissionDate = student.createdAt ? new Date(student.createdAt).toISOString().split('T')[0] : 'N/A';
    doc.font('Helvetica').text(admissionDate, 370, infoY);

    // Books section
    let currentY = infoY + 25;
    doc.font('Helvetica-Bold').fontSize(12).text('Books Purchased at Admission', 50, currentY);
    doc.moveTo(50, currentY + 15).lineTo(562, currentY + 15).stroke();
    currentY += 25;

    const hasBooks = student.books && student.books.length > 0;
    let booksSubtotal = 0;

    if (hasBooks) {
      doc.font('Helvetica-Bold').fontSize(10);
      doc.text('Book Title', 50, currentY, { width: 350 });
      doc.text('Price', 400, currentY, { width: 162, align: 'right' });
      doc.moveTo(50, currentY + 15).lineTo(562, currentY + 15).strokeColor('#cccccc').lineWidth(0.5).stroke().strokeColor('#000000').lineWidth(1);
      currentY += 20;

      doc.font('Helvetica');
      student.books.forEach(book => {
        booksSubtotal += book.price;
        doc.text(book.title, 50, currentY, { width: 350 });
        doc.text(`Rs. ${book.price.toFixed(2)}`, 400, currentY, { width: 162, align: 'right' });
        currentY += 18;
      });

      // Subtotal row
      doc.moveTo(50, currentY).lineTo(562, currentY).strokeColor('#cccccc').lineWidth(0.5).stroke().strokeColor('#000000').lineWidth(1);
      currentY += 5;
      doc.font('Helvetica-Bold');
      doc.text('Books Subtotal', 50, currentY, { width: 350 });
      doc.text(`Rs. ${booksSubtotal.toFixed(2)}`, 400, currentY, { width: 162, align: 'right' });
      currentY += 20;
    } else {
      doc.font('Helvetica-Oblique').fontSize(10);
      doc.text('No books purchased at admission.', 50, currentY);
      currentY += 25;
    }

    // Admission Fee section
    doc.font('Helvetica-Bold').fontSize(12).text('Admission Fee', 50, currentY);
    doc.moveTo(50, currentY + 15).lineTo(562, currentY + 15).stroke();
    currentY += 25;

    const admissionFeeAmount = student.admissionFee || 0;
    if (admissionFeeAmount > 0) {
      doc.font('Helvetica').fontSize(10).text('Admission Fee Amount:', 50, currentY);
      doc.text(`Rs. ${admissionFeeAmount.toFixed(2)}`, 400, currentY, { width: 162, align: 'right' });
      currentY += 20;
    } else {
      doc.font('Helvetica-Oblique').fontSize(10).text('No admission fee recorded', 50, currentY);
      currentY += 20;
    }

    // Payment Status Section
    if (student.admissionTotal > 0) {
      currentY += 10;
      doc.font('Helvetica-Bold').fontSize(12).text('Payment Status', 50, currentY);
      doc.moveTo(50, currentY + 15).lineTo(562, currentY + 15).stroke();
      currentY += 25;

      doc.font('Helvetica').fontSize(10);
      if (student.admissionPaymentStatus === 'fully_paid') {
        doc.text('Payment Status: Fully Paid', 50, currentY);
        currentY += 15;
      } else if (student.admissionPaymentStatus === 'unpaid') {
        doc.text('Payment Status: Unpaid', 50, currentY);
        currentY += 15;
      } else if (student.admissionPaymentStatus === 'custom_paid') {
        const remaining = student.admissionTotal - student.admissionAmountPaid;
        doc.text(`Payment Status: Custom Paid (Amount Paid: Rs. ${student.admissionAmountPaid.toFixed(2)} / Remaining: Rs. ${remaining.toFixed(2)})`, 50, currentY);
        currentY += 15;
      }
    }

    // Grand Total Section
    const grandTotal = admissionFeeAmount + booksSubtotal;
    currentY += 10;
    doc.moveTo(50, currentY).lineTo(562, currentY).lineWidth(1.5).stroke().lineWidth(1);
    currentY += 10;

    doc.font('Helvetica-Bold').fontSize(14).text('GRAND TOTAL:', 50, currentY);
    doc.fontSize(14).text(`Rs. ${grandTotal.toFixed(2)}`, 400, currentY, { width: 162, align: 'right' });

    currentY += 25;
    doc.moveTo(50, currentY).lineTo(562, currentY).lineWidth(1.5).stroke().lineWidth(1);

    // Footer section
    const nowStr = new Date().toLocaleString();
    doc.fontSize(8).font('Helvetica-Oblique').text(`Generated on ${nowStr}`, 50, 715, { align: 'center' });
    doc.text('Note: This is an admission-time receipt, distinct from monthly fee receipts.', 50, 725, { align: 'center' });

    doc.end();
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
  setMonthlyFeeAmount,
  getFeeSummaryByClass,
  generateAdmissionReceiptPDF,
};
