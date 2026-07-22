const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Class = require('../models/Class');
const Section = require('../models/Section');
const PDFDocument = require('pdfkit');
const { drawBrandedHeader, drawFooter, addPageNumbers } = require('../utils/pdfHelper');


/**
 * @desc    Get student fee defaulters
 * @route   GET /api/reports/fee-defaulters
 * @access  Private (Admin Only)
 */
/**
 * Helper function to retrieve fee defaulters filtered by class and section
 */
const fetchDefaultersData = async (classId, sectionId) => {
  const studentFilter = { status: 'active' }; // Only track active students as defaulters

  if (classId && classId.trim() !== '') {
    studentFilter.classId = classId;
  }
  if (sectionId && sectionId.trim() !== '') {
    studentFilter.sectionId = sectionId;
  }

  const students = await Student.find(studentFilter)
    .populate('classId', 'name')
    .populate('sectionId', 'name');

  const { getOrCreateCurrentMonthRecord } = require('./feeRecordController');
  const defaulters = [];

  for (const student of students) {
    const record = await getOrCreateCurrentMonthRecord(student._id);

    if (record.status !== 'paid') {
      const outstandingAmount = record.amountDue - record.amountPaid;
      if (outstandingAmount > 0) {
        defaulters.push({
          studentId: student._id,
          registrationNumber: student.registrationNumber,
          fullName: student.fullName,
          fatherName: student.fatherName,
          fatherContact: student.fatherContact,
          classId: student.classId ? { _id: student.classId._id, name: student.classId.name } : null,
          sectionId: student.sectionId ? { _id: student.sectionId._id, name: student.sectionId.name } : null,
          amountDue: record.amountDue,
          amountPaid: record.amountPaid,
          outstandingAmount,
          dueDate: record.dueDate || null,
          status: record.status
        });
      }
    }
  }

  // Sort by outstandingAmount descending
  defaulters.sort((a, b) => b.outstandingAmount - a.outstandingAmount);

  const totalOutstanding = defaulters.reduce((sum, item) => sum + item.outstandingAmount, 0);

  return { defaulters, totalOutstanding };
};

/**
 * @desc    Get student fee defaulters
 * @route   GET /api/reports/fee-defaulters
 * @access  Private (Admin Only)
 */
