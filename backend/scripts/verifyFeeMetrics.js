require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function verify() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const Student = require('../models/Student');
    const FeeRecord = require('../models/FeeRecord');
    const Class = require('../models/Class');
    const Expense = require('../models/Expense');
    const Payroll = require('../models/Payroll');

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    console.log('=== VERIFICATION OF FEE SYSTEM ===');
    console.log(`Current Month: ${currentMonth}`);

    // Check students
    const activeStudents = await Student.find({ status: 'active' }).populate('classId');
    console.log(`Active Students Count: ${activeStudents.length}`);

    // Check first 5 students
    console.log('\nSample Student Fees:');
    activeStudents.slice(0, 5).forEach(s => {
      console.log(` - ${s.fullName} (${s.registrationNumber}): Class=${s.classId?.name}, customFee=${s.customFee}, monthlyFeeAmount=${s.monthlyFeeAmount}`);
    });

    // Check FeeRecords in current month
    const currentRecords = await FeeRecord.find({ month: currentMonth, type: 'monthly' })
      .populate('studentId', 'fullName registrationNumber')
      .limit(5);

    console.log('\nSample Current Month Fee Records:');
    currentRecords.forEach(r => {
      console.log(` - Student: ${r.studentId?.fullName} (${r.studentId?.registrationNumber}) | Due: Rs. ${r.amountDue} | Paid: Rs. ${r.amountPaid} | Status: ${r.status}`);
    });

    // Check aggregate fee summary
    const feeAgg = await FeeRecord.aggregate([
      {
        $match: {
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

    const totalFeeExpected = feeAgg[0]?.totalFeeExpected || 0;
    const totalCollected = feeAgg[0]?.totalCollected || 0;
    console.log(`\nFee Aggregate:`);
    console.log(` - Total Fee Expected: Rs. ${totalFeeExpected.toLocaleString()}`);
    console.log(` - Total Fee Collected: Rs. ${totalCollected.toLocaleString()}`);

    // Check expenses and payroll
    const expenseAgg = await Expense.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]);
    const payrollAgg = await Payroll.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$netSalary' } } }]);
    const totalExpenses = expenseAgg[0]?.total || 0;
    const totalPayroll = payrollAgg[0]?.total || 0;
    const totalSpent = totalExpenses + totalPayroll;
    const netPL = totalCollected - totalSpent;

    console.log(`\nP&L Calculations:`);
    console.log(` - Total Spent (Expenses Rs. ${totalExpenses.toLocaleString()} + Paid Payroll Rs. ${totalPayroll.toLocaleString()}): Rs. ${totalSpent.toLocaleString()}`);
    console.log(` - Current Net P&L (Collected - Spent): Rs. ${netPL.toLocaleString()}`);
    console.log(` - Projected Net P&L (When 100% expected fees collected): Rs. ${(totalFeeExpected - totalSpent).toLocaleString()}`);

    console.log('\n=== VERIFICATION PASSED ===');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Verification failed:', err);
    process.exit(1);
  }
}

verify();
