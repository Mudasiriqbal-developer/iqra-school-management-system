require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Student = require('./models/Student');
const Teacher = require('./models/Teacher');
const Attendance = require('./models/Attendance');
const Grade = require('./models/Grade');
const FeeRecord = require('./models/FeeRecord');
const Payroll = require('./models/Payroll');
const Assignment = require('./models/Assignment');

const cleanup = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) {
      console.error('MONGO_URI is missing in environment variables');
      process.exit(1);
    }

    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    // 1. Clean Students
    const allStudents = await Student.find({});
    console.log(`Total students found in database: ${allStudents.length}`);
    if (allStudents.length > 10) {
      const studentsToKeep = allStudents.slice(0, 10);
      const studentIdsToKeep = studentsToKeep.map(s => s._id.toString());
      
      const studentsToDelete = allStudents.filter(s => !studentIdsToKeep.includes(s._id.toString()));
      const studentIdsToDelete = studentsToDelete.map(s => s._id);
      const studentRegsToDelete = studentsToDelete.map(s => s.registrationNumber.toLowerCase());

      console.log(`Keeping ${studentsToKeep.length} students, deleting ${studentsToDelete.length} test students...`);

      // Delete from Student collection
      await Student.deleteMany({ _id: { $in: studentIdsToDelete } });

      // Delete from User collection where role is student and registrationNumber is matched
      await User.deleteMany({ role: 'student', registrationNumber: { $in: studentRegsToDelete } });

      // Clean related records in Grade, FeeRecord, and Attendance collections
      const gradeResult = await Grade.deleteMany({ studentId: { $in: studentIdsToDelete } });
      const feeResult = await FeeRecord.deleteMany({ studentId: { $in: studentIdsToDelete } });
      const pullResult = await Attendance.updateMany({}, { $pull: { records: { studentId: { $in: studentIdsToDelete } } } });
      // Delete any attendance sheets that have become empty
      const emptyAttendanceResult = await Attendance.deleteMany({ records: { $size: 0 } });

      console.log(`Students cleaned:`);
      console.log(`- Grades deleted: ${gradeResult.deletedCount}`);
      console.log(`- Fee records deleted: ${feeResult.deletedCount}`);
      console.log(`- Attendance records scrubbed in: ${pullResult.modifiedCount} sheets`);
      console.log(`- Empty attendance sheets removed: ${emptyAttendanceResult.deletedCount}`);
    } else {
      console.log('10 or fewer students found, no student deletion required.');
    }

    // 2. Clean Teachers
    const allTeachers = await Teacher.find({});
    console.log(`Total teachers found in database: ${allTeachers.length}`);
    if (allTeachers.length > 5) {
      const teachersToKeep = allTeachers.slice(0, 5);
      const teacherIdsToKeep = teachersToKeep.map(t => t._id.toString());
      
      const teachersToDelete = allTeachers.filter(t => !teacherIdsToKeep.includes(t._id.toString()));
      const teacherIdsToDelete = teachersToDelete.map(t => t._id);
      const teacherUserIdsToDelete = teachersToDelete.map(t => t.userId);

      console.log(`Keeping ${teachersToKeep.length} teachers, deleting ${teachersToDelete.length} test teachers...`);

      // Delete from Teacher collection
      await Teacher.deleteMany({ _id: { $in: teacherIdsToDelete } });

      // Delete corresponding teacher accounts from User collection
      await User.deleteMany({ _id: { $in: teacherUserIdsToDelete } });

      // Clean related records in Payroll, Assignment, and Attendance collections
      const payrollResult = await Payroll.deleteMany({ teacherId: { $in: teacherIdsToDelete } });
      const assignmentResult = await Assignment.deleteMany({ teacherId: { $in: teacherIdsToDelete } });
      const teacherAttendanceResult = await Attendance.deleteMany({ teacherId: { $in: teacherIdsToDelete } });

      console.log(`Teachers cleaned:`);
      console.log(`- Payrolls deleted: ${payrollResult.deletedCount}`);
      console.log(`- Assignments deleted: ${assignmentResult.deletedCount}`);
      console.log(`- Attendance sheets marked by deleted teachers removed: ${teacherAttendanceResult.deletedCount}`);
    } else {
      console.log('5 or fewer teachers found, no teacher deletion required.');
    }

    console.log('Database cleanup completed successfully!');
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error running database cleanup:', error);
    process.exit(1);
  }
};

cleanup();
