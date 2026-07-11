const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Import all models
const User = require('./models/User');
const Student = require('./models/Student');
const Teacher = require('./models/Teacher');
const Class = require('./models/Class');
const Section = require('./models/Section');
const Subject = require('./models/Subject');
const Assignment = require('./models/Assignment');
const Attendance = require('./models/Attendance');
const Grade = require('./models/Grade');
const Expense = require('./models/Expense');
const Payroll = require('./models/Payroll');
const LeaveRequest = require('./models/LeaveRequest');
const FeeRecord = require('./models/FeeRecord');

const wipeData = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) {
      console.error('Error: MONGO_URI is not defined in backend/.env');
      process.exit(1);
    }

    console.log('Connecting to database for data wipe...');
    await mongoose.connect(mongoURI);
    console.log('Connected to database.');

    console.log('Wiping collections...');

    const resultUser = await User.deleteMany({});
    console.log(`- User: Deleted ${resultUser.deletedCount} documents`);

    const resultStudent = await Student.deleteMany({});
    console.log(`- Student: Deleted ${resultStudent.deletedCount} documents`);

    const resultTeacher = await Teacher.deleteMany({});
    console.log(`- Teacher: Deleted ${resultTeacher.deletedCount} documents`);

    const resultClass = await Class.deleteMany({});
    console.log(`- Class: Deleted ${resultClass.deletedCount} documents`);

    const resultSection = await Section.deleteMany({});
    console.log(`- Section: Deleted ${resultSection.deletedCount} documents`);

    const resultSubject = await Subject.deleteMany({});
    console.log(`- Subject: Deleted ${resultSubject.deletedCount} documents`);

    const resultAssignment = await Assignment.deleteMany({});
    console.log(`- Assignment: Deleted ${resultAssignment.deletedCount} documents`);

    const resultAttendance = await Attendance.deleteMany({});
    console.log(`- Attendance: Deleted ${resultAttendance.deletedCount} documents`);

    const resultGrade = await Grade.deleteMany({});
    console.log(`- Grade: Deleted ${resultGrade.deletedCount} documents`);

    const resultExpense = await Expense.deleteMany({});
    console.log(`- Expense: Deleted ${resultExpense.deletedCount} documents`);

    const resultPayroll = await Payroll.deleteMany({});
    console.log(`- Payroll: Deleted ${resultPayroll.deletedCount} documents`);

    const resultLeaveRequest = await LeaveRequest.deleteMany({});
    console.log(`- LeaveRequest: Deleted ${resultLeaveRequest.deletedCount} documents`);

    const resultFeeRecord = await FeeRecord.deleteMany({});
    console.log(`- FeeRecord: Deleted ${resultFeeRecord.deletedCount} documents`);

    console.log('----------------------------------------------------');
    console.log('All collections have been successfully wiped!');
    console.log('----------------------------------------------------');
    process.exit(0);
  } catch (error) {
    console.error('Wipe data failed:', error);
    process.exit(1);
  }
};

wipeData();
