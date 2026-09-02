const mongoose = require('mongoose');
const BookFee = require('../models/BookFee');
const Student = require('../models/Student');
const Class = require('../models/Class');
const Section = require('../models/Section');
const Settings = require('../models/Settings');
const Counter = require('../models/Counter');
const PDFDocument = require('pdfkit');
const { drawBrandedHeader, drawFooter, addPageNumbers } = require('../utils/pdfHelper');

/**
 * @desc    Get summary statistics for books management
 * @route   GET /api/books/summary
 * @access  Private (Admin Only)
 */
const getBookSummary = async (req, res, next) => {
  try {
    const stats = await BookFee.aggregate([
      {
        $group: {
          _id: null,
          totalBilled: { $sum: '$amount' },
          totalCollected: { $sum: '$amountPaid' },
          totalOutstanding: {
            $sum: { $subtract: ['$amount', '$amountPaid'] }
          },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, 1, 0] }
          },
          partialCount: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'partial'] }, 1, 0] }
          },
          paidCount: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] }
          },
          totalCount: { $sum: 1 }
        }
      }
    ]);

    const summary = stats[0] || {
      totalBilled: 0,
      totalCollected: 0,
      totalOutstanding: 0,
      pendingCount: 0,
      partialCount: 0,
      paidCount: 0,
      totalCount: 0
    };

    return res.status(200).json({
      success: true,
      data: summary,
      message: 'Book summary statistics retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get paginated roster of student book dues and payments
 * @route   GET /api/books/dues
 * @access  Private (Admin Only)
 */
const getBookDues = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      classId,
      sectionId,
      status,
      search,
      academicYear
    } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Filter construction
    const filter = {};

    if (status && status !== 'all') {
      filter.paymentStatus = status;
    }

    if (classId && classId !== '') {
      filter.classId = classId;
    }

    if (academicYear && academicYear !== '') {
      filter.academicYear = academicYear;
    }

    // Student search / Section filter
    if ((search && search.trim() !== '') || (sectionId && sectionId !== '')) {
      const studentQuery = {};
      if (search && search.trim() !== '') {
        studentQuery.$or = [
          { fullName: { $regex: search.trim(), $options: 'i' } },
          { registrationNumber: { $regex: search.trim(), $options: 'i' } }
        ];
      }
      if (sectionId && sectionId !== '') {
        studentQuery.sectionId = sectionId;
      }
      if (classId && classId !== '') {
        studentQuery.classId = classId;
      }

      const matchingStudents = await Student.find(studentQuery).select('_id');
      const studentIds = matchingStudents.map(s => s._id);
      filter.student = { $in: studentIds };
    }

    const total = await BookFee.countDocuments(filter);
    const records = await BookFee.find(filter)
      .populate({
        path: 'student',
        select: 'fullName registrationNumber classId sectionId fatherName fatherContact photoUrl',
        populate: [
          { path: 'classId', select: 'name' },
          { path: 'sectionId', select: 'name' }
        ]
      })
      .populate('classId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const pages = Math.ceil(total / limitNum) || 1;

    return res.status(200).json({
      success: true,
      data: {
        records,
        page: pageNum,
        pages,
        total
      },
      message: 'Book dues list retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Record a single student book fee payment with idempotency protection
 * @route   POST /api/books/:id/pay
 * @access  Private (Admin Only)
 */
const recordBookPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, method, type, note, idempotencyKey } = req.body;

    if (!idempotencyKey) {
      return res.status(400).json({
        success: false,
        message: 'Idempotency key is required'
      });
    }

    const existing = await BookFee.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Book fee record not found'
      });
    }

    // Check if this idempotency key has already been recorded
    const existingPayment = existing.payments.find(p => p.idempotencyKey === idempotencyKey);
    if (existingPayment) {
      const populated = await BookFee.findById(existing._id).populate({
        path: 'student',
        select: 'fullName registrationNumber classId sectionId fatherName',
        populate: [
          { path: 'classId', select: 'name' },
          { path: 'sectionId', select: 'name' }
        ]
      });
      return res.status(200).json({
        success: true,
        data: populated,
        receiptNumber: existingPayment.receiptNumber,
        message: 'Payment already processed (idempotent response)'
      });
    }

    if (existing.paymentStatus === 'paid' || (existing.amountPaid >= existing.amount && existing.amount > 0)) {
      return res.status(400).json({
        success: false,
        message: 'This book fee is already fully paid'
      });
    }

    const remaining = existing.amount - (existing.amountPaid || 0);
    let paymentAmount = 0;

    if (type === 'full') {
      paymentAmount = remaining;
    } else if (type === 'custom') {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Payment amount must be a positive number'
        });
      }
      if (numAmount > remaining) {
        return res.status(400).json({
          success: false,
          message: `Payment amount (${numAmount}) exceeds remaining balance (${remaining})`
        });
      }
      paymentAmount = numAmount;
    } else {
      paymentAmount = remaining;
    }

    // Generate sequential receipt number
    const counter = await Counter.findOneAndUpdate(
      { id: 'book_receipt' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const receiptNumber = `BK-${String(counter.seq).padStart(6, '0')}`;

    const newAmountPaid = (existing.amountPaid || 0) + paymentAmount;
    const isPaid = newAmountPaid >= existing.amount;
    const paymentStatus = isPaid ? 'paid' : 'partial';

    // Single atomic findOneAndUpdate checking idempotencyKey uniqueness in DB operation
    const updatedRecord = await BookFee.findOneAndUpdate(
      {
        _id: id,
        'payments.idempotencyKey': { $ne: idempotencyKey }
      },
      {
        $inc: { amountPaid: paymentAmount },
        $set: {
          paymentStatus,
          paid: isPaid,
          ...(isPaid ? { paidAt: new Date() } : {})
        },
        $push: {
          payments: {
            idempotencyKey,
            receiptNumber,
            amount: paymentAmount,
            method: method || 'cash',
            paidOn: new Date(),
            recordedBy: req.user?.id,
            note: note || undefined
          }
        }
      },
      { new: true }
    ).populate({
      path: 'student',
      select: 'fullName registrationNumber classId sectionId fatherName',
      populate: [
        { path: 'classId', select: 'name' },
        { path: 'sectionId', select: 'name' }
      ]
    });

    // If update returned null, duplicate key was detected concurrently
    if (!updatedRecord) {
      const currentRecord = await BookFee.findById(id).populate({
        path: 'student',
        select: 'fullName registrationNumber classId sectionId fatherName',
        populate: [
          { path: 'classId', select: 'name' },
          { path: 'sectionId', select: 'name' }
        ]
      });

      const matchedPayment = currentRecord?.payments?.find(p => p.idempotencyKey === idempotencyKey);
      if (matchedPayment) {
        return res.status(200).json({
          success: true,
          data: currentRecord,
          receiptNumber: matchedPayment.receiptNumber,
          message: 'Payment already processed (idempotent response)'
        });
      }

      return res.status(409).json({
        success: false,
        message: 'Payment conflict or state has changed. Please refresh and try again.'
      });
    }

    return res.status(200).json({
      success: true,
      data: updatedRecord,
      receiptNumber,
      message: 'Book fee payment recorded successfully'
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Failed to record book fee payment'
    });
  }
};

