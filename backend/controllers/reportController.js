const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');

/**
 * @desc    Get student fee defaulters
 * @route   GET /api/reports/fee-defaulters
 * @access  Private (Admin Only)
 */
const getFeeDefaulters = async (req, res, next) => {
  try {
    const { classId, sectionId } = req.query;

    const filter = {
      'feeInfo.status': { $in: ['pending', 'overdue'] },
      $expr: {
        $gt: [
          { $subtract: [{ $ifNull: ['$feeInfo.amountDue', 0] }, { $ifNull: ['$feeInfo.amountPaid', 0] }] },
          0
        ]
      }
    };

    if (classId && classId.trim() !== '') {
      filter.classId = classId;
    }
    if (sectionId && sectionId.trim() !== '') {
      filter.sectionId = sectionId;
    }

    const students = await Student.find(filter)
      .populate('classId', 'name')
      .populate('sectionId', 'name');

    const defaulters = students.map(student => {
      const amountDue = student.feeInfo?.amountDue || 0;
      const amountPaid = student.feeInfo?.amountPaid || 0;
      const outstandingAmount = amountDue - amountPaid;

      return {
        studentId: student._id,
        registrationNumber: student.registrationNumber,
        fullName: student.fullName,
        fatherName: student.fatherName,
        fatherContact: student.fatherContact,
        classId: student.classId ? { _id: student.classId._id, name: student.classId.name } : null,
        sectionId: student.sectionId ? { _id: student.sectionId._id, name: student.sectionId.name } : null,
        amountDue,
        amountPaid,
        outstandingAmount,
        dueDate: student.feeInfo?.dueDate || null,
        status: student.feeInfo?.status || null
      };
    });

    // Sort by outstandingAmount descending
    defaulters.sort((a, b) => b.outstandingAmount - a.outstandingAmount);

    const totalOutstanding = defaulters.reduce((sum, item) => sum + item.outstandingAmount, 0);

    return res.status(200).json({
      success: true,
      data: {
        defaulters,
        totalOutstanding
      },
      message: 'Fee defaulters retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper function to retrieve fee payments for a given month and year
 */
const getMonthlyPayments = async (month, year) => {
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);

  if (isNaN(m) || isNaN(y) || m < 1 || m > 12) {
    throw new Error('Valid month (1-12) and year are required');
  }

  // Create date range in UTC
  const startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));

  const students = await Student.find({
    'feeInfo.history.paidOn': { $gte: startDate, $lt: endDate }
  })
    .populate('classId', 'name')
    .populate('sectionId', 'name');

  const payments = [];
  students.forEach(student => {
    if (student.feeInfo && student.feeInfo.history) {
      student.feeInfo.history.forEach(payment => {
        const paidOnDate = new Date(payment.paidOn);
        if (paidOnDate >= startDate && paidOnDate < endDate) {
          payments.push({
            studentName: student.fullName,
            registrationNumber: student.registrationNumber,
            className: student.classId ? student.classId.name : 'N/A',
            sectionName: student.sectionId ? student.sectionId.name : 'N/A',
            amount: payment.amount,
            method: payment.method,
            paidOn: paidOnDate.toISOString().split('T')[0]
          });
        }
      });
    }
  });

  // Sort chronologically by paidOn
  payments.sort((a, b) => new Date(a.paidOn) - new Date(b.paidOn));
  return { payments, m, y };
};

/**
 * @desc    Export monthly fee collection report as CSV
 * @route   GET /api/reports/collections/export
 * @access  Private (Admin Only)
 */
const exportMonthlyCollectionsCSV = async (req, res, next) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Month and year query parameters are required'
      });
    }

    const { payments } = await getMonthlyPayments(month, year);

    const fields = ['studentName', 'registrationNumber', 'className', 'sectionName', 'amount', 'method', 'paidOn'];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(payments);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="collections-${month}-${year}.csv"`);
    return res.status(200).send(csv);
  } catch (error) {
    if (error.message.includes('Valid month')) {
      return res.status(400).json({
        success: false,
        data: null,
        message: error.message
      });
    }
    next(error);
  }
};

/**
 * @desc    Export monthly fee collection report as PDF
 * @route   GET /api/reports/collections/export-pdf
 * @access  Private (Admin Only)
 */
const exportMonthlyCollectionsPDF = async (req, res, next) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Month and year query parameters are required'
      });
    }

    const { payments, m, y } = await getMonthlyPayments(month, year);

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthNameStr = monthNames[m - 1] || month;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="collections-${month}-${year}.pdf"`);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    // Document header
    doc.font('Helvetica-Bold').fontSize(18).text('IHASS', { align: 'center' });
    doc.fontSize(14).text(`Monthly Fee Collection Report - ${monthNameStr} ${y}`, { align: 'center' });
    doc.moveDown(2);

    // Columns config
    const studentColX = 50;
    const classColX = 190;
    const methodColX = 310;
    const dateColX = 390;
    const amountColX = 470;

    const colWidths = {
      student: 130,
      class: 110,
      method: 70,
      date: 75,
      amount: 87
    };

    const tableTop = doc.y;

    // Draw headers
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('Student Name', studentColX, tableTop, { width: colWidths.student });
    doc.text('Class/Section', classColX, tableTop, { width: colWidths.class });
    doc.text('Method', methodColX, tableTop, { width: colWidths.method });
    doc.text('Date', dateColX, tableTop, { width: colWidths.date });
    doc.text('Amount', amountColX, tableTop, { width: colWidths.amount, align: 'right' });

    // Underline headers
    doc.moveTo(50, tableTop + 15).lineTo(562, tableTop + 15).stroke();

    let yPosition = tableTop + 25;
    let totalSum = 0;

    doc.font('Helvetica');
    payments.forEach(payment => {
      // Check page overflow
      if (yPosition > 720) {
        doc.addPage();
        yPosition = 50;
        // Draw headers again on new page
        doc.font('Helvetica-Bold').fontSize(10);
        doc.text('Student Name', studentColX, yPosition, { width: colWidths.student });
        doc.text('Class/Section', classColX, yPosition, { width: colWidths.class });
        doc.text('Method', methodColX, yPosition, { width: colWidths.method });
        doc.text('Date', dateColX, yPosition, { width: colWidths.date });
        doc.text('Amount', amountColX, yPosition, { width: colWidths.amount, align: 'right' });
        doc.moveTo(50, yPosition + 15).lineTo(562, yPosition + 15).stroke();
        doc.font('Helvetica');
        yPosition += 25;
      }

      const classSection = `${payment.className} / ${payment.sectionName}`;
      doc.text(payment.studentName, studentColX, yPosition, { width: colWidths.student, lineBreak: false });
      doc.text(classSection, classColX, yPosition, { width: colWidths.class, lineBreak: false });
      doc.text(payment.method, methodColX, yPosition, { width: colWidths.method, lineBreak: false });
      doc.text(payment.paidOn, dateColX, yPosition, { width: colWidths.date, lineBreak: false });
      doc.text(payment.amount.toFixed(2), amountColX, yPosition, { width: colWidths.amount, align: 'right', lineBreak: false });

      totalSum += payment.amount;
      yPosition += 20;
    });

    // Check if total fits on page
    if (yPosition > 740) {
      doc.addPage();
      yPosition = 50;
    }

    // Underline last row
    doc.moveTo(50, yPosition).lineTo(562, yPosition).stroke();
    yPosition += 10;

    // Total Sum
    doc.font('Helvetica-Bold');
    doc.text('Total Collected:', dateColX - 20, yPosition, { width: colWidths.date + 20, align: 'right' });
    doc.text(totalSum.toFixed(2), amountColX, yPosition, { width: colWidths.amount, align: 'right' });

    doc.end();
  } catch (error) {
    if (error.message.includes('Valid month')) {
      return res.status(400).json({
        success: false,
        data: null,
        message: error.message
      });
    }
    next(error);
  }
};

