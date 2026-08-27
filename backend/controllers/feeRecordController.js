const mongoose = require('mongoose');
const FeeRecord = require('../models/FeeRecord');
const Student = require('../models/Student');
const Settings = require('../models/Settings');
const PDFDocument = require('pdfkit');
const { drawBrandedHeader, drawFooter, addPageNumbers } = require('../utils/pdfHelper');
const studentFeeService = require('../services/studentFeeService');

const { getOrCreateCurrentMonthRecord } = studentFeeService;

/**
 * @desc    Get all fee records for a student (ledger)
 * @route   GET /api/fee-records/student/:studentId
 * @access  Private (Admin Only)
 */
const getStudentLedger = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const data = await studentFeeService.getStudentLedgerData(studentId);

    return res.status(200).json({
      success: true,
      data,
      message: 'Student fee ledger retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Record a payment on a specific month's fee record
 * @route   POST /api/fee-records/:id/pay
 * @access  Private (Admin Only)
 */
const recordPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type, amount, method } = req.body;

    const record = await FeeRecord.findById(id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Fee record not found'
      });
    }

    if (record.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'This month is already fully paid'
      });
    }

    let paymentAmount = 0;
    const remaining = record.amountDue - record.amountPaid;

    if (type === 'full') {
      paymentAmount = remaining;
    } else if (type === 'half') {
      paymentAmount = record.amountDue * 0.5;
    } else if (type === 'custom') {
      if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Payment amount must be a positive number for custom type'
        });
      }
      paymentAmount = amount;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Payment type must be full, half, or custom'
      });
    }

    let message = 'Payment recorded successfully';
    if (record.amountPaid + paymentAmount > record.amountDue) {
      paymentAmount = remaining;
      message = `Payment capped at remaining balance of Rs. ${remaining}`;
    }

    record.payments.push({
      amount: paymentAmount,
      type,
      method: method || 'cash',
      paidOn: new Date()
    });

    record.amountPaid += paymentAmount;

    // Recalculate status
    if (record.amountPaid >= record.amountDue) {
      record.status = 'paid';
    } else if (record.amountPaid > 0) {
      record.status = 'partial';
    } else {
      record.status = 'pending';
    }

    await record.save();

    return res.status(200).json({
      success: true,
      data: record,
      message
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate PDF receipt for a student's full payment ledger
 * @route   GET /api/fee-records/student/:studentId/receipt-pdf
 * @access  Private (Admin Only)
 */
const generateReceiptPDF = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const records = await FeeRecord.find({ studentId }).sort({ month: 1 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${student.registrationNumber}-fee-receipt.pdf"`);

    const doc = new PDFDocument({ 
      margins: { top: 125, bottom: 60, left: 50, right: 50 },
      bufferPages: true
    });
    doc.pipe(res);

    const settings = await Settings.findOne({ schoolId: 'default' });

    const title = 'Fee Payment Receipt';
    const subtitle = `Reg No: ${student.registrationNumber}`;

    // Draw first page header/footer
    drawBrandedHeader(doc, title, subtitle, settings);
    drawFooter(doc);

    // Subsequent page header/footer
    const onPageAdded = () => {
      drawBrandedHeader(doc, title, subtitle, settings);
      drawFooter(doc);
    };
    doc.on('pageAdded', onPageAdded);

    let currentY = 125;

    // Student Info Box
    doc.save();
    doc.rect(50, currentY, 512, 18).fill('#00215E');
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.5).text('STUDENT INFORMATION', 60, currentY + 5);
    doc.restore();

    currentY += 18;
    doc.save();
    doc.rect(50, currentY, 512, 45).fillAndStroke('#F8FAFC', '#E2E8F0');
    doc.fillColor('#00215E').font('Helvetica-Bold').fontSize(8);
    
    doc.text('Name:', 65, currentY + 12);
    doc.fillColor('#1E293B').font('Helvetica').fontSize(8.5).text(student.fullName, 110, currentY + 11);

    doc.fillColor('#00215E').font('Helvetica-Bold').fontSize(8).text('Registration No:', 230, currentY + 12);
    doc.fillColor('#1E293B').font('Helvetica').fontSize(8.5).text(student.registrationNumber, 310, currentY + 11);

    doc.fillColor('#00215E').font('Helvetica-Bold').fontSize(8).text("Father's Name:", 390, currentY + 12);
    doc.fillColor('#1E293B').font('Helvetica').fontSize(8.5).text(student.fatherName, 465, currentY + 11);
    doc.restore();
    
    currentY += 60;

    // Table headers config
    const monthColX = 50;
    const dueColX = 150;
    const paidColX = 220;
    const statusColX = 290;
    const paymentsColX = 360;

    const colWidths = {
      month: 95,
      due: 65,
      paid: 65,
      status: 65,
      payments: 202
    };

    // Draw table header
    doc.save();
    doc.rect(50, currentY, 512, 22).fill('#00215E');
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.5);
    doc.text('Month / Type', monthColX + 5, currentY + 7, { width: colWidths.month - 5 });
    doc.text('Amt Due', dueColX, currentY + 7, { width: colWidths.due, align: 'right' });
    doc.text('Amt Paid', paidColX, currentY + 7, { width: colWidths.paid, align: 'right' });
    doc.text('Status', statusColX, currentY + 7, { width: colWidths.status, align: 'center' });
    doc.text('Payment Details (Date & Method)', paymentsColX, currentY + 7, { width: colWidths.payments });
    doc.restore();

    let yPosition = currentY + 28;

    let totalBilled = 0;
    let totalPaid = 0;

    records.forEach((r, index) => {
      totalBilled += r.amountDue;
      totalPaid += r.amountPaid;

      const numPayments = r.payments.length;
      const isAdmission = r.type === 'admission';
      const rowHeight = Math.max(1, numPayments) * 16 + 8;

      // Check page overflow
      if (yPosition + rowHeight > 690) {
        doc.addPage();
        yPosition = 125;

        // Draw table header again
        doc.save();
        doc.rect(50, yPosition, 512, 22).fill('#00215E');
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.5);
        doc.text('Month / Type', monthColX + 5, yPosition + 7, { width: colWidths.month - 5 });
        doc.text('Amt Due', dueColX, yPosition + 7, { width: colWidths.due, align: 'right' });
        doc.text('Amt Paid', paidColX, yPosition + 7, { width: colWidths.paid, align: 'right' });
        doc.text('Status', statusColX, yPosition + 7, { width: colWidths.status, align: 'center' });
        doc.text('Payment Details (Date & Method)', paymentsColX, yPosition + 7, { width: colWidths.payments });
        doc.restore();
        yPosition += 28;
      }

      // Alternating row background
      if (index % 2 === 0) {
        doc.save();
        doc.rect(50, yPosition - 4, 512, rowHeight).fill('#F8FAFC');
        doc.restore();
      }

      // Print values
      doc.save();
      doc.fillColor('#1E293B').font('Helvetica').fontSize(8);
      let monthLabel = r.month;
      if (isAdmission) {
        monthLabel = 'Admission & Books';
      } else if (r.type === 'one_time') {
        monthLabel = r.title ? r.title : 'One-Time Charge';
      }
      doc.font(isAdmission || r.type === 'one_time' ? 'Helvetica-Bold' : 'Helvetica').text(monthLabel, monthColX + 5, yPosition + 4, { width: colWidths.month - 5 });
      doc.text(r.amountDue.toFixed(2), dueColX, yPosition + 4, { width: colWidths.due, align: 'right' });
      doc.text(r.amountPaid.toFixed(2), paidColX, yPosition + 4, { width: colWidths.paid, align: 'right' });

      // Status Badge Color Simulation
      let statusColor = '#16A34A'; // green
      if (r.status === 'pending') statusColor = '#D97706'; // amber
      if (r.status === 'unpaid') statusColor = '#EF4444'; // red
      doc.font('Helvetica-Bold').fillColor(statusColor).text(r.status.toUpperCase(), statusColX, yPosition + 4, { width: colWidths.status, align: 'center' });

      doc.fillColor('#1E293B').font('Helvetica');
      if (numPayments === 0) {
        doc.text('-', paymentsColX, yPosition + 4, { width: colWidths.payments });
      } else {
        r.payments.forEach((p, idx) => {
          const dateStr = new Date(p.paidOn).toISOString().split('T')[0];
          const pText = `${dateStr}: Rs. ${p.amount} (${p.method.toUpperCase()})`;
          doc.text(pText, paymentsColX, yPosition + 4 + (idx * 16), { width: colWidths.payments });
        });
      }
      doc.restore();

      // Divider line
      doc.moveTo(50, yPosition + rowHeight - 4).lineTo(562, yPosition + rowHeight - 4).strokeColor('#E2E8F0').lineWidth(0.5).stroke();
      yPosition += rowHeight;
    });

    // Summary box check
    if (yPosition + 60 > 710) {
      doc.addPage();
      yPosition = 125;
    }
    
    yPosition += 10;
    doc.save();
    doc.rect(50, yPosition, 512, 45).fillAndStroke('#F8FAFC', '#E2E8F0');
    doc.fillColor('#00215E').font('Helvetica-Bold').fontSize(8.5);
    
    doc.text('Total Billed Amount:', 65, yPosition + 12);
    doc.fillColor('#1E293B').font('Helvetica').text(`Rs. ${totalBilled.toFixed(2)}`, 165, yPosition + 12);

    doc.fillColor('#00215E').font('Helvetica-Bold').text('Total Paid Amount:', 65, yPosition + 26);
    doc.fillColor('#1E293B').font('Helvetica').text(`Rs. ${totalPaid.toFixed(2)}`, 165, yPosition + 26);

    const outstanding = totalBilled - totalPaid;
    doc.fillColor('#00215E').font('Helvetica-Bold').text('Net Outstanding Dues:', 310, yPosition + 18);
    doc.fontSize(11).fillColor(outstanding > 0 ? '#DC2626' : '#16A34A').text(`Rs. ${outstanding.toFixed(2)}`, 415, yPosition + 16, { width: 130, align: 'right' });
    doc.restore();

    yPosition += 55;

    // Authorized Signature
    if (yPosition + 45 > 715) {
      doc.addPage();
      yPosition = 125;
    }
    doc.save();
    doc.moveTo(380, yPosition + 35).lineTo(530, yPosition + 35).strokeColor('#64748B').lineWidth(0.5).stroke();
    doc.fillColor('#64748B').fontSize(7.5).font('Helvetica-Bold').text('Accounts Registrar Signature', 380, yPosition + 40, { align: 'center', width: 150 });
    doc.restore();

    // Finalize page numbering
    addPageNumbers(doc, onPageAdded);

    doc.end();
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get bulk listing of current month's fee records for all active students with filters/pagination
 * @route   GET /api/fee-records/current-month
 * @access  Private (Admin Only)
 */
const getCurrentMonthFeeList = async (req, res, next) => {
  try {
    const { classId, sectionId, status, search, page = 1, limit = 10 } = req.query;

    const pageVal = parseInt(page, 10);
    const limitVal = parseInt(limit, 10);
    const skipVal = (pageVal - 1) * limitVal;

    const filter = { status: 'active' };

    if (classId) {
      filter.classId = classId;
    }
    if (sectionId) {
      filter.sectionId = sectionId;
    }
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { registrationNumber: { $regex: search, $options: 'i' } },
        { fatherName: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Student.countDocuments(filter);
    const students = await Student.find(filter)
      .populate('classId', 'name')
      .populate('sectionId', 'name')
      .skip(skipVal)
      .limit(limitVal);

    const resultList = [];
    for (const student of students) {
      const feeRecord = await getOrCreateCurrentMonthRecord(student._id);
      resultList.push({
        studentId: student._id,
        fullName: student.fullName,
        registrationNumber: student.registrationNumber,
        classId: student.classId ? { name: student.classId.name } : null,
        sectionId: student.sectionId ? { name: student.sectionId.name } : null,
        feeRecord: {
          _id: feeRecord._id,
          month: feeRecord.month,
          amountDue: feeRecord.amountDue,
          amountPaid: feeRecord.amountPaid,
          status: feeRecord.status
        }
      });
    }

    let finalStudents = resultList;
    if (status) {
      finalStudents = resultList.filter(item => item.feeRecord.status === status);
    }

    const pages = Math.ceil(total / limitVal);

    return res.status(200).json({
      success: true,
      data: {
        students: finalStudents,
        total,
        page: pageVal,
        pages
      },
      message: 'Current month fee records retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Issue a one-time charge to an entire class, section, or individual students
 * @route   POST /api/fee-records/issue-charge
 * @access  Private (Admin Only)
 */
const issueOneTimeCharge = async (req, res, next) => {
  try {
    const { title, amount, dueDate, targetType, classId, sectionId, studentIds } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Charge title/label is required'
      });
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid positive charge amount is required'
      });
    }

    let targetStudentIds = [];

    if (targetType === 'individual') {
      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one student must be selected for individual charge issuance'
        });
      }
      // Verify active students
      const foundStudents = await Student.find({
        _id: { $in: studentIds },
        status: 'active'
      }).select('_id');
      targetStudentIds = foundStudents.map(s => s._id);
    } else {
      // Default: class/section target
      if (!classId) {
        return res.status(400).json({
          success: false,
          message: 'Class is required when issuing charge to a class'
        });
      }

      const filter = { classId, status: 'active' };
      if (sectionId && sectionId.trim() !== '') {
        filter.sectionId = sectionId;
      }

      const students = await Student.find(filter).select('_id');
      targetStudentIds = students.map(s => s._id);
    }

    if (targetStudentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active students found matching the selected target criteria'
      });
    }

    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const parsedDueDate = dueDate ? new Date(dueDate) : null;

    const recordsToInsert = targetStudentIds.map(studentId => ({
      studentId,
      month: monthStr,
      title: title.trim(),
      amountDue: numericAmount,
      amountPaid: 0,
      status: 'pending',
      type: 'one_time',
      dueDate: parsedDueDate,
      payments: []
    }));

    const createdRecords = await FeeRecord.insertMany(recordsToInsert, { ordered: false });

    return res.status(201).json({
      success: true,
      data: {
        issuedCount: createdRecords.length,
        title: title.trim(),
        amount: numericAmount,
        dueDate: parsedDueDate
      },
      message: `Successfully issued charge "${title.trim()}" (Rs. ${numericAmount}) to ${createdRecords.length} student(s)`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get report / listing of one-time charges with aggregation & filters
 * @route   GET /api/fee-records/one-time-charges
 * @access  Private (Admin Only)
 */
const getOneTimeChargesReport = async (req, res, next) => {
  try {
    const { classId, sectionId, status, search, title, page = 1, limit = 15 } = req.query;

    const pageVal = parseInt(page, 10) || 1;
    const limitVal = parseInt(limit, 10) || 15;
    const skipVal = (pageVal - 1) * limitVal;

    const filter = { type: 'one_time' };

    if (status && status !== 'all') {
      filter.status = status;
    }
    if (title && title.trim() !== '') {
      filter.title = { $regex: title.trim(), $options: 'i' };
    }

    // Student sub-filters
    const studentFilter = {};
    if (classId && classId.trim() !== '') {
      studentFilter.classId = classId;
    }
    if (sectionId && sectionId.trim() !== '') {
      studentFilter.sectionId = sectionId;
    }
    if (search && search.trim() !== '') {
      studentFilter.$or = [
        { fullName: { $regex: search.trim(), $options: 'i' } },
        { registrationNumber: { $regex: search.trim(), $options: 'i' } },
        { fatherName: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    // If filtering by student fields, resolve student IDs first
    if (Object.keys(studentFilter).length > 0) {
      const matchingStudents = await Student.find(studentFilter).select('_id');
      const matchingIds = matchingStudents.map(s => s._id);
      filter.studentId = { $in: matchingIds };
    }

    // Overall KPI metrics for one-time charges matching filters
    const summaryAgg = await FeeRecord.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalBilled: { $sum: '$amountDue' },
          totalCollected: { $sum: '$amountPaid' },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          partialCount: {
            $sum: { $cond: [{ $eq: ['$status', 'partial'] }, 1, 0] }
          },
          paidCount: {
            $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] }
          },
          totalCount: { $sum: 1 }
        }
      }
    ]);

    const summary = summaryAgg[0] || {
      totalBilled: 0,
      totalCollected: 0,
      pendingCount: 0,
      partialCount: 0,
      paidCount: 0,
      totalCount: 0
    };
    summary.totalOutstanding = summary.totalBilled - summary.totalCollected;

    // Paginated list
    const total = await FeeRecord.countDocuments(filter);
    const records = await FeeRecord.find(filter)
      .populate({
        path: 'studentId',
        select: 'fullName registrationNumber fatherName fatherContact status classId sectionId',
        populate: [
          { path: 'classId', select: 'name' },
          { path: 'sectionId', select: 'name' }
        ]
      })
      .sort({ createdAt: -1 })
      .skip(skipVal)
      .limit(limitVal);

    const pages = Math.ceil(total / limitVal);

    return res.status(200).json({
      success: true,
      data: {
        records,
        summary,
        total,
        page: pageVal,
        pages
      },
      message: 'One-time charges report retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Edit a one-time charge (Only allowed if amountPaid === 0)
 * @route   PUT /api/fee-records/:id/one-time
 * @access  Private (Admin Only)
 */
const updateOneTimeCharge = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, amountDue, dueDate } = req.body;

    const record = await FeeRecord.findById(id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Fee record not found'
      });
    }

    if (record.type !== 'one_time') {
      return res.status(400).json({
        success: false,
        message: 'Only one-time charges can be edited through this action'
      });
    }

    // AUDIT RULE: Once payment is recorded, charge cannot be modified
    if (record.amountPaid > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit this charge because payment has already been recorded against it. This preserves the financial audit trail.'
      });
    }

    if (title && title.trim()) {
      record.title = title.trim();
    }
    if (amountDue !== undefined) {
      const numAmount = Number(amountDue);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid positive amount is required'
        });
      }
      record.amountDue = numAmount;
    }
    if (dueDate !== undefined) {
      record.dueDate = dueDate ? new Date(dueDate) : null;
    }

    await record.save();

    return res.status(200).json({
      success: true,
      data: record,
      message: 'One-time charge updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete/Void a one-time charge (Only allowed if amountPaid === 0)
 * @route   DELETE /api/fee-records/:id/one-time
 * @access  Private (Admin Only)
 */
const deleteOneTimeCharge = async (req, res, next) => {
  try {
    const { id } = req.params;

    const record = await FeeRecord.findById(id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Fee record not found'
      });
    }

    if (record.type !== 'one_time') {
      return res.status(400).json({
        success: false,
        message: 'Only one-time charges can be deleted through this action'
      });
    }

    // AUDIT RULE: Once payment is recorded, charge cannot be deleted
    if (record.amountPaid > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete this charge because payment has already been recorded against it. This preserves the financial audit trail.'
      });
    }

    await FeeRecord.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      data: null,
      message: 'One-time charge deleted/voided successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOrCreateCurrentMonthRecord,
  getStudentLedger,
  recordPayment,
  generateReceiptPDF,
  getCurrentMonthFeeList,
  issueOneTimeCharge,
  getOneTimeChargesReport,
  updateOneTimeCharge,
  deleteOneTimeCharge
};