/**
 * @desc    Generate PDF receipt for a single BookFee record
 * @route   GET /api/books/:id/receipt-pdf
 * @access  Private (Admin Only)
 */
const generateBookReceiptPDF = async (req, res, next) => {
  try {
    const { id } = req.params;

    const bookRecord = await BookFee.findById(id).populate({
      path: 'student',
      select: 'fullName registrationNumber fatherName fatherContact classId sectionId',
      populate: [
        { path: 'classId', select: 'name' },
        { path: 'sectionId', select: 'name' }
      ]
    });

    if (!bookRecord) {
      return res.status(404).json({
        success: false,
        message: 'Book fee record not found'
      });
    }

    const student = bookRecord.student;
    const settings = await Settings.findOne({ schoolId: 'default' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${student?.registrationNumber || 'book'}-receipt.pdf"`
    );

    const doc = new PDFDocument({
      margins: { top: 125, bottom: 60, left: 50, right: 50 },
      bufferPages: true
    });
    doc.pipe(res);

    const title = 'Book Fee Payment Receipt';
    const subtitle = `Reg No: ${student?.registrationNumber || 'N/A'}`;

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
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.5).text('STUDENT & ENROLLMENT INFORMATION', 60, currentY + 5);
    doc.restore();

    currentY += 18;
    doc.save();
    doc.rect(50, currentY, 512, 45).fillAndStroke('#F8FAFC', '#E2E8F0');
    doc.fillColor('#00215E').font('Helvetica-Bold').fontSize(8);

    doc.text('Student Name:', 65, currentY + 12);
    doc.fillColor('#1E293B').font('Helvetica').fontSize(8.5).text(student?.fullName || 'N/A', 135, currentY + 11);

    doc.fillColor('#00215E').font('Helvetica-Bold').fontSize(8).text('Registration No:', 260, currentY + 12);
    doc.fillColor('#1E293B').font('Helvetica').fontSize(8.5).text(student?.registrationNumber || 'N/A', 345, currentY + 11);

    doc.fillColor('#00215E').font('Helvetica-Bold').fontSize(8).text('Class / Section:', 65, currentY + 28);
    const classSec = `${student?.classId?.name || 'N/A'} - ${student?.sectionId?.name || 'N/A'}`;
    doc.fillColor('#1E293B').font('Helvetica').fontSize(8.5).text(classSec, 135, currentY + 27);

    doc.fillColor('#00215E').font('Helvetica-Bold').fontSize(8).text("Father's Name:", 260, currentY + 28);
    doc.fillColor('#1E293B').font('Helvetica').fontSize(8.5).text(student?.fatherName || 'N/A', 345, currentY + 27);
    doc.restore();

    currentY += 58;

    // Book Items Breakdown Box
    doc.save();
    doc.rect(50, currentY, 512, 18).fill('#4F6EF7');
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.5).text('BOOK PACKAGE / ITEM DETAILS', 60, currentY + 5);
    doc.restore();

    currentY += 18;

    // Items table header
    doc.save();
    doc.rect(50, currentY, 512, 18).fill('#E2E8F0');
    doc.fillColor('#00215E').font('Helvetica-Bold').fontSize(8);
    doc.text('Item Description', 60, currentY + 5, { width: 280 });
    doc.text('Qty', 350, currentY + 5, { width: 50, align: 'center' });
    doc.text('Unit Price', 410, currentY + 5, { width: 70, align: 'right' });
    doc.text('Total', 490, currentY + 5, { width: 60, align: 'right' });
    doc.restore();

    currentY += 18;

    const items = bookRecord.items && bookRecord.items.length > 0
      ? bookRecord.items
      : [{ title: 'Course Books & Curriculum Set', price: bookRecord.amount, quantity: 1 }];

    items.forEach((item, index) => {
      if (index % 2 === 1) {
        doc.save();
        doc.rect(50, currentY, 512, 16).fill('#F8FAFC');
        doc.restore();
      }

      doc.save();
      doc.fillColor('#1E293B').font('Helvetica').fontSize(8);
      doc.text(item.title, 60, currentY + 4, { width: 280 });
      doc.text(String(item.quantity || 1), 350, currentY + 4, { width: 50, align: 'center' });
      doc.text(`Rs. ${(item.price || 0).toFixed(2)}`, 410, currentY + 4, { width: 70, align: 'right' });
      doc.text(`Rs. {((item.price || 0) * (item.quantity || 1)).toFixed(2)}`, 490, currentY + 4, { width: 60, align: 'right' });
      doc.restore();

      doc.moveTo(50, currentY + 16).lineTo(562, currentY + 16).strokeColor('#E2E8F0').lineWidth(0.5).stroke();
      currentY += 16;
    });

    currentY += 10;

    // Financial Summary Panel
    doc.save();
    doc.rect(50, currentY, 512, 45).fillAndStroke('#F8FAFC', '#00215E');
    doc.fillColor('#00215E').font('Helvetica-Bold').fontSize(8.5);

    doc.text('Total Billed Amount:', 65, currentY + 10);
    doc.fillColor('#1E293B').font('Helvetica').text(`Rs. ${(bookRecord.amount || 0).toFixed(2)}`, 180, currentY + 10);

    doc.fillColor('#00215E').font('Helvetica-Bold').text('Total Paid Amount:', 320, currentY + 10);
    doc.fillColor('#16A34A').font('Helvetica-Bold').text(`Rs. ${(bookRecord.amountPaid || 0).toFixed(2)}`, 430, currentY + 10);

    doc.fillColor('#00215E').font('Helvetica-Bold').text('Outstanding Balance:', 65, currentY + 26);
    const balance = Math.max(0, (bookRecord.amount || 0) - (bookRecord.amountPaid || 0));
    doc.fillColor(balance > 0 ? '#DC2626' : '#16A34A').font('Helvetica-Bold').text(`Rs. ${balance.toFixed(2)}`, 180, currentY + 26);

    doc.fillColor('#00215E').font('Helvetica-Bold').text('Payment Status:', 320, currentY + 26);
    doc.fillColor(bookRecord.paymentStatus === 'paid' ? '#16A34A' : '#D97706').font('Helvetica-Bold').text(bookRecord.paymentStatus.toUpperCase(), 430, currentY + 26);
    doc.restore();

    currentY += 55;

    // Payment Transactions History
    if (bookRecord.payments && bookRecord.payments.length > 0) {
      doc.save();
      doc.rect(50, currentY, 512, 18).fill('#00215E');
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.5).text('PAYMENT TRANSACTIONS LOG', 60, currentY + 5);
      doc.restore();

      currentY += 18;

      doc.save();
      doc.rect(50, currentY, 512, 18).fill('#E2E8F0');
      doc.fillColor('#00215E').font('Helvetica-Bold').fontSize(8);
      doc.text('Receipt No', 60, currentY + 5, { width: 90 });
      doc.text('Date', 160, currentY + 5, { width: 90 });
      doc.text('Method', 260, currentY + 5, { width: 90 });
      doc.text('Amount Paid', 450, currentY + 5, { width: 100, align: 'right' });
      doc.restore();

      currentY += 18;

      bookRecord.payments.forEach((payment, idx) => {
        if (idx % 2 === 1) {
          doc.save();
          doc.rect(50, currentY, 512, 16).fill('#F8FAFC');
          doc.restore();
        }

        doc.save();
        doc.fillColor('#1E293B').font('Helvetica').fontSize(8);
        doc.text(payment.receiptNumber || 'N/A', 60, currentY + 4, { width: 90 });
        doc.text(new Date(payment.paidOn).toISOString().split('T')[0], 160, currentY + 4, { width: 90 });
        doc.text(payment.method.toUpperCase(), 260, currentY + 4, { width: 90 });
        doc.font('Helvetica-Bold').fillColor('#16A34A').text(`Rs. ${(payment.amount || 0).toFixed(2)}`, 450, currentY + 4, { width: 100, align: 'right' });
        doc.restore();

        doc.moveTo(50, currentY + 16).lineTo(562, currentY + 16).strokeColor('#E2E8F0').lineWidth(0.5).stroke();
        currentY += 16;
      });

      currentY += 20;
    }

    // Signature Area
    if (currentY + 50 > 710) {
      doc.addPage();
      currentY = 125;
    }

    doc.save();
    doc.moveTo(380, currentY + 35).lineTo(530, currentY + 35).strokeColor('#64748B').lineWidth(0.5).stroke();
    doc.fillColor('#64748B').fontSize(7.5).font('Helvetica-Bold').text('Authorized Accounts Signature', 380, currentY + 40, { align: 'center', width: 150 });
    doc.restore();

    addPageNumbers(doc, onPageAdded);
    doc.end();
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Issue book charge to a student or whole class
 * @route   POST /api/books/issue
 * @access  Private (Admin Only)
 */
