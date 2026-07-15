const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Class = require('../models/Class');
const Section = require('../models/Section');
const Subject = require('../models/Subject');
const Teacher = require('../models/Teacher');
const User = require('../models/User');
const Assignment = require('../models/Assignment');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function query() {
  try {
    const mongoURI = process.env.MONGO_URI;
    await mongoose.connect(mongoURI);
    console.log('Connected to DB');

    // 1. Get all teachers
    const teachers = await Teacher.find().populate('userId');
    console.log(`\n--- Teachers List (${teachers.length}) ---`);
    teachers.forEach(t => {
      console.log(`Teacher ID: ${t._id} | Name: ${t.userId?.name} | Email: ${t.userId?.email} | EmployeeID: ${t.employeeId}`);
    });

    // 2. Get all assignments
    const assignments = await Assignment.find()
      .populate({ path: 'teacherId', populate: { path: 'userId' } })
      .populate('classId')
      .populate('sectionId')
      .populate('subjectId');
    
    console.log(`\n--- Current Assignments (${assignments.length}) ---`);
    assignments.forEach(a => {
      console.log(`Assigned Teacher: ${a.teacherId?.userId?.name} (${a.teacherId?._id})`);
      console.log(`  Class: ${a.classId?.name} (${a.classId?.gender}) | Section: ${a.sectionId?.name} | Subject: ${a.subjectId?.name}`);
    });

    // 3. Get all classes, sections, and subjects
    const classes = await Class.find().sort({ orderIndex: 1 });
    console.log(`\n--- Total Classes, Sections & Subjects in Database ---`);
    for (const cls of classes) {
      const sections = await Section.find({ classId: cls._id }).sort({ orderIndex: 1 });
      const subjects = await Subject.find({ classId: cls._id }).sort({ orderIndex: 1 });
      console.log(`Class: "${cls.name}" (${cls.gender})`);
      console.log(`  Sections [${sections.length}]:`, sections.map(s => s.name).join(', '));
      console.log(`  Subjects [${subjects.length}]:`, subjects.map(s => s.name).join(', '));
    }

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.connection.close();
  }
}

query();
