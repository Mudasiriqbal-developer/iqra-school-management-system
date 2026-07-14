const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Teacher = require('../models/Teacher');
const Assignment = require('../models/Assignment');
const Section = require('../models/Section');
const Class = require('../models/Class');
const User = require('../models/User');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const check = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;
    await mongoose.connect(mongoURI);

    const users = await User.find({ role: 'teacher' });
    console.log('--- Teacher Users ---');
    console.log(users.map(u => ({ id: u._id, name: u.name, email: u.email })));

    const teachers = await Teacher.find().populate('userId');
    console.log('--- Teacher Profiles ---');
    console.log(teachers.map(t => ({
      id: t._id,
      name: t.userId?.name,
      email: t.userId?.email,
      userId: t.userId?._id
    })));

    const assignments = await Assignment.find()
      .populate('classId')
      .populate('sectionId')
      .populate('subjectId')
      .populate('teacherId');
    console.log('--- Assignments ---');
    console.log(assignments.map(a => ({
      id: a._id,
      class: a.classId?.name,
      gender: a.classId?.gender,
      section: a.sectionId?.name,
      subject: a.subjectId?.name,
      teacher: a.teacherId?._id
    })));

    const sections = await Section.find({ classTeacherId: { $ne: null } })
      .populate('classId')
      .populate('classTeacherId');
    console.log('--- Homeroom Sections (Class Teacher Assigned) ---');
    console.log(sections.map(s => ({
      id: s._id,
      class: s.classId?.name,
      section: s.name,
      teacherId: s.classTeacherId?._id
    })));

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

check();
