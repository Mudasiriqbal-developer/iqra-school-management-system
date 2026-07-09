const Student = require('../models/Student');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Expense = require('../models/Expense');
const Payroll = require('../models/Payroll');
const Teacher = require('../models/Teacher');

/**
 * @desc    Get dashboard summary statistics
 * @route   GET /api/dashboard/summary
 * @access  Private (Admin Only)
 */
const getDashboardSummary = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Total Active Students
    const totalStudents = await Student.countDocuments({ status: 'active' });

    // 2. Total Active Teachers (Users with role='teacher' and isActive=true)
    const totalTeachers = await User.countDocuments({ role: 'teacher', isActive: true });

    // 3. Fees Summary for Active Students
    const FeeRecord = require('../models/FeeRecord');
    const currentMonth = new Date().toISOString().slice(0, 7);

    const feeData = await Student.aggregate([
      { $match: { status: 'active' } },
      {
        $lookup: {
          from: 'feerecords',
          let: { studentId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$studentId', '$$studentId'] },
                    { $eq: ['$month', currentMonth] }
                  ]
                }
              }
            }
          ],
          as: 'currentFee'
        }
      },
      {
        $project: {
          amountPaid: {
            $cond: {
              if: { $gt: [{ $size: '$currentFee' }, 0] },
              then: { $arrayElemAt: ['$currentFee.amountPaid', 0] },
              else: 0
            }
          },
          amountDue: {
            $cond: {
              if: { $gt: [{ $size: '$currentFee' }, 0] },
              then: { $arrayElemAt: ['$currentFee.amountDue', 0] },
              else: { $ifNull: ['$monthlyFeeAmount', 0] }
            }
          }
        }
      },
      {
        $project: {
          amountPaid: 1,
          amountDue: 1,
          outstanding: {
            $cond: {
              if: { $gt: ['$amountDue', '$amountPaid'] },
              then: { $subtract: ['$amountDue', '$amountPaid'] },
              else: 0
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          totalCollected: { $sum: '$amountPaid' },
          totalOutstanding: { $sum: '$outstanding' }
        }
      }
    ]);

    const totalCollected = feeData.length > 0 ? (feeData[0].totalCollected || 0) : 0;
    const totalOutstanding = feeData.length > 0 ? (feeData[0].totalOutstanding || 0) : 0;
    const totalFees = totalCollected + totalOutstanding;
    const collectionPercentage = totalFees > 0 ? Math.round((totalCollected / totalFees) * 100) : 0;

    const feesSummary = {
      totalCollected,
      totalOutstanding,
      collectionPercentage
    };

    // 4. Attendance Today
    const todayStr = today.toISOString().split('T')[0];
    const todayAttendance = await Attendance.findOne({ date: todayStr });

    let attendanceToday = {
      date: todayStr,
      totalMarked: 0,
      presentPercentage: 0,
      noDataYet: true
    };

    if (todayAttendance && todayAttendance.records.length > 0) {
      const total = todayAttendance.records.length;
      const present = todayAttendance.records.filter(r => r.status === 'present' || r.status === 'late').length;
      attendanceToday = {
        date: todayStr,
        totalMarked: total,
        presentPercentage: total > 0 ? Math.round((present / total) * 100) : 0,
        noDataYet: false
      };
    }

    // 5. Monthly Attendance Trend (last 6 months, ending with current month)
    const monthlyAttendanceTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1); // Set to 1st of the month to prevent day overflow issues
      d.setMonth(today.getMonth() - i);
      const monthName = d.toLocaleString('default', { month: 'short' });
      const year = d.getFullYear();

      const startOfMonth = new Date(year, d.getMonth(), 1);
      const endOfMonth = new Date(year, d.getMonth() + 1, 0);

      const startStr = startOfMonth.toISOString().split('T')[0];
      const endStr = endOfMonth.toISOString().split('T')[0];

      const records = await Attendance.find({
        date: { $gte: startStr, $lte: endStr }
      });

      let totalPresent = 0;
      let totalCount = 0;

      records.forEach(day => {
        if (day.records) {
          day.records.forEach(r => {
            totalCount++;
            if (r.status === 'present' || r.status === 'late') {
              totalPresent++;
            }
          });
        }
      });

      const averageAttendancePercentage = totalCount > 0
        ? Math.round((totalPresent / totalCount) * 100)
        : 0;

      monthlyAttendanceTrend.push({
        month: monthName,
        year: year,
        averageAttendancePercentage
      });
    }

    // 6. Financial Profit & Loss Calculations
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
    const netProfit = totalCollected - totalSpent;
    const profitMargin = totalCollected > 0 ? Math.round((netProfit / totalCollected) * 100) : 0;

    const financialSummary = {
      totalIncome: totalCollected,
      totalExpenses: totalSpent,
      netProfit,
      profitMargin,
    };

    // 7. Recent Registrations
    const recentStudents = await Student.find()
      .sort({ createdAt: -1 })
      .limit(5);

    const recentTeachers = await Teacher.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('userId', 'name email role isActive isActivated');

    const combinedRegistrations = [];

    recentStudents.forEach(student => {
      let status = 'active';
      if (student.status === 'on_leave') status = 'pending';
      else if (student.status === 'suspended') status = 'danger';

      combinedRegistrations.push({
        id: student.registrationNumber,
        name: student.fullName,
        role: 'Student',
        date: student.createdAt,
        status
      });
    });

    recentTeachers.forEach(teacher => {
      let status = 'active';
      if (teacher.userId) {
        if (!teacher.userId.isActivated) status = 'pending';
        else if (!teacher.userId.isActive) status = 'danger';
      }
      combinedRegistrations.push({
        id: teacher.employeeId,
        name: teacher.userId ? teacher.userId.name : 'Unknown Teacher',
        role: 'Teacher',
        date: teacher.createdAt,
        status
      });
    });

    combinedRegistrations.sort((a, b) => new Date(b.date) - new Date(a.date));
    const recentRegistrations = combinedRegistrations.slice(0, 5);

    return res.status(200).json({
      success: true,
      data: {
        totalStudents,
        totalTeachers,
        feesSummary,
        attendanceToday,
        monthlyAttendanceTrend,
        financialSummary,
        recentRegistrations,
      },
      message: 'Dashboard summary retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardSummary
};
