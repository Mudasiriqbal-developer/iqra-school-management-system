require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Student = require('../models/Student');
const Class = require('../models/Class');
const FeeRecord = require('../models/FeeRecord');
const { resolveStudentMonthlyFee } = require('../utils/feeHelper');

async function repairFees() {
  try {
    console.log('--- Starting Fee Repair & Synchronization ---');
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/iqra-school';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully.');

    // 1. Update Classes with a realistic default fee (Rs. 3,000) if defaultFee is 0 or null
    const classesBefore = await Class.find({ $or: [{ defaultFee: 0 }, { defaultFee: null }, { defaultFee: { $exists: false } }] });
    console.log(`Found ${classesBefore.length} classes with defaultFee = 0 or unset.`);
    
    if (classesBefore.length > 0) {
      const classUpdateRes = await Class.updateMany(
        { $or: [{ defaultFee: 0 }, { defaultFee: null }, { defaultFee: { $exists: false } }] },
        { $set: { defaultFee: 3000 } }
      );
      console.log(`Updated ${classUpdateRes.modifiedCount} classes to defaultFee = Rs. 3,000.`);
    }

    // 2. Migrate Student legacy monthlyFeeAmount -> customFee
    const studentsToMigrate = await Student.find({
      status: 'active',
      monthlyFeeAmount: { $gt: 0 },
      $or: [{ customFee: null }, { customFee: { $exists: false } }]
    });
    console.log(`Found ${studentsToMigrate.length} active students with legacy monthlyFeeAmount needing migration to customFee.`);

    let studentsMigratedCount = 0;
    for (const student of studentsToMigrate) {
      student.customFee = student.monthlyFeeAmount;
      if (!student.customFeeNote) {
        student.customFeeNote = 'Migrated from student standard fee';
      }
      await student.save();
      studentsMigratedCount++;
    }
    console.log(`Successfully migrated customFee for ${studentsMigratedCount} students.`);

    // 3. Update current month (and recent zero-fee) FeeRecords
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    console.log(`Checking FeeRecords for month: ${currentMonth}...`);

    const zeroFeeRecords = await FeeRecord.find({
      month: currentMonth,
      type: 'monthly',
      amountDue: 0,
      amountPaid: 0
    });
    console.log(`Found ${zeroFeeRecords.length} FeeRecord(s) in ${currentMonth} with amountDue = 0.`);

    let feeRecordsUpdated = 0;
    for (const record of zeroFeeRecords) {
      const student = await Student.findById(record.studentId).populate('classId');
      if (student) {
        const correctFee = resolveStudentMonthlyFee(student);
        if (correctFee > 0) {
          record.amountDue = correctFee;
          await record.save();
          feeRecordsUpdated++;
        }
      }
    }
    console.log(`Updated ${feeRecordsUpdated} FeeRecord(s) to their resolved monthly fee.`);

    // 4. Verify Total Expected Fees for Current Month
    const currentMonthSummary = await FeeRecord.aggregate([
      { $match: { month: currentMonth, type: 'monthly' } },
      {
        $group: {
          _id: null,
          totalDue: { $sum: '$amountDue' },
          totalPaid: { $sum: '$amountPaid' },
          totalRecords: { $sum: 1 }
        }
      }
    ]);

    console.log('\n--- Repair Summary ---');
    console.log(`Classes updated: ${classesBefore.length}`);
    console.log(`Students customFee set: ${studentsMigratedCount}`);
    console.log(`Zero FeeRecords corrected: ${feeRecordsUpdated}`);
    if (currentMonthSummary.length > 0) {
      console.log(`Current Month (${currentMonth}) Total Expected Fee: Rs. ${currentMonthSummary[0].totalDue.toLocaleString()}`);
      console.log(`Current Month (${currentMonth}) Total Collected Fee: Rs. ${currentMonthSummary[0].totalPaid.toLocaleString()}`);
      console.log(`Current Month (${currentMonth}) Total Student Records: ${currentMonthSummary[0].totalRecords}`);
    }
    console.log('--- Fee Repair Complete ---');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error during fee repair:', err);
    process.exit(1);
  }
}

repairFees();
