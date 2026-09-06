const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

// Import all models
const User = require('../models/User');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const Section = require('../models/Section');
const Subject = require('../models/Subject');
const FeeRecord = require('../models/FeeRecord');
const BookFee = require('../models/BookFee');
const Expense = require('../models/Expense');
const Attendance = require('../models/Attendance');
const Grade = require('../models/Grade');
const Assignment = require('../models/Assignment');
const Payroll = require('../models/Payroll');
const Family = require('../models/Family');
const FamilyVoucher = require('../models/FamilyVoucher');
const SupportTicket = require('../models/SupportTicket');
const Counter = require('../models/Counter');
const Settings = require('../models/Settings');

const TARGET_ADMIN_EMAIL = 'iqbal@ihass.edu';

async function wipeDatabase() {
  const mongoURI = process.env.MONGO_URI;
  if (!mongoURI) {
    console.error('ERROR: MONGO_URI not found in environment variables.');
    process.exit(1);
  }

  console.log('====================================================');
  console.log('IQRA SCHOOL MANAGEMENT SYSTEM - DATABASE WIPE');
  console.log('Target Admin to Preserve:', TARGET_ADMIN_EMAIL);
  console.log('====================================================');

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      family: 4,
    });
    console.log('Connected successfully.\n');

    // 1. Locate the target admin account to preserve
    const targetAdmin = await User.findOne({
      role: 'admin',
      $or: [
        { email: TARGET_ADMIN_EMAIL.toLowerCase() },
        { email: /iqb.*@ihass\.edu/i },
        { name: /iqbal/i, role: 'admin' }
      ]
    });

    if (!targetAdmin) {
      console.error(`CRITICAL: Preserved admin account (${TARGET_ADMIN_EMAIL}) NOT found in database! Aborting to prevent lockout.`);
      process.exit(1);
    }

    console.log(`Found target admin to preserve: ${targetAdmin.name} (${targetAdmin.email}) [ID: ${targetAdmin._id}]`);

    // 2. Wipe operational / transactional data
    console.log('\n--- Wiping Operational & Transactional Data ---');
    const studentRes = await Student.deleteMany({});
    console.log(`✓ Students deleted: ${studentRes.deletedCount}`);

    const teacherRes = await Teacher.deleteMany({});
    console.log(`✓ Teachers deleted: ${teacherRes.deletedCount}`);

    const feeRes = await FeeRecord.deleteMany({});
    console.log(`✓ Fee records deleted: ${feeRes.deletedCount}`);

    const bookFeeRes = await BookFee.deleteMany({});
    console.log(`✓ Book fee records deleted: ${bookFeeRes.deletedCount}`);

    const expenseRes = await Expense.deleteMany({});
    console.log(`✓ Expenses deleted: ${expenseRes.deletedCount}`);

    const attendanceRes = await Attendance.deleteMany({});
    console.log(`✓ Attendance records deleted: ${attendanceRes.deletedCount}`);

    const gradeRes = await Grade.deleteMany({});
    console.log(`✓ Grades deleted: ${gradeRes.deletedCount}`);

    const assignmentRes = await Assignment.deleteMany({});
    console.log(`✓ Assignments deleted: ${assignmentRes.deletedCount}`);

    const payrollRes = await Payroll.deleteMany({});
    console.log(`✓ Payroll records deleted: ${payrollRes.deletedCount}`);

    const familyVoucherRes = await FamilyVoucher.deleteMany({});
    console.log(`✓ Family vouchers deleted: ${familyVoucherRes.deletedCount}`);

    const familyRes = await Family.deleteMany({});
    console.log(`✓ Families deleted: ${familyRes.deletedCount}`);

    const supportTicketRes = await SupportTicket.deleteMany({});
    console.log(`✓ Support tickets deleted: ${supportTicketRes.deletedCount}`);

    // Clean LeaveRequests if collection exists
    try {
      const leaveRes = await mongoose.connection.db.collection('leaverequests').deleteMany({});
      console.log(`✓ Leave requests deleted: ${leaveRes.deletedCount}`);
    } catch (e) {
      // Collection might not exist
    }

    // 3. Wipe Academic Structure (classes, sections, subjects)
    console.log('\n--- Wiping Academic Structure ---');
    const classRes = await Class.deleteMany({});
    console.log(`✓ Classes deleted: ${classRes.deletedCount}`);

    const sectionRes = await Section.deleteMany({});
    console.log(`✓ Sections deleted: ${sectionRes.deletedCount}`);

    const subjectRes = await Subject.deleteMany({});
    console.log(`✓ Subjects deleted: ${subjectRes.deletedCount}`);

    // 4. Wipe Users EXCEPT the target admin
    console.log('\n--- Wiping Non-Preserved Users ---');
    const userRes = await User.deleteMany({ _id: { $ne: targetAdmin._id } });
    console.log(`✓ Non-admin/other users deleted: ${userRes.deletedCount}`);
    const remainingUsers = await User.countDocuments({});
    console.log(`✓ Remaining users in database: ${remainingUsers} (Admin: ${targetAdmin.email})`);

    // 5. Reset Counters
    console.log('\n--- Resetting Counters ---');
    await Counter.deleteMany({});
    // Initialize student registration counter so next student gets 26001
    await Counter.create([
      { id: 'student_registration', seq: 0 },
      { id: 'student_registration_26', seq: 0 },
      { id: 'book_fee_receipt', seq: 0 },
      { id: 'family_voucher', seq: 0 }
    ]);
    console.log('✓ Counters reset to 0 (First new registration will be 26001).');

    // 6. Verify Settings
    console.log('\n--- Checking Settings ---');
    let settings = await Settings.findOne({ schoolId: 'default' });
    if (!settings) {
      settings = await Settings.create({
        schoolId: 'default',
        schoolName: 'IHASS',
        currentSession: '2026-2027',
        workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        feeHeads: ['Tuition', 'Admission', 'Exam Fee'],
        lateFeeAmount: 0,
        lateFeeAfterDay: 0,
      });
      console.log('✓ Created default Settings with currentSession: 2026-2027');
    } else {
      console.log(`✓ Preserved Settings: "${settings.schoolName}" (Current Session: ${settings.currentSession})`);
    }

    console.log('\n====================================================');
    console.log('DATABASE WIPE COMPLETED SUCCESSFULLY!');
    console.log('Preserved Admin:', targetAdmin.email);
    console.log('Next Registration Number will be: 26001');
    console.log('====================================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Fatal error during database wipe:', err);
    process.exit(1);
  }
}

wipeDatabase();
