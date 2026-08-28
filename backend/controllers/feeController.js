const Student = require('../models/Student');
const FeeRecord = require('../models/FeeRecord');
const Expense = require('../models/Expense');
const Payroll = require('../models/Payroll');
const { resolveStudentMonthlyFee } = require('../utils/feeHelper');

// Helper to bulk generate current month fee records for active students
const ensureCurrentMonthRecords = async (currentMonth) => {
  const activeStudents = await Student.find({ status: 'active' }).populate('classId', 'defaultFee');
  const existingRecords = await FeeRecord.find({ month: currentMonth, type: 'monthly' }, 'studentId');
  const existingStudentIds = new Set(existingRecords.map(r => r.studentId.toString()));

  const recordsToCreate = [];
  for (const student of activeStudents) {
    if (!existingStudentIds.has(student._id.toString())) {
      recordsToCreate.push({
        studentId: student._id,
        month: currentMonth,
        amountDue: resolveStudentMonthlyFee(student),
        amountPaid: 0,
        status: 'pending',
        payments: [],
        type: 'monthly'
      });
    }
  }

  if (recordsToCreate.length > 0) {
    try {
      // Use ordered: false so duplicate keys don't block the rest of the batch
      await FeeRecord.insertMany(recordsToCreate, { ordered: false });
    } catch (error) {
      const isBulkDuplicateError = error.name === 'MongoBulkWriteError' || error.code === 11000;
      if (!isBulkDuplicateError) {
        throw error;
      }
      // Log/ignore duplicate keys as some records might have been created concurrently
    }
  }
};

/**
 * @desc    Get fee summary metrics
 * @route   GET /api/fees/summary
 * @access  Private (Admin Only)
 */
