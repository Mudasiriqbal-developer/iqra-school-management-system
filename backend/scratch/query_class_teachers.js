const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Class = require('../models/Class');
const Section = require('../models/Section');
const Teacher = require('../models/Teacher');
const User = require('../models/User');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function query() {
  try {
    const mongoURI = process.env.MONGO_URI;
    await mongoose.connect(mongoURI);
    console.log('Connected');

    const sections = await Section.find().populate({ path: 'classTeacherId', populate: { path: 'userId' } }).populate('classId');
    console.log('--- Section Class Teachers ---');
    for (const sec of sections) {
      console.log(`Class: "${sec.classId?.name}" (${sec.classId?.gender}) | Section: "${sec.name}" | Class Teacher: ${sec.classTeacherId?.userId?.name || 'None'} (ID: ${sec.classTeacherId?._id || 'None'})`);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.connection.close();
  }
}

query();