const getFeeDefaulters = async (req, res, next) => {
  try {
    const { classId, sectionId } = req.query;
    const { defaulters, totalOutstanding } = await fetchDefaultersData(classId, sectionId);

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

  const FeeRecord = require('../models/FeeRecord');

  const records = await FeeRecord.find({
    'payments.paidOn': { $gte: startDate, $lt: endDate }
  }).populate({
    path: 'studentId',
    populate: ['classId', 'sectionId']
  });

  const payments = [];
  records.forEach(record => {
    const student = record.studentId;
    if (!student) return;

    record.payments.forEach(payment => {
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

    const header = 'Student Name,Registration Number,Class,Section,Amount,Method,Paid On\n';
    const rows = payments.map(p => `"${p.studentName}","${p.registrationNumber}","${p.className}","${p.sectionName}",${p.amount},"${p.method}","${p.paidOn}"`).join('\n');
    const csv = header + rows;

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
    const subtitleStr = `Month: ${monthNameStr} ${y}`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="collections-${month}-${year}.pdf"`);

    const doc = new PDFDocument({ 
      margins: { top: 125, bottom: 60, left: 50, right: 50 },
      bufferPages: true
    });
    doc.pipe(res);

    const title = 'Monthly Collections Report';

    // Draw first page header/footer
    drawBrandedHeader(doc, title, subtitleStr);
    drawFooter(doc);

    // Register listener for subsequent pages
    const onPageAdded = () => {
      drawBrandedHeader(doc, title, subtitleStr);
      drawFooter(doc);
    };
    doc.on('pageAdded', onPageAdded);

    const totalSum = payments.reduce((sum, item) => sum + item.amount, 0);
    let currentY = 125;

    // Draw Summary Box
    doc.save();
    doc.rect(50, currentY, 512, 45).fillAndStroke('#F0FDF4', '#BBF7D0'); // Subtle green background and border
    doc.fillColor('#166534').font('Helvetica-Bold').fontSize(8.5);
    
    doc.text('Collections Count:', 65, currentY + 12);
    doc.font('Helvetica').fillColor('#1E293B').text(`${payments.length} Transaction(s)`, 150, currentY + 12);

    doc.font('Helvetica-Bold').fillColor('#166534').text('Report Month:', 65, currentY + 25);
    doc.font('Helvetica').fillColor('#1E293B').text(`${monthNameStr} ${y}`, 150, currentY + 25);

    doc.font('Helvetica-Bold').fillColor('#166534').text('Total Collected:', 330, currentY + 16);
    doc.fontSize(12).fillColor('#16A34A').text(`Rs. ${totalSum.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 425, currentY + 14);
    doc.restore();

    currentY += 60;

    // Columns config
    const studentColX = 50;
    const classColX = 200;
    const methodColX = 310;
    const dateColX = 380;
    const amountColX = 460;

    const colWidths = {
      student: 145,
      class: 105,
      method: 65,
      date: 75,
      amount: 102
    };

    // Draw Table Header
    doc.save();
    doc.rect(50, currentY, 512, 22).fill('#00215E');
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.5);
    
    doc.text('Student Details', studentColX + 5, currentY + 7, { width: colWidths.student - 5 });
    doc.text('Class/Section', classColX, currentY + 7, { width: colWidths.class });
    doc.text('Method', methodColX, currentY + 7, { width: colWidths.method });
    doc.text('Date Paid', dateColX, currentY + 7, { width: colWidths.date });
    doc.text('Amount Received', amountColX, currentY + 7, { width: colWidths.amount, align: 'right' });
    doc.restore();

    let yPosition = currentY + 28;
    const maxAllowedY = 670;

    payments.forEach((payment, index) => {
      // Safe manual page break check before drawing the row (24pt height)
      if (yPosition + 24 > maxAllowedY) {
        doc.addPage();
        yPosition = 125; // starts after top margin

        // Draw Table Header again at top of new page
        doc.save();
        doc.rect(50, yPosition, 512, 22).fill('#00215E');
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.5);
        doc.text('Student Details', studentColX + 5, yPosition + 7, { width: colWidths.student - 5 });
        doc.text('Class/Section', classColX, yPosition + 7, { width: colWidths.class });
        doc.text('Method', methodColX, yPosition + 7, { width: colWidths.method });
        doc.text('Date Paid', dateColX, yPosition + 7, { width: colWidths.date });
        doc.text('Amount Received', amountColX, yPosition + 7, { width: colWidths.amount, align: 'right' });
        doc.restore();

        yPosition += 28;
      }

      // Alternating row backgrounds
      if (index % 2 === 0) {
        doc.save();
        doc.rect(50, yPosition - 4, 512, 20).fill('#F8FAFC');
        doc.restore();
      }

      // Row styling
      doc.save();
      doc.fillColor('#1E293B').font('Helvetica').fontSize(8.5);

      // Student name and Reg No
      doc.font('Helvetica-Bold').text(payment.studentName, studentColX + 5, yPosition + 1, { width: colWidths.student - 5, lineBreak: false });
      doc.font('Helvetica').fillColor('#64748B').fontSize(7.5).text(`Reg: ${payment.registrationNumber}`, studentColX + 5, yPosition + 10, { width: colWidths.student - 5 });

      // Class/Section
      const classSectionStr = `${payment.className} / ${payment.sectionName}`;
      doc.fillColor('#1E293B').fontSize(8.5).text(classSectionStr, classColX, yPosition + 4, { width: colWidths.class, lineBreak: false });

      // Method
      doc.text(payment.method.toUpperCase(), methodColX, yPosition + 4, { width: colWidths.method, lineBreak: false });

      // Date
      doc.text(payment.paidOn, dateColX, yPosition + 4, { width: colWidths.date, lineBreak: false });

      // Amount
      doc.font('Helvetica-Bold').fillColor('#16A34A').text(`Rs. ${payment.amount.toFixed(2)}`, amountColX, yPosition + 4, { width: colWidths.amount, align: 'right', lineBreak: false });

      doc.restore();

      // Divider line
      doc.moveTo(50, yPosition + 20).lineTo(562, yPosition + 20).strokeColor('#E2E8F0').lineWidth(0.5).stroke();
      yPosition += 24;
    });

    // Single unified check for Report Summary + Signature block (requires ~95pt height)
    const requiredFooterHeight = 95;
    if (yPosition + requiredFooterHeight > maxAllowedY) {
      doc.addPage();
      yPosition = 125;
    }

    doc.moveTo(50, yPosition).lineTo(562, yPosition).strokeColor('#E2E8F0').lineWidth(0.5).stroke();
    yPosition += 8;

    doc.save();
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#1E293B');
    doc.text('Report Summary:', studentColX + 5, yPosition);
    doc.font('Helvetica').text(`Total transactions logged: ${payments.length}`, studentColX + 5, yPosition + 12);
    doc.text(`Period Covered: ${monthNameStr} ${y}`, studentColX + 5, yPosition + 24);

    doc.font('Helvetica-Bold').text('Total Collected Amount:', dateColX - 30, yPosition + 10, { width: 150, align: 'right' });
    doc.fontSize(12).fillColor('#16A34A').text(`Rs. ${totalSum.toFixed(2)}`, amountColX - 20, yPosition + 8, { width: 120, align: 'right' });
    doc.restore();

    // Signatures (drawn directly in line as part of the unified footer block)
    const sigY = yPosition + 45;
    doc.save();
    doc.moveTo(380, sigY).lineTo(530, sigY).strokeColor('#64748B').lineWidth(0.5).stroke();
    doc.fillColor('#64748B').fontSize(7.5).font('Helvetica-Bold').text('Authorized Cashier / Accountant', 380, sigY + 5, { align: 'center', width: 150 });
    doc.restore();

    // Finalize page numbering
    addPageNumbers(doc, onPageAdded);

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
 * @desc    Export fee defaulters list as PDF
 * @route   GET /api/reports/fee-defaulters/export-pdf
 * @access  Private (Admin Only)
 */
const exportFeeDefaultersPDF = async (req, res, next) => {
  try {
    const { classId, sectionId } = req.query;

    const { defaulters, totalOutstanding } = await fetchDefaultersData(classId, sectionId);

    // Get class and section name for filter label if they exist
    let classLabel = 'All Classes';
    let sectionLabel = 'All Sections';

    if (classId) {
      const Class = require('../models/Class');
      const classDoc = await Class.findById(classId);
      if (classDoc) classLabel = classDoc.name;
    }
    if (sectionId) {
      const Section = require('../models/Section');
      const sectionDoc = await Section.findById(sectionId);
      if (sectionDoc) sectionLabel = sectionDoc.name;
    }

    const subtitleStr = classId 
      ? `Class: ${classLabel} ${sectionId ? `| Section: ${sectionLabel}` : ''}`
      : 'All Classes and Sections';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="fee-defaulters-report.pdf"');

    const doc = new PDFDocument({ 
      margins: { top: 125, bottom: 60, left: 50, right: 50 },
      bufferPages: true
    });
    doc.pipe(res);

    const title = 'Fee Defaulters Report';

    // Draw first page header/footer
    drawBrandedHeader(doc, title, subtitleStr);
    drawFooter(doc);

    // Register listener for subsequent pages
    const onPageAdded = () => {
      drawBrandedHeader(doc, title, subtitleStr);
      drawFooter(doc);
    };
    doc.on('pageAdded', onPageAdded);

    let currentY = 125;

    // Draw Summary Box
    doc.save();
    doc.rect(50, currentY, 512, 45).fillAndStroke('#FEF2F2', '#FCA5A5'); // Subtle red background and border
    doc.fillColor('#991B1B').font('Helvetica-Bold').fontSize(8.5);
    
    doc.text('Defaulters Count:', 65, currentY + 12);
    doc.font('Helvetica').fillColor('#1E293B').text(`${defaulters.length} Student(s)`, 150, currentY + 12);

    doc.font('Helvetica-Bold').fillColor('#991B1B').text('Filter Applied:', 65, currentY + 25);
    doc.font('Helvetica').fillColor('#1E293B').text(subtitleStr, 150, currentY + 25);

    doc.font('Helvetica-Bold').fillColor('#991B1B').text('Total Outstanding:', 330, currentY + 16);
    doc.fontSize(12).fillColor('#DC2626').text(`Rs. ${totalOutstanding.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 425, currentY + 14);
    doc.restore();

    currentY += 60;

    // Columns config
    const nameColX = 50;
    const classColX = 180;
    const contactColX = 270;
    const dueColX = 380;
    const paidColX = 440;
    const outstandingColX = 500;

    const colWidths = {
      name: 125,
      class: 85,
      contact: 105,
      due: 55,
      paid: 55,
      outstanding: 62
    };

    // Draw Table Header
    doc.save();
    doc.rect(50, currentY, 512, 22).fill('#00215E');
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8);
    
    doc.text('Student Details', nameColX + 5, currentY + 7, { width: colWidths.name - 5 });
    doc.text('Class/Section', classColX, currentY + 7, { width: colWidths.class });
    doc.text("Father's Details", contactColX, currentY + 7, { width: colWidths.contact });
    doc.text('Amt Due', dueColX, currentY + 7, { width: colWidths.due, align: 'right' });
    doc.text('Amt Paid', paidColX, currentY + 7, { width: colWidths.paid, align: 'right' });
    doc.text('Outstanding', outstandingColX, currentY + 7, { width: colWidths.outstanding, align: 'right' });
    doc.restore();

    let yPosition = currentY + 28;
    const maxAllowedY = 670; // Safe threshold well before bottom margin boundary (732pt)

    defaulters.forEach((row, index) => {
      // Safe manual page break check before drawing the row (26pt height)
      if (yPosition + 26 > maxAllowedY) {
        doc.addPage();
        yPosition = 125; // starts after top header margin

        // Draw Table Header again at top of new page
        doc.save();
        doc.rect(50, yPosition, 512, 22).fill('#00215E');
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8);
        doc.text('Student Details', nameColX + 5, yPosition + 7, { width: colWidths.name - 5 });
        doc.text('Class/Section', classColX, yPosition + 7, { width: colWidths.class });
        doc.text("Father's Details", contactColX, yPosition + 7, { width: colWidths.contact });
        doc.text('Amt Due', dueColX, yPosition + 7, { width: colWidths.due, align: 'right' });
        doc.text('Amt Paid', paidColX, yPosition + 7, { width: colWidths.paid, align: 'right' });
        doc.text('Outstanding', outstandingColX, yPosition + 7, { width: colWidths.outstanding, align: 'right' });
        doc.restore();

        yPosition += 28;
      }

      // Alternating row backgrounds
      if (index % 2 === 0) {
        doc.save();
        doc.rect(50, yPosition - 4, 512, 22).fill('#F8FAFC');
        doc.restore();
      }

      // Row styling
      doc.save();
      doc.fillColor('#1E293B').font('Helvetica').fontSize(8);

      // Student name and Reg No
      doc.font('Helvetica-Bold').text(row.fullName, nameColX + 5, yPosition, { width: colWidths.name - 5, lineBreak: false });
      doc.font('Helvetica').fillColor('#64748B').fontSize(7).text(`Reg: ${row.registrationNumber}`, nameColX + 5, yPosition + 10, { width: colWidths.name - 5 });

      // Class/Section
      const classSectionStr = `${row.classId?.name || 'N/A'} / ${row.sectionId?.name || 'N/A'}`;
      doc.fillColor('#1E293B').fontSize(8).text(classSectionStr, classColX, yPosition + 4, { width: colWidths.class, lineBreak: false });

      // Father details
      doc.text(row.fatherName || 'N/A', contactColX, yPosition, { width: colWidths.contact, lineBreak: false });
      doc.fillColor('#64748B').fontSize(7.5).text(row.fatherContact || 'N/A', contactColX, yPosition + 10, { width: colWidths.contact });

      // Financials
      doc.fillColor('#1E293B').fontSize(8).text(row.amountDue.toFixed(2), dueColX, yPosition + 4, { width: colWidths.due, align: 'right', lineBreak: false });
      doc.text(row.amountPaid.toFixed(2), paidColX, yPosition + 4, { width: colWidths.paid, align: 'right', lineBreak: false });
      doc.font('Helvetica-Bold').fillColor('#DC2626').text(row.outstandingAmount.toFixed(2), outstandingColX, yPosition + 4, { width: colWidths.outstanding, align: 'right', lineBreak: false });

      doc.restore();

      // Divider line
      doc.moveTo(50, yPosition + 22).lineTo(562, yPosition + 22).strokeColor('#E2E8F0').lineWidth(0.5).stroke();
      yPosition += 26;
    });

    // Single unified check for Report Summary + Signature block (requires ~95pt height)
    const requiredFooterHeight = 95;
    if (yPosition + requiredFooterHeight > maxAllowedY) {
      doc.addPage();
      yPosition = 125;
    }

    doc.moveTo(50, yPosition).lineTo(562, yPosition).strokeColor('#E2E8F0').lineWidth(0.5).stroke();
    yPosition += 8;

    doc.save();
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#1E293B');
    doc.text('Report Summary:', nameColX + 5, yPosition);
    doc.font('Helvetica').text(`Total defaulters listed: ${defaulters.length}`, nameColX + 5, yPosition + 12);
    doc.text('Status: Pending Payment', nameColX + 5, yPosition + 24);

    doc.font('Helvetica-Bold').text('Total Defaulter Outstanding:', dueColX - 30, yPosition + 10, { width: 150, align: 'right' });
    doc.fontSize(11).fillColor('#DC2626').text(`Rs. ${totalOutstanding.toFixed(2)}`, outstandingColX - 20, yPosition + 8, { width: 80, align: 'right' });
    doc.restore();

    // Signatures (drawn directly in line as part of the unified footer block)
    const sigY = yPosition + 45;
    doc.save();
    doc.moveTo(380, sigY).lineTo(530, sigY).strokeColor('#64748B').lineWidth(0.5).stroke();
    doc.fillColor('#64748B').fontSize(7.5).font('Helvetica-Bold').text('Accounts Office / Principal', 380, sigY + 5, { align: 'center', width: 150 });
    doc.restore();

    // Finalize page numbering
    addPageNumbers(doc, onPageAdded);

    doc.end();
  } catch (error) {
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
  exportFeeDefaultersPDF,
  getClassWiseAttendanceSummary
};
