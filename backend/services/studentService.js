const mongoose = require('mongoose');
const Student = require('../models/Student');
const User = require('../models/User');
const Class = require('../models/Class');
const Section = require('../models/Section');
const Teacher = require('../models/Teacher');
const Assignment = require('../models/Assignment');
const FeeRecord = require('../models/FeeRecord');
const checkTeacherStudentAccess = require('../middleware/checkTeacherStudentAccess');
const studentFeeService = require('./studentFeeService');

/**
 * Business logic for creating a new student.
 */
const createStudent = async (studentData) => {
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
  } = studentData;

  // Validate books if provided
  if (books !== undefined && books !== null) {
    if (!Array.isArray(books)) {
      const error = new Error('Books must be an array');
      error.statusCode = 400;
      throw error;
    }
    for (const book of books) {
      if (!book || typeof book.title !== 'string' || book.title.trim() === '') {
        const error = new Error('Each book must have a non-empty title');
        error.statusCode = 400;
        throw error;
      }
      if (book.price === undefined || book.price === null || typeof book.price !== 'number' || book.price < 0) {
        const error = new Error('Each book must have a valid price greater than or equal to 0');
        error.statusCode = 400;
        throw error;
      }
    }
  }

  // Validate admissionFee if provided
  if (admissionFee !== undefined && admissionFee !== null) {
    const feeNum = Number(admissionFee);
    if (isNaN(feeNum) || feeNum < 0) {
      const error = new Error('Admission fee must be a valid non-negative number');
      error.statusCode = 400;
      throw error;
    }
  }

  // 0. Check if User with registrationNumber already exists
  const userExists = await User.findOne({ registrationNumber: registrationNumber.trim() });
  if (userExists) {
    const error = new Error('A user with this registration number already exists');
    error.statusCode = 400;
    throw error;
  }

  // 1. Check registration number unique
  const registrationExists = await Student.findOne({ registrationNumber });
  if (registrationExists) {
    const error = new Error('A student with this registration number already exists');
    error.statusCode = 400;
    throw error;
  }

  // 2. Check if Class and Section exist
  const classExists = await Class.findById(classId);
  if (!classExists) {
    const error = new Error('Class not found');
    error.statusCode = 404;
    throw error;
  }

  const sectionExists = await Section.findById(sectionId);
  if (!sectionExists) {
    const error = new Error('Section not found');
    error.statusCode = 404;
    throw error;
  }

  // Compute admission total
  const computedBooksTotal = books ? books.reduce((sum, b) => sum + (b.price || 0), 0) : 0;
  const computedAdmissionTotal = (Number(admissionFee) || 0) + computedBooksTotal;

  let finalPaymentStatus = null;
  let finalAmountPaid = 0;

  if (computedAdmissionTotal > 0) {
    if (!admissionPaymentStatus) {
      const error = new Error('Payment status is required when an admission fee or books are added');
      error.statusCode = 400;
      throw error;
    }

    if (!['fully_paid', 'unpaid', 'custom_paid'].includes(admissionPaymentStatus)) {
      const error = new Error('Invalid payment status');
      error.statusCode = 400;
      throw error;
    }

    if (admissionPaymentStatus === 'fully_paid') {
      finalPaymentStatus = 'fully_paid';
      finalAmountPaid = computedAdmissionTotal;
    } else if (admissionPaymentStatus === 'unpaid') {
      finalPaymentStatus = 'unpaid';
      finalAmountPaid = 0;
    } else if (admissionPaymentStatus === 'custom_paid') {
      if (admissionAmountPaid === undefined || admissionAmountPaid === null) {
        const error = new Error('Admission amount paid is required for custom_paid status');
        error.statusCode = 400;
        throw error;
      }
      const paidNum = Number(admissionAmountPaid);
      if (isNaN(paidNum) || paidNum < 0 || paidNum > computedAdmissionTotal) {
        const error = new Error('Admission amount paid must be a valid number between 0 and the total amount inclusive');
        error.statusCode = 400;
        throw error;
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

  return student;
};

/**
 * Business logic for getting all students with filtering, search, pagination, and teacher restrictions.
 */
const getAllStudents = async (query, user) => {
  const { classId, sectionId, status, search, page = 1, limit = 10 } = query;

  const pageVal = parseInt(page, 10);
  const limitVal = parseInt(limit, 10);
  const skipVal = (pageVal - 1) * limitVal;

  const filter = {};

  // Apply status filter — default excludes graduated students from normal views
  if (status) {
    filter.status = status;
  } else {
    filter.status = { $ne: 'graduated' };
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
  if (user.role === 'teacher') {
    const teacher = await Teacher.findOne({ userId: user.id || user._id });
    if (!teacher) {
      return {
        data: { students: [], total: 0, page: pageVal, pages: 0 },
        message: 'No students found (no teacher profile matches)',
      };
    }

    // Fetch teacher assignments
    const assignments = await Assignment.find({ teacherId: teacher._id });
    if (assignments.length === 0) {
      return {
        data: { students: [], total: 0, page: pageVal, pages: 0 },
        message: 'No students found (teacher has no assignments)',
      };
    }

    // Handle combination logic
    if (classId && sectionId) {
      // Intersect requested combination with assignments
      const isAssigned = assignments.some(
        a => a.classId.toString() === classId && a.sectionId.toString() === sectionId
      );
      if (!isAssigned) {
        // Silently return empty results
        return {
          data: { students: [], total: 0, page: pageVal, pages: 0 },
          message: 'No students found (not assigned to this combination)',
        };
      }
      filter.classId = classId;
      filter.sectionId = sectionId;
    } else if (classId) {
      // Teacher requested specific class. Filter assignments matching this classId.
      const assignedSections = assignments
        .filter(a => a.classId.toString() === classId)
        .map(a => a.sectionId);
      
      if (assignedSections.length === 0) {
        return {
          data: { students: [], total: 0, page: pageVal, pages: 0 },
          message: 'No students found',
        };
      }
      filter.classId = classId;
      filter.sectionId = { $in: assignedSections };
    } else if (sectionId) {
      // Teacher requested specific section. Filter assignments matching this sectionId.
      const assignedClasses = assignments
        .filter(a => a.sectionId.toString() === sectionId)
        .map(a => a.classId);

      if (assignedClasses.length === 0) {
        return {
          data: { students: [], total: 0, page: pageVal, pages: 0 },
          message: 'No students found',
        };
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
    .populate('familyId', 'familyName')
    .skip(skipVal)
    .limit(limitVal)
    .sort({ createdAt: -1 });

  const pages = Math.ceil(total / limitVal);

  // Compute live feeInfo for stats/display
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const studentIds = students.map(s => s._id);
  const currentRecords = await FeeRecord.find({
    studentId: { $in: studentIds },
    month: currentMonthStr,
    type: 'monthly'
  });

  const recordsMap = new Map();
  currentRecords.forEach(r => {
    recordsMap.set(r.studentId.toString(), r.status);
  });

  const studentsWithFees = students.map(s => {
    const sObj = s.toObject();
    const status = recordsMap.get(s._id.toString()) || 'pending';
    let feeStatus = 'unpaid';
    if (status === 'paid') feeStatus = 'paid';
    else if (status === 'partial') feeStatus = 'partial';
    else feeStatus = 'pending';

    sObj.feeInfo = {
      status: feeStatus,
      dueDate: null
    };
    return sObj;
  });

  return {
    data: {
      students: studentsWithFees,
      total,
      page: pageVal,
      pages,
    },
    message: 'Students fetched successfully',
  };
};

/**
 * Business logic for getting a student by ID.
 */
const getStudentById = async (id, user) => {
  const student = await Student.findById(id)
    .populate('classId', 'name')
    .populate('sectionId', 'name')
    .populate('familyId', 'familyName');

  if (!student) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  // If teacher, check if assigned to student's class + section
  if (user.role === 'teacher') {
    const { hasAccess, teacher } = await checkTeacherStudentAccess(
      user.id || user._id,
      student.classId._id || student.classId,
      student.sectionId._id || student.sectionId
    );

    if (!teacher) {
      const error = new Error('Teacher profile not found');
      error.statusCode = 403;
      throw error;
    }

    if (!hasAccess) {
      const error = new Error("You are not assigned to this student's class");
      error.statusCode = 403;
      throw error;
    }
  }

  // Compute live feeSummary from student's ledger
  const ledgerData = await studentFeeService.getStudentLedgerData(student._id);
  const records = ledgerData.records;

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const currentRecord = records.find(r => r.month === currentMonthStr && r.type === 'monthly') || records[0];

  let currentFeeStatus = 'Unpaid';
  let dueDate = null;

  if (currentRecord) {
    if (currentRecord.status === 'paid') {
      currentFeeStatus = 'Paid';
    } else if (currentRecord.status === 'partial') {
      currentFeeStatus = 'Partial';
    }
    dueDate = currentRecord.dueDate || null;
  }

  const studentObj = student.toObject();
  studentObj.feeSummary = {
    currentFeeStatus,
    dueDate,
    paymentHistory: records,
  };

  return studentObj;
};

/**
 * Business logic for updating student details.
 */
const updateStudent = async (id, studentData) => {
  const student = await Student.findById(id);
  if (!student) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
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
  } = studentData;

  // Check unique registration number if changed
  if (registrationNumber && registrationNumber !== student.registrationNumber) {
    const duplicate = await Student.findOne({ registrationNumber });
    if (duplicate) {
      const error = new Error('A student with this registration number already exists');
      error.statusCode = 400;
      throw error;
    }
    student.registrationNumber = registrationNumber;
  }

  if (classId) {
    const classExists = await Class.findById(classId);
    if (!classExists) {
      const error = new Error('Class not found');
      error.statusCode = 404;
      throw error;
    }
    student.classId = classId;
  }

  if (sectionId) {
    const sectionExists = await Section.findById(sectionId);
    if (!sectionExists) {
      const error = new Error('Section not found');
      error.statusCode = 404;
      throw error;
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

  return populated;
};

/**
 * Business logic for deleting a student (soft delete).
 */
const deleteStudent = async (id) => {
  const student = await Student.findById(id);
  if (!student) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  // Soft delete: set status to suspended
  student.status = 'suspended';
  await student.save();

  return student;
};

/**
 * Business logic for resetting a student's password.
 */
const resetStudentPassword = async (id, password) => {
  const student = await Student.findById(id);
  if (!student) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  const finalPassword = (password && password.trim() !== '') ? password : 'student123';

  if (finalPassword.length < 6) {
    const error = new Error('Password must be at least 6 characters long');
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findOne({ registrationNumber: student.registrationNumber });
  if (!user) {
    const error = new Error('Student user account not found');
    error.statusCode = 404;
    throw error;
  }

  user.password = finalPassword;
  await user.save();

  return `Password reset successfully for ${student.fullName} (Roll No: ${student.registrationNumber})`;
};

module.exports = {
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  resetStudentPassword,
};
