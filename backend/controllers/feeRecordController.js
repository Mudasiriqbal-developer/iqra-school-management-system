const mongoose = require('mongoose');
const FeeRecord = require('../models/FeeRecord');
const Student = require('../models/Student');
const PDFDocument = require('pdfkit');
const { drawBrandedHeader, drawFooter, addPageNumbers } = require('../utils/pdfHelper');


/**
 * Helper: Given a studentId, get or create the current month's FeeRecord
 */
const getOrCreateCurrentMonthRecord = async (studentId) => {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  let record = await FeeRecord.findOne({ studentId, month, type: 'monthly' });
  if (!record) {
    const student = await Student.findById(studentId);
    if (!student) {
      throw new Error('Student not found');
    }
    record = await FeeRecord.create({
      studentId,
      month,
      amountDue: student.monthlyFeeAmount || 0,
      amountPaid: 0,
      status: 'pending',
      payments: [],
      type: 'monthly'
    });
  }
  return record;
};

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

    const records = await FeeRecord.find({ studentId }).sort({ month: -1 });

    let totalBilled = 0;
    let totalPaid = 0;
    records.forEach(r => {
      totalBilled += r.amountDue;
      totalPaid += r.amountPaid;
    });

    return res.status(200).json({
      success: true,
      data: {
        records,
        summary: {
          totalBilled,
          totalPaid,
          totalOutstanding: totalBilled - totalPaid
        }
      },
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

    const title = 'Fee Payment Receipt';
    const subtitle = `Reg No: ${student.registrationNumber}`;

    // Draw first page header/footer
    drawBrandedHeader(doc, title, subtitle);
    drawFooter(doc);

    // Subsequent page header/footer
    const onPageAdded = () => {
      drawBrandedHeader(doc, title, subtitle);
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
      const monthLabel = isAdmission ? 'Admission & Books' : r.month;
      doc.font(isAdmission ? 'Helvetica-Bold' : 'Helvetica').text(monthLabel, monthColX + 5, yPosition + 4, { width: colWidths.month - 5 });
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

module.exports = {
  getOrCreateCurrentMonthRecord,
  getStudentLedger,
  recordPayment,
  generateReceiptPDF,
  getCurrentMonthFeeList
};
