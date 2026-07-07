const Student = require('../models/Student');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Expense = require('../models/Expense');
const Payroll = require('../models/Payroll');

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
    const feeData = await Student.aggregate([
      { $match: { status: 'active' } },
      {
        $project: {
          amountPaid: { $ifNull: ["$feeInfo.amountPaid", 0] },
          amountDue: { $ifNull: ["$feeInfo.amountDue", 0] },
          outstanding: {
            $cond: {
              if: { $gt: ["$feeInfo.amountDue", "$feeInfo.amountPaid"] },
              then: { $subtract: ["$feeInfo.amountDue", "$feeInfo.amountPaid"] },
              else: 0
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          totalCollected: { $sum: "$amountPaid" },
          totalOutstanding: { $sum: "$outstanding" }
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

    return res.status(200).json({
      success: true,
      data: {
        totalStudents,
        totalTeachers,
        feesSummary,
        attendanceToday,
        monthlyAttendanceTrend,
        financialSummary,
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
