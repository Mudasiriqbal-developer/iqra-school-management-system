const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Class = require('../models/Class');
const Section = require('../models/Section');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const Grade = require('../models/Grade');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function check() {
  try {
    const mongoURI = process.env.MONGO_URI;
    await mongoose.connect(mongoURI);
    console.log('Connected');

    // Count students per class/section
    const students = await Student.find().populate('classId').populate('sectionId');
    console.log(`\n--- Students (${students.length}) ---`);
    for (const student of students) {
      console.log(`Student: ${student.fullName} | Gender: ${student.gender} | Class: ${student.classId?.name} (${student.classId?.gender}) | Section: ${student.sectionId?.name}`);
    }

    // Count grades
    const grades = await Grade.find().populate('classId').populate('sectionId').populate('subjectId');
    console.log(`\n--- Grades (${grades.length}) ---`);
    for (const grade of grades) {
      console.log(`Grade: StudentId ${grade.studentId} | Class: ${grade.classId?.name} | Section: ${grade.sectionId?.name} | Subject: ${grade.subjectId?.name}`);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.connection.close();
  }
}

check();
