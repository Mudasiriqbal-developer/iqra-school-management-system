const mongoose = require('mongoose');
const FeeRecord = require('../models/FeeRecord');
const Student = require('../models/Student');
const PDFDocument = require('pdfkit');

/**
 * Helper: Given a studentId, get or create the current month's FeeRecord
 */
const getOrCreateCurrentMonthRecord = async (studentId) => {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  let record = await FeeRecord.findOne({ studentId, month });
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
      payments: []
    });
  }
  return record;
};

/**
 * @desc    Get or create current month's fee record for a student
 * @route   GET /api/fee-records/student/:studentId/current
 * @access  Private (Admin Only)
 */
const getStudentFeeRecord = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const record = await getOrCreateCurrentMonthRecord(studentId);
    return res.status(200).json({
      success: true,
      data: record,
      message: 'Current month fee record retrieved successfully'
    });
  } catch (error) {
    if (error.message === 'Student not found') {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    next(error);
  }
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

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    // Header
    doc.font('Helvetica-Bold').fontSize(20).text('IHASS - Iqra Hadiqa Tul Atfal School', { align: 'center' });
    doc.fontSize(14).text('Fee Payment Receipt', { align: 'center' });
    doc.moveDown(1);

    // Student Info Box
    const startY = doc.y;
    doc.font('Helvetica-Bold').fontSize(11).text('Student Information', 50, startY);
    doc.moveTo(50, startY + 15).lineTo(562, startY + 15).stroke();
    doc.moveDown(0.8);

    const infoY = doc.y;
    doc.font('Helvetica-Bold').text('Name:', 50, infoY);
    doc.font('Helvetica').text(student.fullName, 100, infoY);

    doc.font('Helvetica-Bold').text('Reg No:', 230, infoY);
    doc.font('Helvetica').text(student.registrationNumber, 280, infoY);

    doc.font('Helvetica-Bold').text("Father's Name:", 390, infoY);
    doc.font('Helvetica').text(student.fatherName, 480, infoY);

    doc.moveDown(2);

    // Table headers
    const monthColX = 50;
    const dueColX = 130;
    const paidColX = 210;
    const statusColX = 290;
    const paymentsColX = 370;

    const colWidths = {
      month: 75,
      due: 75,
      paid: 75,
      status: 75,
      payments: 192
    };

    let yPosition = doc.y;
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('Month', monthColX, yPosition, { width: colWidths.month });
    doc.text('Amount Due', dueColX, yPosition, { width: colWidths.due, align: 'right' });
    doc.text('Amount Paid', paidColX, yPosition, { width: colWidths.paid, align: 'right' });
    doc.text('Status', statusColX, yPosition, { width: colWidths.status, align: 'center' });
    doc.text('Payment Details (Date & Amount)', paymentsColX, yPosition, { width: colWidths.payments });

    doc.moveTo(50, yPosition + 15).lineTo(562, yPosition + 15).stroke();
    yPosition += 25;

    let totalBilled = 0;
    let totalPaid = 0;

    doc.font('Helvetica');
    records.forEach(r => {
      totalBilled += r.amountDue;
      totalPaid += r.amountPaid;

      const numPayments = r.payments.length;
      const isAdmission = r.type === 'admission';
      const labelLines = isAdmission ? 3 : 1;
      const rowHeight = Math.max(labelLines, numPayments) * 15 + 5;

      if (yPosition + rowHeight > 700) {
        doc.addPage();
        yPosition = 50;

        doc.font('Helvetica-Bold').fontSize(10);
        doc.text('Month', monthColX, yPosition, { width: colWidths.month });
        doc.text('Amount Due', dueColX, yPosition, { width: colWidths.due, align: 'right' });
        doc.text('Amount Paid', paidColX, yPosition, { width: colWidths.paid, align: 'right' });
        doc.text('Status', statusColX, yPosition, { width: colWidths.status, align: 'center' });
        doc.text('Payment Details (Date & Amount)', paymentsColX, yPosition, { width: colWidths.payments });
        doc.moveTo(50, yPosition + 15).lineTo(562, yPosition + 15).stroke();
        doc.font('Helvetica');
        yPosition += 25;
      }

      const monthLabel = isAdmission ? 'Admission Fee & Books (Registration)' : r.month;
      doc.text(monthLabel, monthColX, yPosition, { width: colWidths.month });
      doc.text(r.amountDue.toFixed(2), dueColX, yPosition, { width: colWidths.due, align: 'right' });
      doc.text(r.amountPaid.toFixed(2), paidColX, yPosition, { width: colWidths.paid, align: 'right' });
      doc.text(r.status.toUpperCase(), statusColX, yPosition, { width: colWidths.status, align: 'center' });

      if (numPayments === 0) {
        doc.text('-', paymentsColX, yPosition, { width: colWidths.payments });
        yPosition += 20;
      } else {
        r.payments.forEach((p, idx) => {
          const dateStr = new Date(p.paidOn).toISOString().split('T')[0];
          const pText = `${dateStr}: Rs. ${p.amount} (${p.method})`;
          doc.text(pText, paymentsColX, yPosition + (idx * 15), { width: colWidths.payments });
        });
        yPosition += numPayments * 15 + 5;
      }

      doc.moveTo(50, yPosition).lineTo(562, yPosition).strokeColor('#cccccc').lineWidth(0.5).stroke().strokeColor('#000000').lineWidth(1);
      yPosition += 5;
    });

    if (yPosition + 50 > 720) {
      doc.addPage();
      yPosition = 50;
    }

    yPosition += 10;
    doc.moveTo(50, yPosition).lineTo(562, yPosition).stroke();
    yPosition += 10;

    doc.font('Helvetica-Bold').fontSize(11);
    doc.text('Total Billed:', monthColX, yPosition);
    doc.text(`Rs. ${totalBilled.toFixed(2)}`, monthColX + 70, yPosition);

    doc.text('Total Paid:', paidColX, yPosition);
    doc.text(`Rs. ${totalPaid.toFixed(2)}`, paidColX + 65, yPosition);

    const outstanding = totalBilled - totalPaid;
    doc.text('Outstanding:', paymentsColX, yPosition);
    doc.text(`Rs. ${outstanding.toFixed(2)}`, paymentsColX + 75, yPosition);

    const nowStr = new Date().toLocaleString();
    doc.fontSize(8).font('Helvetica-Oblique').text(`Receipt generated on ${nowStr}`, 50, 740, { align: 'center' });

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
  getStudentFeeRecord,
  getStudentLedger,
  recordPayment,
  generateReceiptPDF,
  getCurrentMonthFeeList
};
