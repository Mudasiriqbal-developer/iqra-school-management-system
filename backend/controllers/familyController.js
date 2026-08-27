const mongoose = require('mongoose');
const Family = require('../models/Family');
const Student = require('../models/Student');
const FeeRecord = require('../models/FeeRecord');
const User = require('../models/User');
const FamilyVoucher = require('../models/FamilyVoucher');
const Counter = require('../models/Counter');
const Settings = require('../models/Settings');
const studentFeeService = require('../services/studentFeeService');
const PDFDocument = require('pdfkit');
const { drawBrandedHeader, drawFooter, addPageNumbers } = require('../utils/pdfHelper');

/**
 * Helper: Validates and links students to a family with transaction safety.
 * Handles the "reassign" logic if students belong to a different family.
 */
const syncStudentsToFamily = async (familyId, studentIds, reassign, session) => {
  if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
    return;
  }

  for (const studentId of studentIds) {
    const student = await Student.findById(studentId).session(session);
    if (!student) {
      const err = new Error(`Student with ID ${studentId} not found`);
      err.statusCode = 404;
      throw err;
    }

    // Check if student belongs to a different family
    if (student.familyId && student.familyId.toString() !== familyId.toString()) {
      const oldFamilyId = student.familyId;
      const oldFamily = await Family.findById(oldFamilyId).session(session);
      const oldFamilyName = oldFamily ? oldFamily.familyName : 'Unknown Family';

      if (!reassign) {
        const err = new Error(`Student ${student.fullName} (Reg: ${student.registrationNumber}) is already linked to family "${oldFamilyName}"`);
        err.statusCode = 409;
        err.studentName = student.fullName;
        err.registrationNumber = student.registrationNumber;
        err.oldFamilyName = oldFamilyName;
        throw err;
      }

      // Reassign: Pull from old family
      await Family.findByIdAndUpdate(
        oldFamilyId,
        { $pull: { students: student._id } },
        { session }
      );
    }

    // Set new family relation
    student.familyId = familyId;
    await student.save({ session });

    // Push into new family (ensure uniqueness)
    await Family.findByIdAndUpdate(
      familyId,
      { $addToSet: { students: student._id } },
      { session }
    );
  }
};

/**
 * @desc    Create a new family tree group
 * @route   POST /api/families
 * @access  Private (Admin Only)
 */
const createFamily = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { familyName, guardianName, contactNumber, alternateContact, address, studentIds, notes, reassign } = req.body;

    if (!familyName || !contactNumber) {
      return res.status(400).json({
        success: false,
        message: 'Family name and contact number are required'
      });
    }

    // Create family record
    const family = new Family({
      familyName,
      guardianName,
      contactNumber,
      alternateContact,
      address,
      notes,
      students: [],
      createdBy: req.user.id
    });

    await family.save({ session });

    // Link students if provided
    if (studentIds && studentIds.length > 0) {
      await syncStudentsToFamily(family._id, studentIds, reassign, session);
    }

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    // Fetch final populated family
    const populatedFamily = await Family.findById(family._id).populate('students', 'fullName registrationNumber classId sectionId');

    return res.status(201).json({
      success: true,
      data: populatedFamily,
      message: 'Family tree created successfully'
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        conflictDetails: error.statusCode === 409 ? {
          studentName: error.studentName,
          registrationNumber: error.registrationNumber,
          oldFamilyName: error.oldFamilyName
        } : null
      });
    }
    next(error);
  }
};

/**
 * @desc    List all families with search & pagination
 * @route   GET /api/families
 * @access  Private (Admin Only)
 */