const issueBookCharge = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      targetType, // 'student' | 'class'
      studentId,
      classId,
      sectionId,
      amount,
      dueDate,
      items,
      academicYear
    } = req.body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number'
      });
    }

    const settings = await Settings.findOne({ schoolId: 'default' }).session(session);
    const sessionYear = academicYear || settings?.currentSession || '2025-2026';

    const recordsToInsert = [];

    if (targetType === 'student') {
      if (!studentId) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: 'Student ID is required'
        });
      }

      const student = await Student.findById(studentId).session(session);
      if (!student) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      recordsToInsert.push({
        student: student._id,
        classId: student.classId || classId || null,
        academicYear: sessionYear,
        amount: numAmount,
        amountPaid: 0,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        paid: false,
        paymentStatus: 'pending',
        deliveryStatus: 'pending',
        items: items || [],
        payments: []
      });
    } else {
      // Bulk issuance for class
      if (!classId) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: 'Class ID is required'
        });
      }

      const query = { classId, status: 'active' };
      if (sectionId && sectionId !== '') {
        query.sectionId = sectionId;
      }

      const students = await Student.find(query).session(session);
      if (students.length === 0) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          success: false,
          message: 'No active students found matching the selected class/section'
        });
      }

      for (const student of students) {
        recordsToInsert.push({
          student: student._id,
          classId: student.classId || classId,
          academicYear: sessionYear,
          amount: numAmount,
          amountPaid: 0,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          paid: false,
          paymentStatus: 'pending',
          deliveryStatus: 'pending',
          items: items || [],
          payments: []
        });
      }
    }

    const createdRecords = await BookFee.insertMany(recordsToInsert, { session });

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      success: true,
      count: createdRecords.length,
      message: `Successfully issued book charge to ${createdRecords.length} student(s)`
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Failed to issue book charge'
    });
  }
};

module.exports = {
  getBookSummary,
  getBookDues,
  recordBookPayment,
  generateBookReceiptPDF,
  issueBookCharge
};
