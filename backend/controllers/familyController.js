const mongoose = require('mongoose');
const Family = require('../models/Family');
const Student = require('../models/Student');
const FeeRecord = require('../models/FeeRecord');
const User = require('../models/User');

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

    return res.status(200).json({
      success: true,
      data: family,
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
 * Placeholder for Phase 2: Combined Fee Summary
 */
const getFamilyFeeSummary = async (req, res, next) => {
  return res.status(501).json({ success: false, message: 'Fee aggregation not implemented yet.' });
};

/**
 * Placeholder for Phase 2: Books Outstanding Summary
 */
const getFamilyBooksSummary = async (req, res, next) => {
  return res.status(501).json({ success: false, message: 'Books aggregation not implemented yet.' });
};

/**
 * Placeholder for Phase 3: Combined Payments
 */
const payFamilyFees = async (req, res, next) => {
  return res.status(501).json({ success: false, message: 'Family payment not implemented yet.' });
};

/**
 * Placeholder for Phase 4: Generate Combined PDF Voucher
 */
const generateFamilyVoucherPDF = async (req, res, next) => {
  return res.status(501).json({ success: false, message: 'Family PDF voucher not implemented yet.' });
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
