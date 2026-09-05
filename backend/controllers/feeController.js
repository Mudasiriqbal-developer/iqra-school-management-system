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
    const searchVal = req.query.search ? req.query.search.trim() : '';

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let studentQuery = { status: 'active' };
    if (searchVal) {
      studentQuery.$or = [
        { fullName: { $regex: searchVal, $options: 'i' } },
        { registrationNumber: { $regex: searchVal, $options: 'i' } }
      ];
    }
    const activeStudents = await Student.find(studentQuery).select('_id');
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
          metadata: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                totalBilled: { $sum: '$amountDue' },
                totalCollected: { $sum: '$amountPaid' },
                totalRemaining: {
                  $sum: {
                    $cond: {
                      if: { $gt: ['$amountDue', '$amountPaid'] },
                      then: { $subtract: ['$amountDue', '$amountPaid'] },
                      else: 0
                    }
                  }
                }
              }
            }
          ],
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
    const meta = results[0]?.metadata?.[0] || {
      total: 0,
      totalBilled: 0,
      totalCollected: 0,
      totalRemaining: 0
    };
    const total = meta.total || 0;
    const records = results[0]?.data || [];

    const students = records.map(r => {
      return {
        studentId: r.studentId,
        name: r.studentInfo?.fullName || 'Unknown Student',
        registrationNumber: r.studentInfo?.registrationNumber || 'N/A',
        class: r.classInfo?.name || 'N/A',
        section: r.sectionInfo?.name || 'N/A',
        amountPaid: r.amountPaid || 0,
        totalDue: r.amountDue || 0,
        remainingDue: Math.max(0, (r.amountDue || 0) - (r.amountPaid || 0)),
        lastPaymentDate: r.lastPaymentDate
      };
    });

    const pages = Math.ceil(total / limitVal) || 1;

    return res.status(200).json({
      success: true,
      data: {
        students,
        total,
        summary: {
          totalStudents: total,
          totalBilled: meta.totalBilled || 0,
          totalCollected: meta.totalCollected || 0,
          totalRemaining: meta.totalRemaining || 0
        },
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
    const searchVal = req.query.search ? req.query.search.trim() : '';

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let studentQuery = { status: 'active' };
    if (searchVal) {
      studentQuery.$or = [
        { fullName: { $regex: searchVal, $options: 'i' } },
        { registrationNumber: { $regex: searchVal, $options: 'i' } }
      ];
    }
    const activeStudents = await Student.find(studentQuery).select('_id');
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
          metadata: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                totalBilled: { $sum: '$amountDue' },
                totalCollected: { $sum: '$amountPaid' },
                totalRemaining: { $sum: '$remainingDue' }
              }
            }
          ],
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
    const meta = results[0]?.metadata?.[0] || {
      total: 0,
      totalBilled: 0,
      totalCollected: 0,
      totalRemaining: 0
    };
    const total = meta.total || 0;
    const records = results[0]?.data || [];

    const students = records.map(r => {
      return {
        studentId: r.studentId,
        name: r.studentInfo?.fullName || 'Unknown Student',
        registrationNumber: r.studentInfo?.registrationNumber || 'N/A',
        class: r.classInfo?.name || 'N/A',
        section: r.sectionInfo?.name || 'N/A',
        totalDue: r.amountDue || 0,
        amountPaid: r.amountPaid || 0,
        remainingDue: r.remainingDue || 0,
        lastPaymentDate: r.lastPaymentDate
      };
    });

    const pages = Math.ceil(total / limitVal) || 1;

    return res.status(200).json({
      success: true,
      data: {
        students,
        total,
        summary: {
          totalStudents: total,
          totalBilled: meta.totalBilled || 0,
          totalCollected: meta.totalCollected || 0,
          totalRemaining: meta.totalRemaining || 0
        },
        page: pageVal,
        pages
      },
      message: 'Partial students fetched successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Export fee drilldown list as PDF audit report
 * @route   GET /api/fees/drilldown/export-pdf
 * @access  Private (Admin Only)
 */
const exportDrillDownPDF = async (req, res, next) => {
  try {
    const { type, search } = req.query; // 'collected' or 'partial'
    const isCollected = type === 'collected';
    const searchVal = search ? search.trim() : '';

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let studentQuery = { status: 'active' };
    if (searchVal) {
      studentQuery.$or = [
        { fullName: { $regex: searchVal, $options: 'i' } },
        { registrationNumber: { $regex: searchVal, $options: 'i' } }
      ];
    }
    const activeStudents = await Student.find(studentQuery).select('_id');
    const activeStudentIds = activeStudents.map(s => s._id);

    const matchQuery = {
      studentId: { $in: activeStudentIds },
      month: currentMonth,
      type: 'monthly'
    };

    if (isCollected) {
      matchQuery.amountPaid = { $gt: 0 };
    } else {
      matchQuery.status = 'partial';
    }

    const records = await FeeRecord.find(matchQuery)
      .populate({
        path: 'studentId',
        select: 'fullName registrationNumber fatherName classId sectionId',
        populate: [
          { path: 'classId', select: 'name' },
          { path: 'sectionId', select: 'name' }
        ]
      })
      .sort(isCollected ? { updatedAt: -1 } : { amountDue: -1 });

    const PDFDocument = require('pdfkit');
    const { drawBrandedHeader, drawFooter, addPageNumbers } = require('../utils/pdfHelper');
    const Settings = require('../models/Settings');

    const settings = await Settings.findOne({ schoolId: 'default' }).catch(() => null);

    const reportTitle = isCollected ? 'Collected Fees Audit Report' : 'Partial Payments Dues Report';
    const filename = isCollected ? `collected-fees-${currentMonth}.pdf` : `partial-dues-${currentMonth}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({
      margins: { top: 125, bottom: 60, left: 50, right: 50 },
      bufferPages: true
    });
    doc.pipe(res);

    const subtitleStr = `Period: ${currentMonth} ${searchVal ? `| Filter: "${searchVal}"` : '| All Active Records'}`;

    // Draw first page header/footer
    drawBrandedHeader(doc, reportTitle, subtitleStr, settings);
    drawFooter(doc);

    doc.on('pageAdded', () => {
      drawBrandedHeader(doc, reportTitle, subtitleStr, settings);
      doc.y = 125;
      drawFooter(doc);
    });

    let currentY = 125;

    // Quick Financial Ribbon Summary Box
    let totalBilled = 0;
    let totalCollected = 0;
    let totalRemaining = 0;

    records.forEach(r => {
      totalBilled += (r.amountDue || 0);
      totalCollected += (r.amountPaid || 0);
      totalRemaining += Math.max(0, (r.amountDue || 0) - (r.amountPaid || 0));
    });

    doc.save();
    doc.rect(50, currentY, 512, 45).fillAndStroke('#F8FAFC', '#CBD5E1');
    doc.fillColor('#00215E').font('Helvetica-Bold').fontSize(8.5);

    doc.text('Total Students:', 65, currentY + 12);
    doc.font('Helvetica').fillColor('#1E293B').text(`${records.length} Student(s)`, 135, currentY + 12);

    doc.font('Helvetica-Bold').fillColor('#00215E').text('Total Billed:', 65, currentY + 26);
    doc.font('Helvetica').fillColor('#1E293B').text(`Rs. ${totalBilled.toLocaleString()}`, 135, currentY + 26);

    doc.font('Helvetica-Bold').fillColor('#00215E').text('Total Collected:', 225, currentY + 12);
    doc.font('Helvetica').fillColor('#166534').text(`Rs. ${totalCollected.toLocaleString()}`, 305, currentY + 12);

    doc.font('Helvetica-Bold').fillColor('#00215E').text('Total Remaining:', 225, currentY + 26);
    doc.font('Helvetica').fillColor('#DC2626').text(`Rs. ${totalRemaining.toLocaleString()}`, 305, currentY + 26);

    doc.font('Helvetica-Bold').fillColor('#00215E').text('Audit Period:', 405, currentY + 12);
    doc.font('Helvetica').fillColor('#475569').text(currentMonth, 465, currentY + 12);

    doc.restore();

    currentY += 58;

    // Table Header
    doc.save();
    doc.rect(50, currentY, 512, 22).fill('#00215E');
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8);

    doc.text('Reg No', 55, currentY + 7, { width: 65 });
    doc.text('Student Name', 125, currentY + 7, { width: 120 });
    doc.text('Class / Sec', 250, currentY + 7, { width: 75 });
    doc.text('Amount Due', 330, currentY + 7, { width: 70, align: 'right' });
    doc.text('Amount Paid', 405, currentY + 7, { width: 70, align: 'right' });
    doc.text('Remaining', 480, currentY + 7, { width: 75, align: 'right' });
    doc.restore();

    let yPosition = currentY + 26;

    records.forEach((r, idx) => {
      const rowHeight = 20;
      if (yPosition + rowHeight > 700) {
        doc.addPage();
        yPosition = 125;
        doc.save();
        doc.rect(50, yPosition, 512, 22).fill('#00215E');
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8);
        doc.text('Reg No', 55, yPosition + 7, { width: 65 });
        doc.text('Student Name', 125, yPosition + 7, { width: 120 });
        doc.text('Class / Sec', 250, yPosition + 7, { width: 75 });
        doc.text('Amount Due', 330, yPosition + 7, { width: 70, align: 'right' });
        doc.text('Amount Paid', 405, yPosition + 7, { width: 70, align: 'right' });
        doc.text('Remaining', 480, yPosition + 7, { width: 75, align: 'right' });
        doc.restore();
        yPosition += 26;
      }

      if (idx % 2 === 1) {
        doc.save();
        doc.rect(50, yPosition - 3, 512, rowHeight).fill('#F8FAFC');
        doc.restore();
      }

      const st = r.studentId || {};
      const regNo = (st.registrationNumber || 'N/A').toUpperCase();
      const name = st.fullName || 'Unknown';
      const clsName = st.classId?.name || 'N/A';
      const secName = st.sectionId?.name || 'N/A';
      const due = r.amountDue || 0;
      const paid = r.amountPaid || 0;
      const rem = Math.max(0, due - paid);

      doc.fillColor('#334155').font('Helvetica').fontSize(8);
      doc.text(regNo, 55, yPosition, { width: 65, lineBreak: false });
      doc.font('Helvetica-Bold').fillColor('#0F172A').text(name, 125, yPosition, { width: 120, lineBreak: false });
      doc.font('Helvetica').fillColor('#64748B').text(`${clsName} - ${secName}`, 250, yPosition, { width: 75, lineBreak: false });
      doc.fillColor('#334155').text(`Rs. ${due.toLocaleString()}`, 330, yPosition, { width: 70, align: 'right' });
      doc.fillColor('#166534').text(`Rs. ${paid.toLocaleString()}`, 405, yPosition, { width: 70, align: 'right' });
      doc.fillColor(rem > 0 ? '#DC2626' : '#64748B').font(rem > 0 ? 'Helvetica-Bold' : 'Helvetica').text(`Rs. ${rem.toLocaleString()}`, 480, yPosition, { width: 75, align: 'right' });

      yPosition += rowHeight;
    });

    addPageNumbers(doc);
    doc.end();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFeeSummary,
  getCollectedStudents,
  getPartialStudents,
  exportDrillDownPDF
};