/**
 * @desc    Get class-wise attendance summary
 * @route   GET /api/reports/attendance-summary
 * @access  Private (Admin Only)
 */
const getClassWiseAttendanceSummary = async (req, res, next) => {
  try {
    let startStr = req.query.startDate;
    let endStr = req.query.endDate;

    if (!startStr || !endStr) {
      // Default to last 30 days
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 30);
      
      if (!startStr) startStr = start.toISOString().split('T')[0];
      if (!endStr) endStr = end.toISOString().split('T')[0];
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startStr) || !dateRegex.test(endStr)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Invalid date format. Use YYYY-MM-DD'
      });
    }

    // Find all attendance records in range
    const attendanceDocs = await Attendance.find({
      date: { $gte: startStr, $lte: endStr }
    }).populate({
      path: 'records.studentId',
      select: 'classId sectionId',
      populate: [
        { path: 'classId', select: 'name' },
        { path: 'sectionId', select: 'name' }
      ]
    });

    const summaryMap = {};

    attendanceDocs.forEach(doc => {
      if (!doc.records) return;
      doc.records.forEach(rec => {
        const student = rec.studentId;
        if (!student || !student.classId || !student.sectionId) return;

        const classId = student.classId._id.toString();
        const className = student.classId.name;
        const sectionId = student.sectionId._id.toString();
        const sectionName = student.sectionId.name;

        const key = `${classId}_${sectionId}`;
        if (!summaryMap[key]) {
          summaryMap[key] = {
            classId,
            className,
            sectionId,
            sectionName,
            totalPresent: 0,
            totalCount: 0,
            dates: new Set()
          };
        }

        summaryMap[key].totalCount += 1;
        if (rec.status === 'present' || rec.status === 'late') {
          summaryMap[key].totalPresent += 1;
        }
        summaryMap[key].dates.add(doc.date);
      });
    });

    const summaryList = Object.values(summaryMap).map(item => {
      const avg = item.totalCount > 0 ? Math.round((item.totalPresent / item.totalCount) * 100) : 0;
      return {
        classId: item.classId,
        className: item.className,
        sectionId: item.sectionId,
        sectionName: item.sectionName,
        averageAttendancePercentage: avg,
        averagePresentPercentage: avg,
        totalRecordsMarked: item.totalCount,
        totalDaysRecorded: item.dates.size
      };
    });

    // Sort by averageAttendancePercentage ascending (worst-performing first)
    summaryList.sort((a, b) => a.averageAttendancePercentage - b.averageAttendancePercentage);

    return res.status(200).json({
      success: true,
      data: summaryList,
      message: 'Attendance summary retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFeeDefaulters,
  exportMonthlyCollectionsCSV,
  exportMonthlyCollectionsPDF,
  getClassWiseAttendanceSummary
};
