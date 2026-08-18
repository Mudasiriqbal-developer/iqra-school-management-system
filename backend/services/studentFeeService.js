const mongoose = require('mongoose');
const Student = require('../models/Student');
const { getOrCreateCurrentMonthRecord } = require('../controllers/feeRecordController');

/**
 * Updates the monthly fee amount for a student.
 */
const setMonthlyFeeAmount = async (id, monthlyFeeAmount) => {
  const student = await Student.findById(id);
  if (!student) {
    const error = new Error('Student not found');
    error.statusCode = 404;
    throw error;
  }

  student.monthlyFeeAmount = monthlyFeeAmount;
  await student.save();
  return student;
};

/**
 * Retrieves the fee summary aggregated by class and/or section, or school-wide.
 */
const getFeeSummaryByClass = async (query) => {
  const { classId, sectionId } = query;
  const filter = {};

  // Validate if classId is a valid Mongo ID if provided
  if (classId) {
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      const error = new Error('Invalid Class ID format');
      error.statusCode = 400;
      throw error;
    }
    filter.classId = classId;
  }

  // Validate if sectionId is a valid Mongo ID if provided
  if (sectionId) {
    if (!mongoose.Types.ObjectId.isValid(sectionId)) {
      const error = new Error('Invalid Section ID format');
      error.statusCode = 400;
      throw error;
    }
    filter.sectionId = sectionId;
  }

  // Exclude graduated students from fee calculations
  filter.status = { $ne: 'graduated' };

  // Fetch matching students
  const students = await Student.find(filter);

  let totalStudents = students.length;
  let paidCount = 0;
  let pendingCount = 0;
  let overdueCount = 0;
  let totalCollected = 0;
  let totalOutstanding = 0;

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

  return {
    totalStudents,
    paidCount,
    pendingCount,
    overdueCount,
    totalCollected,
    totalOutstanding,
  };
};

module.exports = {
  setMonthlyFeeAmount,
  getFeeSummaryByClass,
};
