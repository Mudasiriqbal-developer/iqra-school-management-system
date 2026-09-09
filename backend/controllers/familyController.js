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
const BookFee = require('../models/BookFee');
const bcrypt = require('bcryptjs');
const { checkDuplicateStudent } = require('../services/studentImportService');
const Class = require('../models/Class');
const Section = require('../models/Section');
const { reserveNextRegistrationNumber } = require('../services/studentService');
const { withTransaction } = require('../utils/transactionHelper');
const { escapeRegex } = require('../utils/regexHelper');

/**
 * Helper: Validates and links students to a family with transaction safety.
 * Handles the "reassign" logic if students belong to a different family.
 */
const syncStudentsToFamily = async (familyId, studentIds, reassign, session) => {
  if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
    return;
  }

  for (const studentId of studentIds) {
    let studentQuery = Student.findById(studentId);
    if (session) studentQuery = studentQuery.session(session);
    const student = await studentQuery;
    if (!student) {
      const err = new Error(`Student with ID ${studentId} not found`);
      err.statusCode = 404;
      throw err;
    }

    // Check if student belongs to a different family
    if (student.familyId && student.familyId.toString() !== familyId.toString()) {
      const oldFamilyId = student.familyId;
      let oldFamilyQuery = Family.findById(oldFamilyId);
      if (session) oldFamilyQuery = oldFamilyQuery.session(session);
      const oldFamily = await oldFamilyQuery;
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
        session ? { session } : {}
      );
    }

    // Set new family relation
    student.familyId = familyId;
    await student.save(session ? { session } : {});

    // Push into new family (ensure uniqueness)
    await Family.findByIdAndUpdate(
      familyId,
      { $addToSet: { students: student._id } },
      session ? { session } : {}
    );
  }
};

/**
 * @desc    Create a new family tree group
 * @route   POST /api/families
 * @access  Private (Admin Only)
 */
