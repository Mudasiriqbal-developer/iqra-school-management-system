const mongoose = require('mongoose');
const Student = require('./models/Student');
const FeeRecord = require('./models/FeeRecord');

const MONGO_URI = 'mongodb://localhost:27017/iqra_school_management';

async function generateTestData() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB');

    // Retrieve the test students we seeded earlier
    const regNumbers = [
      'REG-201', 'REG-202', 'REG-203', 'REG-204', 'REG-205',
      'REG-206', 'REG-207', 'REG-208', 'REG-209', 'REG-210'
    ];

    const students = await Student.find({ registrationNumber: { $in: regNumbers } });
    if (students.length < 10) {
      console.log(`Error: Found only ${students.length} test students. Please run the seeding script first.`);
      return;
    }

    // 1. Clean up existing records for these students for target months to avoid duplicate key errors
    const targetMonths = ['2026-08', '2026-04', '2026-05', '2026-06'];
    const studentIds = students.map(s => s._id);
    await FeeRecord.deleteMany({
      studentId: { $in: studentIds },
      month: { $in: targetMonths }
    });
    console.log('Cleaned old test FeeRecords for target months');

    // 2. Apply next month's fee ("2026-08") on 7 students
    // We will pick the first 7 students (REG-201 to REG-207)
    const nextMonth = '2026-08';
    const studentsForNextMonth = students.slice(0, 7);

    for (const student of studentsForNextMonth) {
      const status = student.monthlyFeeAmount === 0 ? 'paid' : 'pending';
      const record = await FeeRecord.create({
        studentId: student._id,
        month: nextMonth,
        amountDue: student.monthlyFeeAmount,
        amountPaid: 0,
        status,
        payments: []
      });
      console.log(`[Next Month Fee] Created record for ${student.fullName} (${student.registrationNumber}): month: ${record.month}, amountDue: ${record.amountDue}, status: ${record.status}`);
    }

    // 3. Apply previous 3 months' pending fees ("2026-04", "2026-05", "2026-06") on 3 students
    // We will pick the 3 full-paying students (REG-206, REG-207, REG-208)
    const previousMonths = ['2026-04', '2026-05', '2026-06'];
    const studentsForPreviousMonths = students.filter(s =>
      ['REG-206', 'REG-207', 'REG-208'].includes(s.registrationNumber)
    );

    for (const student of studentsForPreviousMonths) {
      for (const month of previousMonths) {
        const record = await FeeRecord.create({
          studentId: student._id,
          month,
          amountDue: student.monthlyFeeAmount, // e.g. 5000 or 3500
          amountPaid: 0,
          status: 'pending',
          payments: []
        });
        console.log(`[Previous Months Pending] Created record for ${student.fullName} (${student.registrationNumber}): month: ${record.month}, amountDue: ${record.amountDue}, status: ${record.status}`);
      }
    }

    console.log('\nTest data generated successfully!');

  } catch (err) {
    console.error('Error generating test data:', err);
  } finally {
    await mongoose.connection.close();
  }
}

generateTestData();