const getFeeSummary = async (req, res, next) => {
  try {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Ensure fee records are generated for all active students in bulk
    await ensureCurrentMonthRecords(currentMonth);

    // 1. Total Active Students
    const totalStudents = await Student.countDocuments({ status: 'active' });

    // 2. Aggregate current month's fee records for active students
    const activeStudents = await Student.find({ status: 'active' }).select('_id');
    const activeStudentIds = activeStudents.map(s => s._id);

    const feeAgg = await FeeRecord.aggregate([
      {
        $match: {
          studentId: { $in: activeStudentIds },
          month: currentMonth,
          type: 'monthly'
        }
      },
      {
        $group: {
          _id: null,
          totalFeeExpected: { $sum: '$amountDue' },
          totalCollected: { $sum: '$amountPaid' },
          partialAmount: {
            $sum: {
              $cond: {
                if: { $eq: ['$status', 'partial'] },
                then: { $subtract: ['$amountDue', '$amountPaid'] },
                else: 0
              }
            }
          },
          partialCount: {
            $sum: {
              $cond: {
                if: { $eq: ['$status', 'partial'] },
                then: 1,
                else: 0
              }
            }
          }
        }
      }
    ]);

    const totalFeeExpected = feeAgg.length > 0 ? (feeAgg[0].totalFeeExpected || 0) : 0;
    const totalCollected = feeAgg.length > 0 ? (feeAgg[0].totalCollected || 0) : 0;
    const partialAmount = feeAgg.length > 0 ? (feeAgg[0].partialAmount || 0) : 0;
    const partialCount = feeAgg.length > 0 ? (feeAgg[0].partialCount || 0) : 0;

    // 3. Net P&L Calculations (fees collected minus expenses, as currently calculated)
    const expenseAgg = await Expense.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalExpensesOut = expenseAgg.length > 0 ? (expenseAgg[0].total || 0) : 0;

    const payrollAgg = await Payroll.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$netSalary' } } },
    ]);
    const totalPayrollOut = payrollAgg.length > 0 ? (payrollAgg[0].total || 0) : 0;

    const totalSpent = totalExpensesOut + totalPayrollOut;
    const netPL = totalCollected - totalSpent;

    return res.status(200).json({
      success: true,
      data: {
        totalStudents,
        totalFeeExpected,
        totalCollected,
        partialAmount,
        partialCount,
        netPL
      },
      message: 'Fee summary fetched successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get collected fee students
 * @route   GET /api/fees/collected-students
 * @access  Private (Admin Only)
 */
const getCollectedStudents = async (req, res, next) => {
  try {
    const pageVal = parseInt(req.query.page, 10) || 1;
    const limitVal = parseInt(req.query.limit, 10) || 10;
    const skipVal = (pageVal - 1) * limitVal;

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const activeStudents = await Student.find({ status: 'active' }).select('_id');
    const activeStudentIds = activeStudents.map(s => s._id);

    const pipeline = [
      {
        $match: {
          studentId: { $in: activeStudentIds },
          month: currentMonth,
          type: 'monthly',
          amountPaid: { $gt: 0 }
        }
      },
      {
        $addFields: {
          lastPaymentDate: {
            $cond: {
              if: { $gt: [{ $size: '$payments' }, 0] },
              then: { $max: '$payments.paidOn' },
              else: '$updatedAt'
            }
          }
        }
      },
      {
        $sort: { lastPaymentDate: -1 }
      },
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [
            { $skip: skipVal },
            { $limit: limitVal },
            {
              $lookup: {
                from: 'students',
                localField: 'studentId',
                foreignField: '_id',
                as: 'studentInfo'
              }
            },
            { $unwind: '$studentInfo' },
            {
              $lookup: {
                from: 'classes',
                localField: 'studentInfo.classId',
                foreignField: '_id',
                as: 'classInfo'
              }
            },
            { $unwind: { path: '$classInfo', preserveNullAndEmptyArrays: true } },
            {
              $lookup: {
                from: 'sections',
                localField: 'studentInfo.sectionId',
                foreignField: '_id',
                as: 'sectionInfo'
              }
            },
            { $unwind: { path: '$sectionInfo', preserveNullAndEmptyArrays: true } }
          ]
        }
      }
    ];

    const results = await FeeRecord.aggregate(pipeline);
    const total = results[0]?.metadata[0]?.total || 0;
    const records = results[0]?.data || [];

    const students = records.map(r => {
      return {
        studentId: r.studentId,
        name: r.studentInfo?.fullName || 'Unknown Student',
        class: r.classInfo?.name || 'N/A',
        section: r.sectionInfo?.name || 'N/A',
        amountPaid: r.amountPaid,
        totalDue: r.amountDue,
        lastPaymentDate: r.lastPaymentDate
      };
    });

    const pages = Math.ceil(total / limitVal);

    return res.status(200).json({
      success: true,
      data: {
        students,
        total,
        page: pageVal,
        pages
      },
      message: 'Collected students fetched successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get partial payment students
 * @route   GET /api/fees/partial-students
 * @access  Private (Admin Only)
 */
const getPartialStudents = async (req, res, next) => {
  try {
    const pageVal = parseInt(req.query.page, 10) || 1;
    const limitVal = parseInt(req.query.limit, 10) || 10;
    const skipVal = (pageVal - 1) * limitVal;

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const activeStudents = await Student.find({ status: 'active' }).select('_id');
    const activeStudentIds = activeStudents.map(s => s._id);

    const pipeline = [
      {
        $match: {
          studentId: { $in: activeStudentIds },
          month: currentMonth,
          type: 'monthly',
          status: 'partial'
        }
      },
      {
        $addFields: {
          remainingDue: { $subtract: ['$amountDue', '$amountPaid'] },
          lastPaymentDate: {
            $cond: {
              if: { $gt: [{ $size: '$payments' }, 0] },
              then: { $max: '$payments.paidOn' },
              else: null
            }
          }
        }
      },
      {
        $sort: { remainingDue: -1 }
      },
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [
            { $skip: skipVal },
            { $limit: limitVal },
            {
              $lookup: {
                from: 'students',
                localField: 'studentId',
                foreignField: '_id',
                as: 'studentInfo'
              }
            },
            { $unwind: '$studentInfo' },
            {
              $lookup: {
                from: 'classes',
                localField: 'studentInfo.classId',
                foreignField: '_id',
                as: 'classInfo'
              }
            },
            { $unwind: { path: '$classInfo', preserveNullAndEmptyArrays: true } },
            {
              $lookup: {
                from: 'sections',
                localField: 'studentInfo.sectionId',
                foreignField: '_id',
                as: 'sectionInfo'
              }
            },
            { $unwind: { path: '$sectionInfo', preserveNullAndEmptyArrays: true } }
          ]
        }
      }
    ];

    const results = await FeeRecord.aggregate(pipeline);
    const total = results[0]?.metadata[0]?.total || 0;
    const records = results[0]?.data || [];

    const students = records.map(r => {
      return {
        studentId: r.studentId,
        name: r.studentInfo?.fullName || 'Unknown Student',
        class: r.classInfo?.name || 'N/A',
        section: r.sectionInfo?.name || 'N/A',
        totalDue: r.amountDue,
        amountPaid: r.amountPaid,
        remainingDue: r.remainingDue,
        lastPaymentDate: r.lastPaymentDate
      };
    });

    const pages = Math.ceil(total / limitVal);

    return res.status(200).json({
      success: true,
      data: {
        students,
        total,
        page: pageVal,
        pages
      },
      message: 'Partial students fetched successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFeeSummary,
  getCollectedStudents,
  getPartialStudents
};