const createFamily = async (req, res, next) => {
  try {
    const { familyName, guardianName, contactNumber, alternateContact, address, studentIds, notes, reassign } = req.body;

    if (!familyName || !contactNumber) {
      return res.status(400).json({
        success: false,
        message: 'Family name and contact number are required'
      });
    }

    const populatedFamily = await withTransaction(async (session) => {
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

      await family.save(session ? { session } : {});

      // Link students if provided
      if (studentIds && studentIds.length > 0) {
        await syncStudentsToFamily(family._id, studentIds, reassign, session);
      }

      // Fetch final populated family
      let query = Family.findById(family._id).populate('students', 'fullName registrationNumber classId sectionId');
      if (session) query = query.session(session);
      return await query;
    });

    return res.status(201).json({
      success: true,
      data: populatedFamily,
      message: 'Family tree created successfully'
    });
  } catch (error) {
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

    if (search && typeof search === 'string' && search.trim()) {
      const safeSearch = escapeRegex(search.trim());
      filter.$or = [
        { familyName: { $regex: safeSearch, $options: 'i' } },
        { contactNumber: { $regex: safeSearch, $options: 'i' } },
        { guardianName: { $regex: safeSearch, $options: 'i' } }
      ];
    }

    const total = await Family.countDocuments(filter);
    const families = await Family.find(filter)
      .populate('students', 'fullName registrationNumber classId sectionId')
      .skip(skipVal)
      .limit(limitVal)
      .sort({ createdAt: -1 });

    // Gather all student IDs in this page of families
    const allStudentIds = families.flatMap(f => f.students.map(s => s._id));

    // Query all fee records for these students
    const feeRecords = await FeeRecord.find({
      studentId: { $in: allStudentIds }
    });

    // Map student ID to their live outstanding sum
    const studentOutstandingMap = {};
    for (const record of feeRecords) {
      const outstanding = Math.max(0, record.amountDue - record.amountPaid);
      const studentIdStr = record.studentId.toString();
      studentOutstandingMap[studentIdStr] = (studentOutstandingMap[studentIdStr] || 0) + outstanding;
    }

    // Attach combinedOutstanding to each family in the response
    const familiesWithOutstanding = families.map(f => {
      const familyObj = f.toObject();
      let combinedOutstanding = 0;
      if (familyObj.students && Array.isArray(familyObj.students)) {
        familyObj.students.forEach(student => {
          const studentIdStr = student._id.toString();
          combinedOutstanding += (studentOutstandingMap[studentIdStr] || 0);
        });
      }
      familyObj.combinedOutstanding = combinedOutstanding;
      return familyObj;
    });

    const pages = Math.ceil(total / limitVal);

    return res.status(200).json({
      success: true,
      data: {
        families: familiesWithOutstanding,
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
        select: 'fullName registrationNumber classId sectionId status photoUrl customFee customFeeNote',
        populate: [
          { path: 'classId', select: 'name defaultFee' },
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
  try {
    const { id } = req.params;
    const { add, remove, reassign } = req.body;

    const updatedFamily = await withTransaction(async (session) => {
      let familyQuery = Family.findById(id);
      if (session) familyQuery = familyQuery.session(session);
      const family = await familyQuery;
      if (!family) {
        const err = new Error('Family not found');
        err.statusCode = 404;
        throw err;
      }

      // Process removals
      if (remove && Array.isArray(remove) && remove.length > 0) {
        for (const studentId of remove) {
          // Clear back-reference
          await Student.findByIdAndUpdate(
            studentId,
            { familyId: null },
            session ? { session } : {}
          );

          // Remove from family students list
          family.students = family.students.filter(sId => sId.toString() !== studentId.toString());
        }
        await family.save(session ? { session } : {});
      }

      // Process additions
      if (add && Array.isArray(add) && add.length > 0) {
        await syncStudentsToFamily(family._id, add, reassign, session);
      }

      // Fetch updated populated family
      let query = Family.findById(id)
        .populate({
          path: 'students',
          select: 'fullName registrationNumber classId sectionId status photoUrl',
          populate: [
            { path: 'classId', select: 'name' },
            { path: 'sectionId', select: 'name' }
          ]
        });
      if (session) query = query.session(session);
      return await query;
    });

    return res.status(200).json({
      success: true,
      data: updatedFamily,
      message: 'Family student list updated successfully'
    });
  } catch (error) {
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
  try {
    await withTransaction(async (session) => {
      let familyQuery = Family.findById(req.params.id);
      if (session) familyQuery = familyQuery.session(session);
      const family = await familyQuery;
      if (!family) {
        const err = new Error('Family not found');
        err.statusCode = 404;
        throw err;
      }

      // Clear familyId on all linked students
      if (family.students && family.students.length > 0) {
        await Student.updateMany(
          { _id: { $in: family.students } },
          { familyId: null },
          session ? { session } : {}
        );
      }

      // Delete the family itself
      await Family.findByIdAndDelete(family._id, session ? { session } : {});
    });

    return res.status(200).json({
      success: true,
      message: 'Family deleted and students unlinked successfully'
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }
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
          title: r.title || (r.type === 'admission' ? 'Admission & Books' : null),
          type: r.type,
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
 * Books Outstanding Summary
 */
const getFamilyBooksSummary = async (req, res, next) => {
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
      const bookRecords = await BookFee.find({
        student: student._id,
        paymentStatus: { $ne: 'paid' }
      }).sort({ createdAt: -1 });

      const outstandingRecords = bookRecords
        .filter(r => (r.amount - (r.amountPaid || 0)) > 0)
        .map(r => {
          const remaining = r.amount - (r.amountPaid || 0);
          const title = r.items && r.items.length > 0
            ? r.items.map(item => item.title).join(', ')
            : 'Course Books';

          return {
            bookFeeId: r._id,
            academicYear: r.academicYear || null,
            title,
            amount: remaining,
            totalAmount: r.amount,
            amountPaid: r.amountPaid || 0,
            dueDate: r.dueDate || null,
            paymentStatus: r.paymentStatus || 'pending',
            deliveryStatus: r.deliveryStatus || 'pending'
          };
        });

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
  try {
    const { id } = req.params;
    const { feeRecordIds, paymentMethod, idempotencyKey } = req.body;

    if (!idempotencyKey) {
      return res.status(400).json({
        success: false,
        message: 'Idempotency key is required'
      });
    }

    const result = await withTransaction(async (session) => {
      // Idempotency check:
      let existingQuery = FamilyVoucher.findOne({ idempotencyKey });
      if (session) existingQuery = existingQuery.session(session);
      const existingVoucher = await existingQuery;
      if (existingVoucher) {
        return { isExisting: true, voucher: existingVoucher };
      }

      let familyQuery = Family.findById(id);
      if (session) familyQuery = familyQuery.session(session);
      const family = await familyQuery;
      if (!family) {
        const err = new Error('Family not found');
        err.statusCode = 404;
        throw err;
      }

      if (!feeRecordIds || !Array.isArray(feeRecordIds) || feeRecordIds.length === 0) {
        const err = new Error('No fee records selected for payment');
        err.statusCode = 400;
        throw err;
      }

      // Phase 1: Pre-fetch and validate ALL records before making ANY modifications
      const familyStudentIds = family.students.map(sId => sId.toString());
      const recordsToUpdate = [];
      const lineItems = [];
      let totalAmount = 0;

      for (const recordId of feeRecordIds) {
        let recordQuery = FeeRecord.findById(recordId);
        if (session) recordQuery = recordQuery.session(session);
        const record = await recordQuery;
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
        let studentQuery = Student.findById(record.studentId)
          .populate('classId', 'name')
          .populate('sectionId', 'name');
        if (session) studentQuery = studentQuery.session(session);
        const student = await studentQuery;
        
        const classSec = `${student?.classId?.name || 'N/A'} / ${student?.sectionId?.name || 'N/A'}`;

        lineItems.push({
          studentId: student?._id || record.studentId,
          studentName: student?.fullName || 'Student',
          classSection: classSec,
          month: record.month,
          title: record.title || (record.type === 'admission' ? 'Admission & Books' : null),
          type: record.type,
          amount: remaining,
          feeRecordId: record._id
        });

        recordsToUpdate.push({ record, remaining });
      }

      // Phase 2: Generate sequential voucher number
      const counter = await Counter.findOneAndUpdate(
        { id: 'voucher' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, ...(session && { session }) }
      );
      const voucherNumber = `FRC-${String(counter.seq).padStart(6, '0')}`;

      // Phase 3: Create FamilyVoucher first (atomic lock via unique idempotencyKey)
      const voucherDoc = new FamilyVoucher({
        familyId: family._id,
        voucherNumber,
        voucherType: 'fee',
        idempotencyKey,
        feeRecordIds,
        lineItems,
        totalAmount,
        paymentMethod: paymentMethod || 'cash',
        paymentDate: new Date(),
        createdBy: req.user?.id
      });

      await voucherDoc.save(session ? { session } : {});

      // Phase 4: Apply updates to FeeRecords
      for (const { record, remaining } of recordsToUpdate) {
        record.payments.push({
          amount: remaining,
          type: 'full',
          method: paymentMethod || 'cash',
          paidOn: new Date()
        });
        record.amountPaid += remaining;
        record.status = 'paid';
        await record.save(session ? { session } : {});
      }

      return { isExisting: false, voucher: voucherDoc };
    });

    if (result.isExisting) {
      return res.status(200).json({
        success: true,
        data: result.voucher,
        message: 'Payment already processed (idempotent response)'
      });
    }

    return res.status(201).json({
      success: true,
      data: result.voucher,
      message: 'Family payment recorded successfully'
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.idempotencyKey) {
      const existing = await FamilyVoucher.findOne({ idempotencyKey: req.body.idempotencyKey });
      if (existing) {
        return res.status(200).json({
          success: true,
          data: existing,
          message: 'Payment already processed (idempotent response)'
        });
      }
    }
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Failed to process family payment'
    });
  }
};

/**
 * Record Combined Family Book Payments
 * @route POST /api/families/:id/pay-books
 * @access Private (Admin Only)
 */
const payFamilyBooks = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { bookFeeRecordIds, paymentMethod, idempotencyKey } = req.body;

    if (!idempotencyKey) {
      return res.status(400).json({
        success: false,
        message: 'Idempotency key is required'
      });
    }

    const result = await withTransaction(async (session) => {
      // Idempotency check:
      let existingQuery = FamilyVoucher.findOne({ idempotencyKey });
      if (session) existingQuery = existingQuery.session(session);
      const existingVoucher = await existingQuery;
      if (existingVoucher) {
        return { isExisting: true, voucher: existingVoucher };
      }

      let familyQuery = Family.findById(id);
      if (session) familyQuery = familyQuery.session(session);
      const family = await familyQuery;
      if (!family) {
        const err = new Error('Family not found');
        err.statusCode = 404;
        throw err;
      }

      if (!bookFeeRecordIds || !Array.isArray(bookFeeRecordIds) || bookFeeRecordIds.length === 0) {
        const err = new Error('No book fee records selected for payment');
        err.statusCode = 400;
        throw err;
      }

      // Phase 1: Pre-fetch and validate ALL book fee records
      const familyStudentIds = family.students.map(sId => sId.toString());
      const recordsToUpdate = [];
      const lineItems = [];
      let totalAmount = 0;

      for (const recordId of bookFeeRecordIds) {
        let recordQuery = BookFee.findById(recordId);
        if (session) recordQuery = recordQuery.session(session);
        const record = await recordQuery;
        if (!record) {
          throw new Error(`Book fee record ${recordId} not found`);
        }

        if (!familyStudentIds.includes(record.student.toString())) {
          throw new Error(`Book fee record ${recordId} does not belong to this family`);
        }

        if (record.paymentStatus === 'paid' || record.amount <= (record.amountPaid || 0)) {
          throw new Error(`Book fee record for ${record._id} is already fully paid`);
        }

        const remaining = record.amount - (record.amountPaid || 0);
        totalAmount += remaining;

        let studentQuery = Student.findById(record.student)
          .populate('classId', 'name')
          .populate('sectionId', 'name');
        if (session) studentQuery = studentQuery.session(session);
        const student = await studentQuery;

        const classSec = `${student?.classId?.name || 'N/A'} / ${student?.sectionId?.name || 'N/A'}`;
        const itemTitle = record.items && record.items.length > 0
          ? record.items.map(i => i.title).join(', ')
          : 'Course Books';

        lineItems.push({
          studentId: student?._id || record.student,
          studentName: student?.fullName || 'Student',
          classSection: classSec,
          month: record.academicYear || null,
          title: itemTitle,
          type: 'book',
          amount: remaining,
          bookFeeRecordId: record._id
        });

        recordsToUpdate.push({ record, remaining });
      }

      // Phase 2: Generate sequential voucher number
      const counter = await Counter.findOneAndUpdate(
        { id: 'voucher' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, ...(session && { session }) }
      );
      const voucherNumber = `FRC-${String(counter.seq).padStart(6, '0')}`;

      // Phase 3: Create FamilyVoucher first (atomic lock)
      const newVoucher = new FamilyVoucher({
        familyId: family._id,
        voucherNumber,
        voucherType: 'book',
        idempotencyKey,
        bookFeeRecordIds,
        lineItems,
        totalAmount,
        paymentMethod: paymentMethod || 'cash',
        paymentDate: new Date(),
        createdBy: req.user?.id
      });

      await newVoucher.save(session ? { session } : {});

      // Phase 4: Apply updates to BookFee documents
      for (const { record, remaining } of recordsToUpdate) {
        record.payments.push({
          idempotencyKey: idempotencyKey || undefined,
          receiptNumber: voucherNumber,
          amount: remaining,
          method: paymentMethod || 'cash',
          paidOn: new Date(),
          recordedBy: req.user?.id,
          note: `Family Voucher Payment: ${voucherNumber}`
        });
        record.amountPaid = (record.amountPaid || 0) + remaining;
        record.paymentStatus = 'paid';
        record.paid = true;
        record.paidAt = new Date();

        await record.save(session ? { session } : {});
      }

      return { isExisting: false, voucher: newVoucher };
    });

    if (result.isExisting) {
      return res.status(200).json({
        success: true,
        data: result.voucher,
        message: 'Payment already processed (idempotent response)'
      });
    }

    return res.status(201).json({
      success: true,
      data: result.voucher,
      message: 'Family book payment recorded successfully'
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.idempotencyKey) {
      const existing = await FamilyVoucher.findOne({ idempotencyKey: req.body.idempotencyKey });
      if (existing) {
        return res.status(200).json({
          success: true,
          data: existing,
          message: 'Payment already processed (idempotent response)'
        });
      }
    }
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || 'Failed to process family book payment'
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

    const title = voucher.voucherType === 'book'
      ? 'Family Book Fee Voucher'
      : voucher.voucherType === 'combined'
      ? 'Family Combined Voucher'
      : 'Family Fee Voucher';
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
        const itemLabel = item.title || item.month;
        doc.text(itemLabel, monthColX + 10, currentY + 4, { width: colWidths.month - 10 });
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

/**
 * @desc    Create a family and enroll/create new students or link existing ones
 * @route   POST /api/families/create-with-enrollment
 * @access  Private (Admin Only)
 */
const createFamilyWithEnrollment = async (req, res, next) => {
  const maxRetries = 3;
  let attempt = 0;

  while (true) {
    attempt++;
    try {
      const { familyName, address, members } = req.body;
      const contactInfo = (req.body.contactInfo || req.body.contactNumber || '').trim();

      // Top-level family validation
      if (!familyName) {
        return res.status(400).json({
          success: false,
          message: 'Family name is required',
        });
      }

      if (!contactInfo) {
        return res.status(400).json({
          success: false,
          message: 'Contact info is required',
        });
      }

      if (!members || !Array.isArray(members) || members.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one family member is required',
        });
      }

      const result = await withTransaction(async (session) => {
        const memberErrors = [];
        const existingStudentIds = [];
        const newStudentsToCreate = [];
        
        // First Pass: Structural and field validation for each member
        for (let i = 0; i < members.length; i++) {
          const member = members[i];
          const errors = [];

          if (!member || typeof member !== 'object') {
            errors.push('Invalid member data');
            memberErrors.push({ index: i, errors });
            continue;
          }

          if (member.mode === 'existing') {
            if (!member.studentId) {
              errors.push('Student ID is required for existing student');
            } else if (!mongoose.Types.ObjectId.isValid(member.studentId)) {
              errors.push('Invalid student ID format');
            } else {
              // Check for duplicates in the request itself
              if (existingStudentIds.includes(member.studentId.toString())) {
                errors.push('Duplicate existing student in the same request');
              } else {
                existingStudentIds.push(member.studentId.toString());
              }
            }
          } else if (member.mode === 'new') {
            const { studentData, feeConfig } = member;

            if (!studentData || typeof studentData !== 'object') {
              errors.push('studentData is required for new student');
            } else {
              const name = studentData.name || studentData.fullName;
              const parentName = studentData.parentName || studentData.fatherName;
              const fatherContact = studentData.fatherContact || contactInfo;

              if (!name) errors.push('Student name is required');
              if (!studentData.dateOfBirth) {
                errors.push('Date of birth is required');
              } else {
                const dobDate = new Date(studentData.dateOfBirth);
                if (isNaN(dobDate.getTime())) {
                  errors.push('Invalid date of birth format');
                } else if (dobDate >= new Date()) {
                  errors.push('Date of birth must be in the past');
                }
              }
              if (!studentData.gender) {
                errors.push('Gender is required');
              } else if (!['male', 'female', 'other'].includes(studentData.gender)) {
                errors.push('Gender must be male, female, or other');
              }
              if (!studentData.classId) {
                errors.push('Class ID is required');
              } else if (!mongoose.Types.ObjectId.isValid(studentData.classId)) {
                errors.push('Invalid Class ID format');
              }
              if (!studentData.sectionId) {
                errors.push('Section ID is required');
              } else if (!mongoose.Types.ObjectId.isValid(studentData.sectionId)) {
                errors.push('Invalid Section ID format');
              }
              if (!parentName) errors.push("Parent/Father's name is required");

              // DB Validation for class and section (check existence)
              if (studentData.classId && mongoose.Types.ObjectId.isValid(studentData.classId)) {
                let classQuery = Class.findById(studentData.classId);
                if (session) classQuery = classQuery.session(session);
                const classDoc = await classQuery;
                if (!classDoc) {
                  errors.push(`Class with ID ${studentData.classId} not found`);
                } else if (studentData.sectionId && mongoose.Types.ObjectId.isValid(studentData.sectionId)) {
                  let sectionQuery = Section.findOne({
                    _id: studentData.sectionId,
                    classId: studentData.classId,
                  });
                  if (session) sectionQuery = sectionQuery.session(session);
                  const sectionDoc = await sectionQuery;
                  if (!sectionDoc) {
                    errors.push(`Section with ID ${studentData.sectionId} not found under Class ${classDoc.name}`);
                  }
                }
              }
            }

            if (!feeConfig || typeof feeConfig !== 'object') {
              errors.push('feeConfig is required for new student');
            } else {
              if (feeConfig.monthlyFee === undefined || feeConfig.monthlyFee === null) {
                errors.push('Monthly fee is required');
              } else if (typeof feeConfig.monthlyFee !== 'number' || feeConfig.monthlyFee < 0) {
                errors.push('Monthly fee must be a valid non-negative number');
              }
              if (feeConfig.bookFee !== undefined && feeConfig.bookFee !== null) {
                if (typeof feeConfig.bookFee !== 'number' || feeConfig.bookFee < 0) {
                  errors.push('Book fee must be a valid non-negative number');
                }
                if (feeConfig.bookFee > 0 && !feeConfig.bookFeeDueDate) {
                  errors.push('Book fee due date is required when book fee is specified');
                }
              }
            }
          } else {
            errors.push('Mode must be either "existing" or "new"');
          }

          if (errors.length > 0) {
            memberErrors.push({ index: i, errors });
          }
        }

        // Abort if first pass validations failed
        if (memberErrors.length > 0) {
          const valErr = new Error('Validation failed');
          valErr.statusCode = 400;
          valErr.errors = memberErrors;
          throw valErr;
        }

        // Second Pass: One-family-per-student and Duplicate checking
        for (let i = 0; i < members.length; i++) {
          const member = members[i];
          const errors = [];

          if (member.mode === 'existing') {
            let studentQuery = Student.findById(member.studentId);
            if (session) studentQuery = studentQuery.session(session);
            const student = await studentQuery;
            if (!student) {
              errors.push(`Student with ID ${member.studentId} not found`);
            } else if (student.familyId) {
              let oldFamilyQuery = Family.findById(student.familyId);
              if (session) oldFamilyQuery = oldFamilyQuery.session(session);
              const oldFamily = await oldFamilyQuery;
              const oldFamilyName = oldFamily ? oldFamily.familyName : 'Unknown Family';
              errors.push(`Student ${student.fullName} is already linked to family "${oldFamilyName}"`);
            }
          } else if (member.mode === 'new') {
            const { studentData, feeConfig } = member;
            const name = studentData.name || studentData.fullName;
            const parentName = studentData.parentName || studentData.fatherName;
            const fatherContact = studentData.fatherContact || contactInfo;

            // Check if student already exists in the system (reusing bulk import matcher)
            const isDuplicate = await checkDuplicateStudent(name, studentData.dateOfBirth, fatherContact, session);
            if (isDuplicate) {
              errors.push(`Student "${name}" with matching Date of Birth and Father Contact already exists in the database`);
            }

            // Check within-request duplicates for new students
            const dobStr = new Date(studentData.dateOfBirth).toISOString().split('T')[0];
            const contactClean = fatherContact.toString().replace(/\D/g, '');
            const fingerprint = `${name.trim().toLowerCase()}_${dobStr}_${contactClean}`;

            const isIntraRequestDuplicate = newStudentsToCreate.some(other => {
              const otherName = other.studentData.name || other.studentData.fullName;
              const otherContact = other.studentData.fatherContact || contactInfo;
              const otherDobStr = new Date(other.studentData.dateOfBirth).toISOString().split('T')[0];
              const otherContactClean = otherContact.toString().replace(/\D/g, '');
              const otherFingerprint = `${otherName.trim().toLowerCase()}_${otherDobStr}_${otherContactClean}`;
              return otherFingerprint === fingerprint;
            });

            if (isIntraRequestDuplicate) {
              errors.push(`Duplicate student "${name}" (same DOB and contact) appears multiple times in this request`);
            } else {
              newStudentsToCreate.push(member);
            }
          }

          if (errors.length > 0) {
            memberErrors.push({ index: i, errors });
          }
        }

        // Abort if second pass validations failed
        if (memberErrors.length > 0) {
          const valErr = new Error('Validation failed');
          valErr.statusCode = 400;
          valErr.errors = memberErrors;
          throw valErr;
        }

        // Hash default password once outside student creation loop
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('student123', salt);

        // Create empty family document
        const family = new Family({
          familyName,
          guardianName: members.find(m => m.mode === 'new')?.studentData?.parentName || members.find(m => m.mode === 'new')?.studentData?.fatherName || '',
          contactNumber: contactInfo,
          address,
          students: [],
          createdBy: mongoose.Types.ObjectId.isValid(req.user?.id || req.user?._id) ? (req.user?.id || req.user?._id) : undefined,
        });
        await family.save(session ? { session } : {});

        const createdStudentsResponse = [];
        const combinedStudentIds = [...existingStudentIds];

        // Create new students and set up associations
        for (const member of newStudentsToCreate) {
          const { studentData, feeConfig } = member;
          const name = studentData.name || studentData.fullName;
          const parentName = studentData.parentName || studentData.fatherName;
          const fatherContact = studentData.fatherContact || contactInfo;

          // Atomically reserve registration number inside the transaction session
          const regNumber = await reserveNextRegistrationNumber(session);

          // Create student User account using same role/default password logic as single student path
          await User.insertMany(
            [
              {
                name: name.trim(),
                registrationNumber: regNumber,
                password: hashedPassword,
                role: 'student',
                phone: fatherContact.trim(),
                isActivated: true,
                isActive: true,
              },
            ],
            session ? { session } : {}
          );

          // Insert Student document within transaction
          const newStudent = new Student({
            registrationNumber: regNumber,
            fullName: name.trim(),
            fatherName: parentName.trim(),
            gender: studentData.gender,
            dateOfBirth: new Date(studentData.dateOfBirth),
            fatherContact: fatherContact.trim(),
            address: studentData.address ? studentData.address.trim() : address ? address.trim() : '',
            classId: studentData.classId,
            sectionId: studentData.sectionId,
            customFee: (feeConfig.customFee !== undefined && feeConfig.customFee !== null && feeConfig.customFee !== '') ? Number(feeConfig.customFee) : (feeConfig.monthlyFee ? Number(feeConfig.monthlyFee) : null),
            customFeeNote: feeConfig.customFeeNote || null,
            status: studentData.status || 'active',
            photoUrl: studentData.photoUrl || '',
            familyId: family._id,
          });
          await newStudent.save(session ? { session } : {});

          // Create their initial FeeRecord via shared studentFeeService
          await studentFeeService.getOrCreateCurrentMonthRecord(newStudent._id, session);

          // Create BookFee record if bookFee > 0
          if (feeConfig.bookFee && feeConfig.bookFee > 0) {
            let settingsQuery = Settings.findOne({ schoolId: 'default' });
            if (session) settingsQuery = settingsQuery.session(session);
            const settingsDoc = await settingsQuery;
            const bookFeeDoc = new BookFee({
              student: newStudent._id,
              classId: newStudent.classId || studentData.classId || null,
              academicYear: settingsDoc?.currentSession || null,
              amount: feeConfig.bookFee,
              amountPaid: 0,
              dueDate: feeConfig.bookFeeDueDate ? new Date(feeConfig.bookFeeDueDate) : undefined,
              paid: false,
              paymentStatus: 'pending',
              deliveryStatus: 'pending',
              items: [],
              payments: []
            });
            await bookFeeDoc.save(session ? { session } : {});
          }

          combinedStudentIds.push(newStudent._id.toString());
          createdStudentsResponse.push({
            studentId: newStudent._id,
            regNumber,
            name,
          });
        }

        // Set familyIds on existing students and verify they are not already claimed
        for (const studentId of existingStudentIds) {
          let studentQuery = Student.findById(studentId);
          if (session) studentQuery = studentQuery.session(session);
          const student = await studentQuery;
          if (student.familyId && student.familyId.toString() !== family._id.toString()) {
            throw new Error(`Student ${student.fullName} is already linked to another family`);
          }
          student.familyId = family._id;
          await student.save(session ? { session } : {});
        }

        // Save student list back to family
        family.students = combinedStudentIds;
        if (!family.guardianName && existingStudentIds.length > 0) {
          let firstQuery = Student.findById(existingStudentIds[0]);
          if (session) firstQuery = firstQuery.session(session);
          const firstExisting = await firstQuery;
          family.guardianName = firstExisting ? firstExisting.fatherName : '';
        }
        await family.save(session ? { session } : {});

        // Fetch final populated family for the response
        let finalQuery = Family.findById(family._id).populate('students', 'fullName registrationNumber classId sectionId');
        if (session) finalQuery = finalQuery.session(session);
        const populatedFamily = await finalQuery;

        return {
          family: populatedFamily,
          createdStudents: createdStudentsResponse,
        };
      });

      return res.status(201).json({
        success: true,
        family: result.family,
        createdStudents: result.createdStudents,
      });
    } catch (error) {
      const isTransient = error.errorLabels?.includes('TransientTransactionError') ||
                          error.message?.includes('WriteConflict') ||
                          error.message?.includes('retry your operation');

      if (isTransient && attempt < maxRetries) {
        console.log(`[TRANSACTION RETRY] Attempt ${attempt} failed due to write conflict / transient error. Retrying...`);
        // Wait random backoff and retry
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 10));
        continue;
      }

      if (error.errors) {
        return res.status(error.statusCode || 400).json({
          success: false,
          message: error.message || 'Validation failed',
          errors: error.errors,
        });
      }

      // Send error message if standard Mongoose Validation or unique index error is raised
      if (error.code === 11000 || (error.writeErrors && error.writeErrors.some(e => e.code === 11000))) {
        let fieldName = '';
        let offendingValue = '';

        if (error.keyPattern && error.keyValue) {
          fieldName = Object.keys(error.keyPattern).join(', ');
          offendingValue = Object.values(error.keyValue).join(', ');
        } else if (error.writeErrors && error.writeErrors.length > 0) {
          const firstErr = error.writeErrors.find(e => e.code === 11000) || error.writeErrors[0];
          const nestedErr = firstErr.err || {};
          if (nestedErr.keyPattern && nestedErr.keyValue) {
            fieldName = Object.keys(nestedErr.keyPattern).join(', ');
            offendingValue = Object.values(nestedErr.keyValue).join(', ');
          } else if (firstErr.errmsg) {
            const match = firstErr.errmsg.match(/index:\s+(\w+)_?\d*\s+dup key:\s+\{\s*([^:]+):\s*"?([^"}]+)"?\s*\}/);
            if (match) {
              fieldName = match[1];
              offendingValue = match[3];
            } else {
              const simpleMatch = firstErr.errmsg.match(/dup key:\s+({[^}]+})/);
              if (simpleMatch) {
                offendingValue = simpleMatch[1];
              }
            }
          }
        }

        if (!fieldName) {
          fieldName = 'unknown_field';
        }
        if (!offendingValue) {
          offendingValue = 'unknown_value';
        }

        return res.status(400).json({
          success: false,
          message: `A unique constraint failed on field '${fieldName}' (value: ${offendingValue}). Request rolled back completely.`,
        });
      }

      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message || 'Failed to create family with enrollment',
      });
    }
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
  payFamilyBooks,
  generateFamilyVoucherPDF,
  createFamilyWithEnrollment
};