const getFamilies = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;

    const pageVal = parseInt(page, 10);
    const limitVal = parseInt(limit, 10);
    const skipVal = (pageVal - 1) * limitVal;

    const filter = {};

    if (search) {
      filter.$or = [
        { familyName: { $regex: search, $options: 'i' } },
        { contactNumber: { $regex: search, $options: 'i' } },
        { guardianName: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Family.countDocuments(filter);
    const families = await Family.find(filter)
      .populate('students', 'fullName registrationNumber classId sectionId')
      .skip(skipVal)
      .limit(limitVal)
      .sort({ createdAt: -1 });

    const pages = Math.ceil(total / limitVal);

    return res.status(200).json({
      success: true,
      data: {
        families,
        total,
        page: pageVal,
        pages
      },
      message: 'Families list retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get detailed family info with student summaries
 * @route   GET /api/families/:id
 * @access  Private (Admin Only)
 */
const getFamilyById = async (req, res, next) => {
  try {
    const family = await Family.findById(req.params.id)
      .populate({
        path: 'students',
        select: 'fullName registrationNumber classId sectionId status photoUrl monthlyFeeAmount',
        populate: [
          { path: 'classId', select: 'name' },
          { path: 'sectionId', select: 'name' }
        ]
      });

    if (!family) {
      return res.status(404).json({
        success: false,
        message: 'Family not found'
      });
    }

    const vouchers = await FamilyVoucher.find({ familyId: family._id }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: {
        ...family.toObject(),
        vouchers
      },
      message: 'Family details retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update family metadata info
 * @route   PUT /api/families/:id
 * @access  Private (Admin Only)
 */
const updateFamily = async (req, res, next) => {
  try {
    const { familyName, guardianName, contactNumber, alternateContact, address, notes } = req.body;

    if (!familyName || !contactNumber) {
      return res.status(400).json({
        success: false,
        message: 'Family name and contact number are required'
      });
    }

    const family = await Family.findByIdAndUpdate(
      req.params.id,
      { familyName, guardianName, contactNumber, alternateContact, address, notes },
      { new: true }
    ).populate('students', 'fullName registrationNumber classId sectionId');

    if (!family) {
      return res.status(404).json({
        success: false,
        message: 'Family not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: family,
      message: 'Family details updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Attach/detach students to a family
 * @route   PATCH /api/families/:id/students
 * @access  Private (Admin Only)
 */
const updateFamilyStudents = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { add, remove, reassign } = req.body;

    const family = await Family.findById(id).session(session);
    if (!family) {
      return res.status(404).json({
        success: false,
        message: 'Family not found'
      });
    }

    // Process removals
    if (remove && Array.isArray(remove) && remove.length > 0) {
      for (const studentId of remove) {
        // Clear back-reference
        await Student.findByIdAndUpdate(
          studentId,
          { familyId: null },
          { session }
        );

        // Remove from family students list
        family.students = family.students.filter(sId => sId.toString() !== studentId.toString());
      }
      await family.save({ session });
    }

    // Process additions
    if (add && Array.isArray(add) && add.length > 0) {
      await syncStudentsToFamily(family._id, add, reassign, session);
    }

    await session.commitTransaction();
    session.endSession();

    // Fetch updated populated family
    const updatedFamily = await Family.findById(id)
      .populate({
        path: 'students',
        select: 'fullName registrationNumber classId sectionId status photoUrl',
        populate: [
          { path: 'classId', select: 'name' },
          { path: 'sectionId', select: 'name' }
        ]
      });

    return res.status(200).json({
      success: true,
      data: updatedFamily,
      message: 'Family student list updated successfully'
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        conflictDetails: error.statusCode === 409 ? {
          studentName: error.studentName,
          registrationNumber: error.registrationNumber,
          oldFamilyName: error.oldFamilyName
        } : null
      });
    }
    next(error);
  }
};

/**
 * @desc    Delete family tree (only unlinks students, never cascades to delete them)
 * @route   DELETE /api/families/:id
 * @access  Private (Admin Only)
 */
const deleteFamily = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const family = await Family.findById(req.params.id).session(session);
    if (!family) {
      return res.status(404).json({
        success: false,
        message: 'Family not found'
      });
    }

    // Clear familyId on all linked students
    if (family.students && family.students.length > 0) {
      await Student.updateMany(
        { _id: { $in: family.students } },
        { familyId: null },
        { session }
      );
    }

    // Delete the family itself
    await Family.findByIdAndDelete(family._id, { session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: 'Family deleted and students unlinked successfully'
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/**
 * Combined Fee Summary for Phase 2
 */
const getFamilyFeeSummary = async (req, res, next) => {
  try {
    const family = await Family.findById(req.params.id).populate({
      path: 'students',
      populate: [
        { path: 'classId', select: 'name' },
        { path: 'sectionId', select: 'name' }
      ]
    });

    if (!family) {
      return res.status(404).json({
        success: false,
        message: 'Family not found'
      });
    }

    const studentsData = [];
    let familyTotal = 0;

    for (const student of family.students) {
      // Lazy load/ensure current month record is created
      await studentFeeService.getOrCreateCurrentMonthRecord(student._id);

      // Fetch student ledger
      const ledger = await studentFeeService.getStudentLedgerData(student._id);

      // Filter outstanding fee records (amountDue - amountPaid > 0)
      const outstandingRecords = ledger.records
        .filter(r => r.amountDue - r.amountPaid > 0)
        .map(r => ({
          feeRecordId: r._id,
          month: r.month,
          amount: r.amountDue - r.amountPaid
        }));

      const studentTotal = outstandingRecords.reduce((sum, r) => sum + r.amount, 0);
      familyTotal += studentTotal;

      const classSec = `${student.classId?.name || 'N/A'} / ${student.sectionId?.name || 'N/A'}`;

      studentsData.push({
        studentId: student._id,
        studentName: student.fullName,
        classSection: classSec,
        outstandingRecords,
        studentTotal
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        familyId: family._id,
        students: studentsData,
        familyTotal
      },
      message: 'Family fee summary retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Books Outstanding Summary for Phase 2 (Stub only)
 */
const getFamilyBooksSummary = async (req, res, next) => {
  try {
    const family = await Family.findById(req.params.id).populate('students', 'fullName');

    if (!family) {
      return res.status(404).json({
        success: false,
        message: 'Family not found'
      });
    }

    const studentsData = family.students.map(student => ({
      studentId: student._id,
      studentName: student.fullName,
      booksOutstanding: null,
      tracked: false
    }));

    return res.status(200).json({
      success: true,
      data: {
        familyId: family._id,
        students: studentsData
      },
      message: 'Family books summary retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Combined Payments for Phase 3
 */
const payFamilyFees = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { feeRecordIds, paymentMethod, idempotencyKey } = req.body;

    if (!idempotencyKey) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Idempotency key is required'
      });
    }

    // Idempotency check:
    const existingVoucher = await FamilyVoucher.findOne({ idempotencyKey }).session(session);
    if (existingVoucher) {
      await session.abortTransaction();
      session.endSession();
      return res.status(200).json({
        success: true,
        data: existingVoucher,
        message: 'Payment already processed (idempotent response)'
      });
    }

    const family = await Family.findById(id).session(session);
    if (!family) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Family not found'
      });
    }

    if (!feeRecordIds || !Array.isArray(feeRecordIds) || feeRecordIds.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'No fee records selected for payment'
      });
    }

    // Verify feeRecordIds belong to students in this family
    const familyStudentIds = family.students.map(sId => sId.toString());
    const lineItems = [];
    let totalAmount = 0;

    for (const recordId of feeRecordIds) {
      const record = await FeeRecord.findById(recordId).session(session);
      if (!record) {
        throw new Error(`Fee record ${recordId} not found`);
      }

      if (!familyStudentIds.includes(record.studentId.toString())) {
        throw new Error(`Fee record ${recordId} does not belong to this family`);
      }

      if (record.status === 'paid' || record.amountDue <= record.amountPaid) {
        throw new Error(`Fee record for month ${record.month} is already fully paid`);
      }

      const remaining = record.amountDue - record.amountPaid;
      totalAmount += remaining;

      // Fetch student details to get name and classSection
      const student = await Student.findById(record.studentId)
        .populate('classId', 'name')
        .populate('sectionId', 'name')
        .session(session);
      
      const classSec = `${student.classId?.name || 'N/A'} / ${student.sectionId?.name || 'N/A'}`;

      lineItems.push({
        studentId: student._id,
        studentName: student.fullName,
        classSection: classSec,
        month: record.month,
        amount: remaining,
        feeRecordId: record._id
      });

      // Update the FeeRecord
      record.payments.push({
        amount: remaining,
        type: 'full',
        method: paymentMethod || 'cash',
        paidOn: new Date()
      });
      record.amountPaid += remaining;
      record.status = 'paid';

      await record.save({ session });
    }

    // Generate sequential voucher number
    const counter = await Counter.findOneAndUpdate(
      { id: 'voucher' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, session }
    );
    const voucherNumber = `FRC-${String(counter.seq).padStart(6, '0')}`;

    // Create the FamilyVoucher
    const newVoucher = new FamilyVoucher({
      familyId: family._id,
      voucherNumber,
      idempotencyKey,
      lineItems,
      totalAmount,
      paymentMethod: paymentMethod || 'cash',
      paymentDate: new Date(),
      createdBy: req.user?.id
    });

    await newVoucher.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      success: true,
      data: newVoucher,
      message: 'Family payment recorded successfully'
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Failed to process family payment'
    });
  }
};

/**
 * Generate Combined PDF Voucher for Phase 4
 */
const generateFamilyVoucherPDF = async (req, res, next) => {
  try {
    const { familyId, voucherId } = req.params;

    const family = await Family.findById(familyId);
    if (!family) {
      return res.status(404).json({
        success: false,
        message: 'Family not found'
      });
    }

    const voucher = await FamilyVoucher.findById(voucherId);
    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Voucher not found'
      });
    }

    if (voucher.familyId.toString() !== familyId) {
      return res.status(400).json({
        success: false,
        message: 'Voucher does not match family profile'
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="family-voucher-${voucher.voucherNumber}.pdf"`
    );

    const doc = new PDFDocument({ 
      margins: { top: 125, bottom: 60, left: 50, right: 50 },
      bufferPages: true
    });
    doc.pipe(res);

    const settings = await Settings.findOne({ schoolId: 'default' });

    const title = 'Family Fee Voucher';
    const subtitle = `Voucher No: ${voucher.voucherNumber}`;

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

    // Family Info Box
    doc.save();
    doc.rect(50, currentY, 512, 18).fill('#00215E');
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.5).text('FAMILY INFORMATION', 60, currentY + 5);
    doc.restore();

    currentY += 18;
    doc.save();
    doc.rect(50, currentY, 512, 45).fillAndStroke('#F8FAFC', '#E2E8F0');
    doc.fillColor('#00215E').font('Helvetica-Bold').fontSize(8);
    
    doc.text('Family Name:', 65, currentY + 12);
    doc.fillColor('#1E293B').font('Helvetica').fontSize(8.5).text(family.familyName, 130, currentY + 11);

    doc.fillColor('#00215E').font('Helvetica-Bold').fontSize(8).text('Guardian Name:', 230, currentY + 12);
    doc.fillColor('#1E293B').font('Helvetica').fontSize(8.5).text(family.guardianName || 'N/A', 310, currentY + 11);

    doc.fillColor('#00215E').font('Helvetica-Bold').fontSize(8).text("Contact Number:", 390, currentY + 12);
    doc.fillColor('#1E293B').font('Helvetica').fontSize(8.5).text(family.contactNumber, 465, currentY + 11);
    doc.restore();
    
    currentY += 60;

    // Payment details box
    doc.save();
    doc.rect(50, currentY, 512, 35).fillAndStroke('#F8FAFC', '#E2E8F0');
    doc.fillColor('#00215E').font('Helvetica-Bold').fontSize(8);
    
    doc.text('Payment Date:', 65, currentY + 14);
    const dateStr = new Date(voucher.paymentDate).toISOString().split('T')[0];
    doc.fillColor('#1E293B').font('Helvetica').fontSize(8.5).text(dateStr, 135, currentY + 13);

    doc.fillColor('#00215E').font('Helvetica-Bold').fontSize(8).text('Payment Method:', 250, currentY + 14);
    doc.fillColor('#1E293B').font('Helvetica').fontSize(8.5).text(voucher.paymentMethod.toUpperCase(), 335, currentY + 13);
    doc.restore();

    currentY += 50;

    // Group items by student
    const studentGroupMap = new Map();
    voucher.lineItems.forEach(item => {
      const key = item.studentId.toString();
      if (!studentGroupMap.has(key)) {
        studentGroupMap.set(key, {
          studentName: item.studentName,
          classSection: item.classSection,
          items: []
        });
      }
      studentGroupMap.get(key).items.push(item);
    });

    // Draw table headers config
    const monthColX = 50;
    const amountColX = 350;
    const statusColX = 450;
    const colWidths = {
      month: 300,
      amount: 100,
      status: 112
    };

    // Draw students grouped list
    for (const [studentId, group] of studentGroupMap.entries()) {
      // Calculate height of the student block: subheading (20) + header (20) + items * 18 + margin/padding
      const numItems = group.items.length;
      const blockHeight = 20 + 20 + numItems * 18 + 15;

      if (currentY + blockHeight > 690) {
        doc.addPage();
        currentY = 125;
      }

      // Student Header / Subheading
      doc.save();
      doc.rect(50, currentY, 512, 16).fill('#4F6EF7');
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.5).text(`${group.studentName.toUpperCase()}  (${group.classSection})`, 60, currentY + 4);
      doc.restore();
      currentY += 16;

      // Table Header for this student
      doc.save();
      doc.rect(50, currentY, 512, 18).fill('#E2E8F0');
      doc.fillColor('#00215E').font('Helvetica-Bold').fontSize(8);
      doc.text('Month / Item Description', monthColX + 10, currentY + 5, { width: colWidths.month - 10 });
      doc.text('Amount Paid', amountColX, currentY + 5, { width: colWidths.amount, align: 'right' });
      doc.text('Status', statusColX, currentY + 5, { width: colWidths.status, align: 'center' });
      doc.restore();
      currentY += 18;

      // Student items
      let studentSubtotal = 0;
      group.items.forEach((item, index) => {
        studentSubtotal += item.amount;

        if (index % 2 === 1) {
          doc.save();
          doc.rect(50, currentY, 512, 16).fill('#F8FAFC');
          doc.restore();
        }

        doc.save();
        doc.fillColor('#1E293B').font('Helvetica').fontSize(8);
        doc.text(item.month, monthColX + 10, currentY + 4, { width: colWidths.month - 10 });
        doc.text(`Rs. ${item.amount.toFixed(2)}`, amountColX, currentY + 4, { width: colWidths.amount, align: 'right' });
        doc.font('Helvetica-Bold').fillColor('#16A34A').text('PAID', statusColX, currentY + 4, { width: colWidths.status, align: 'center' });
        doc.restore();

        // Row border
        doc.moveTo(50, currentY + 16).lineTo(562, currentY + 16).strokeColor('#E2E8F0').lineWidth(0.5).stroke();
        currentY += 16;
      });

      // Student Subtotal Row
      doc.save();
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#00215E');
      doc.text('Student Subtotal:', monthColX + 10, currentY + 4);
      doc.text(`Rs. ${studentSubtotal.toFixed(2)}`, amountColX, currentY + 4, { width: colWidths.amount, align: 'right' });
      doc.restore();
      currentY += 16;
      
      // Add gap between students
      currentY += 12;
    }

    // Combined Total Box
    if (currentY + 50 > 710) {
      doc.addPage();
      currentY = 125;
    }
    
    doc.save();
    doc.rect(50, currentY, 512, 32).fillAndStroke('#F8FAFC', '#00215E');
    doc.fillColor('#00215E').font('Helvetica-Bold').fontSize(10).text('COMBINED TOTAL PAID:', 65, currentY + 11);
    doc.fillColor('#00215E').font('Helvetica-Bold').fontSize(11).text(`Rs. ${voucher.totalAmount.toFixed(2)}`, 350, currentY + 10, { width: 100, align: 'right' });
    doc.restore();
    
    currentY += 45;

    // Authorized Signature
    if (currentY + 45 > 715) {
      doc.addPage();
      currentY = 125;
    }
    doc.save();
    doc.moveTo(380, currentY + 35).lineTo(530, currentY + 35).strokeColor('#64748B').lineWidth(0.5).stroke();
    doc.fillColor('#64748B').fontSize(7.5).font('Helvetica-Bold').text('Accounts Registrar Signature', 380, currentY + 40, { align: 'center', width: 150 });
    doc.restore();

    // Finalize page numbering
    addPageNumbers(doc, onPageAdded);

    doc.end();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createFamily,
  getFamilies,
  getFamilyById,
  updateFamily,
  updateFamilyStudents,
  deleteFamily,
  getFamilyFeeSummary,
  getFamilyBooksSummary,
  payFamilyFees,
  generateFamilyVoucherPDF
};
