const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Class = require('../models/Class');
const Section = require('../models/Section');
const Student = require('../models/Student');
const User = require('../models/User');
const Teacher = require('../models/Teacher');
const FeeRecord = require('../models/FeeRecord');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function verify() {
  try {
    const mongoURI = process.env.MONGO_URI;
    await mongoose.connect(mongoURI);
    console.log('Connected to DB');

    const totalTeachers = await Teacher.countDocuments();
    const totalTeacherUsers = await User.countDocuments({ role: 'teacher' });
    console.log(`Total Teachers in DB: ${totalTeachers} (User records: ${totalTeacherUsers})`);

    const classes = await Class.find().sort({ orderIndex: 1 });
    console.log(`\n--- Classes, Sections & Student Counts ---`);
    for (const cls of classes) {
      const sections = await Section.find({ classId: cls._id }).sort({ orderIndex: 1 });
      const studentCountTotal = await Student.countDocuments({ classId: cls._id });
      console.log(`\nClass: "${cls.name}" (${cls.gender}) | Total Students in Class: ${studentCountTotal}`);
      for (const sec of sections) {
        const studentCountSec = await Student.countDocuments({ classId: cls._id, sectionId: sec._id });
        console.log(`  - Section: "${sec.name}" (ID: ${sec._id}) | Students in Section: ${studentCountSec}`);
      }
    }

    const totalStudents = await Student.countDocuments();
    const totalStudentUsers = await User.countDocuments({ role: 'student' });
    const totalFeeRecords = await FeeRecord.countDocuments({ month: '2026-07' });
    console.log(`\nTotal Students in DB: ${totalStudents} (User records: ${totalStudentUsers})`);
    console.log(`Total FeeRecords for 2026-07: ${totalFeeRecords}`);

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.connection.close();
  }
}

verify();
