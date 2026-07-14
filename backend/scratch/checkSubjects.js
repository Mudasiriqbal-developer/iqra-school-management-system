const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Subject = require('../models/Subject');
const Class = require('../models/Class');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const checkSubjects = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;
    await mongoose.connect(mongoURI);

    const subjects = await Subject.find().populate('classId');
    console.log('--- Subjects ---');
    console.log(subjects.map(s => ({
      id: s._id,
      name: s.name,
      classId: s.classId?._id,
      className: s.classId?.name
    })));

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

checkSubjects();
