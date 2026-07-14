const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Section = require('../models/Section');
const Class = require('../models/Class');
const Teacher = require('../models/Teacher');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const checkAllSections = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;
    await mongoose.connect(mongoURI);

    const sections = await Section.find().populate('classId').populate('classTeacherId');
    console.log('--- All Sections ---');
    console.log(sections.map(s => ({
      id: s._id,
      name: s.name,
      className: s.classId?.name,
      classTeacher: s.classTeacherId?._id
    })));

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

checkAllSections();
