const Payroll = require('../models/Payroll');
const Teacher = require('../models/Teacher');
const User = require('../models/User');

/**
 * @desc    Get payroll status and summary of all active teachers for a specific month
 * @route   GET /api/payroll
 * @access  Private (Admin Only)
 */
const getMonthlyPayrollOverview = async (req, res, next) => {
  try {
    const { month } = req.query; // format "YYYY-MM" (e.g. "2026-07")
    if (!month) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Month query parameter in YYYY-MM format is required',
      });
    }

    // 1. Fetch all teachers that are active in the system
    const teachers = await Teacher.find()
      .populate({
        path: 'userId',
        match: { isActive: true },
        select: 'name email phone isActive',
      });

    // Filter out teachers where user account is deactivated
    const activeTeachers = teachers.filter((t) => t.userId !== null);

    // 2. Fetch existing payroll logs for this month
    const monthlyPayrolls = await Payroll.find({ month });

    // Create a map of teacherId -> payroll document
    const payrollMap = {};
    monthlyPayrolls.forEach((p) => {
      payrollMap[p.teacherId.toString()] = p;
    });

    // 3. Compile rosters & summaries
    let totalPayrollAmount = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let paidCount = 0;
    let pendingCount = 0;

    const roster = activeTeachers.map((teacher) => {
      const existingPayroll = payrollMap[teacher._id.toString()];
      const baseSalary = teacher.baseSalary || 0;
      
      const record = {
        teacherId: teacher._id,
        employeeId: teacher.employeeId,
        fullName: teacher.userId.name,
        email: teacher.userId.email,
        qualification: teacher.qualification,
        joiningDate: teacher.joiningDate,
        baseSalary,
        payrollRecord: null,
      };

      if (existingPayroll) {
        record.payrollRecord = existingPayroll;
        totalPayrollAmount += existingPayroll.netSalary;
        if (existingPayroll.status === 'paid') {
          totalPaid += existingPayroll.netSalary;
          paidCount++;
        } else {
          totalPending += existingPayroll.netSalary;
          pendingCount++;
        }
      } else {
        // Virtual pending payroll detail
        record.payrollRecord = {
          _id: null,
          teacherId: teacher._id,
          month,
          baseSalary,
          allowances: 0,
          deductions: 0,
          netSalary: baseSalary,
          status: 'pending',
          paymentMethod: 'cash',
        };
        totalPayrollAmount += baseSalary;
        totalPending += baseSalary;
        pendingCount++;
      }

      return record;
    });

    return res.status(200).json({
      success: true,
      data: {
        roster,
        summary: {
          month,
          totalTeachers: activeTeachers.length,
          totalPayrollAmount,
          totalPaid,
          totalPending,
          paidCount,
          pendingCount,
        },
      },
      message: 'Monthly payroll overview fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Process / record a teacher salary payout for a given month
 * @route   POST /api/payroll
 * @access  Private (Admin Only)
 */
const processSalaryPayout = async (req, res, next) => {
  try {
    const { teacherId, month, allowances = 0, deductions = 0, paymentMethod = 'cash', status = 'paid' } = req.body;

    if (!teacherId || !month) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Teacher ID and Month (YYYY-MM) are required',
      });
    }

    // Validate teacher exists
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Teacher not found',
      });
    }

    const baseSalary = teacher.baseSalary || 0;
    const netSalary = baseSalary + Number(allowances) - Number(deductions);

    if (netSalary < 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Deductions cannot exceed the sum of base salary and allowances (Net salary cannot be negative)',
      });
    }

    const updateFields = {
      baseSalary,
      allowances: Number(allowances),
      deductions: Number(deductions),
      netSalary,
      status,
      paymentMethod,
    };

    if (status === 'paid') {
      updateFields.paidOn = new Date();
    } else {
      updateFields.paidOn = null;
    }

    // Find and update if exists, otherwise create new
    const payroll = await Payroll.findOneAndUpdate(
      { teacherId, month },
      updateFields,
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      data: payroll,
      message: status === 'paid' ? 'Salary payout processed successfully' : 'Salary record saved as pending',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get payout history of a specific teacher
 * @route   GET /api/payroll/history/:teacherId
 * @access  Private (Admin Only)
 */
const getTeacherPayrollHistory = async (req, res, next) => {
  try {
    const { teacherId } = req.params;

    const payrolls = await Payroll.find({ teacherId })
      .sort({ month: -1 });

    return res.status(200).json({
      success: true,
      data: payrolls,
      message: 'Teacher payroll history fetched successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMonthlyPayrollOverview,
  processSalaryPayout,
  getTeacherPayrollHistory,
};
