const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Assignment = require('../models/Assignment');
const FeeRecord = require('../models/FeeRecord');
const { resolveStudentMonthlyFee } = require('../utils/feeHelper');

/**
 * Returns the student's profile details linked to their user account.
 */
const getMyProfile = async (user) => {
  const regNo = user.registrationNumber;

  const student = await Student.findOne({ registrationNumber: regNo })
    .populate('classId', 'name')
    .populate('sectionId', 'name');

  if (!student) {
    const error = new Error('No student profile found linked to your account');
    error.statusCode = 404;
    throw error;
  }

  return {
    student,
    user: {
      id: user._id || user.id,
      name: user.name,
      registrationNumber: user.registrationNumber,
      role: user.role,
      phone: user.phone,
    },
  };
};

/**
 * Returns attendance statistics and day-by-day records.
 */
const getMyAttendance = async (user, query) => {
  const regNo = user.registrationNumber;

  const student = await Student.findOne({ registrationNumber: regNo });
  if (!student) {
    const error = new Error('No student profile found linked to your account');
    error.statusCode = 404;
    throw error;
  }

  const { from, to } = query;
  const dateFilter = {};
  if (from) dateFilter.$gte = new Date(from);
  if (to) dateFilter.$lte = new Date(to);

  const matchStage = {
    classId: student.classId,
    sectionId: student.sectionId,
    'records.studentId': student._id,
  };
  if (Object.keys(dateFilter).length > 0) {
    matchStage.date = dateFilter;
  }

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

  const totalDays = results.length;
  const presentDays = results.filter(r => r.status === 'present').length;
  const absentDays = results.filter(r => r.status === 'absent').length;
  const lateDays = results.filter(r => r.status === 'late').length;
  const leaveDays = results.filter(r => r.status === 'leave').length;
  const attendanceRate = totalDays > 0
    ? Math.round(((presentDays + lateDays) / totalDays) * 10000) / 100
    : 0;

  return {
    summary: {
      totalDays,
      presentDays,
      absentDays,
      lateDays,
      leaveDays,
      attendanceRate,
    },
    records: results,
  };
};

/**
 * Returns list of subjects and teachers assigned to the student's class and section.
 */
const getMySubjects = async (user) => {
  const regNo = user.registrationNumber;

  const student = await Student.findOne({ registrationNumber: regNo })
    .populate('classId', 'name')
    .populate('sectionId', 'name');

  if (!student) {
    const error = new Error('No student profile found linked to your account');
    error.statusCode = 404;
    throw error;
  }

  const assignments = await Assignment.find({
    classId: student.classId._id,
    sectionId: student.sectionId._id,
  })
    .populate('subjectId', 'name')
    .populate({
      path: 'teacherId',
      select: 'fullName qualification',
    });

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

  return {
    class: student.classId,
    section: student.sectionId,
    subjects,
  };
};

/**
 * Returns fee records summary and history.
 */
const getMyFeeHistory = async (user) => {
  const regNo = user.registrationNumber;

  const student = await Student.findOne({ registrationNumber: regNo })
    .populate('classId', 'name defaultFee')
    .populate('sectionId', 'name');

  if (!student) {
    const error = new Error('No student profile found linked to your account');
    error.statusCode = 404;
    throw error;
  }

  const records = await FeeRecord.find({ studentId: student._id }).sort({ createdAt: -1 });

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
        const itemDesc = r.type === 'one_time'
          ? (r.title || 'One-Time Charge')
          : (r.type === 'admission' ? 'Admission & Books' : `Monthly Tuition (${r.month})`);

        history.push({
          paymentId: p._id,
          amount: p.amount,
          method: p.method,
          paidOn: p.paidOn,
          type: p.type,
          forMonth: r.month,
          feeType: r.type,
          description: itemDesc
        });
      });
    }
  });

  history.sort((a, b) => new Date(b.paidOn) - new Date(a.paidOn));

  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const currentRecord = records.find(r => r.month === currentMonthStr && r.type === 'monthly') || {
    status: 'pending',
    amountDue: resolveStudentMonthlyFee(student),
    amountPaid: 0,
  };

  const oneTimeCharges = records
    .filter(r => r.type === 'one_time')
    .map(r => ({
      _id: r._id,
      title: r.title || 'One-Time Charge',
      amountDue: r.amountDue,
      amountPaid: r.amountPaid,
      balance: Math.max(0, r.amountDue - r.amountPaid),
      status: r.status,
      dueDate: r.dueDate,
      createdAt: r.createdAt
    }));

  return {
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
    oneTimeCharges,
    monthlyRecords: records
  };
};

module.exports = {
  getMyProfile,
  getMyAttendance,
  getMySubjects,
  getMyFeeHistory,
};
