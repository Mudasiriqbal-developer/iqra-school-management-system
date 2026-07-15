const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Class = require('../models/Class');
const Section = require('../models/Section');
const Subject = require('../models/Subject');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function verify() {
  try {
    const mongoURI = process.env.MONGO_URI;
    await mongoose.connect(mongoURI);
    console.log('Connected');

    const classes = await Class.find({ name: { $in: ['Grade 4', 'Grade 5'] } }).sort({ orderIndex: 1 });
    for (const cls of classes) {
      console.log(`\nClass: "${cls.name}" (${cls.gender}) | orderIndex: ${cls.orderIndex}`);
      const sections = await Section.find({ classId: cls._id }).sort({ orderIndex: 1 });
      console.log(`  Sections:`, sections.map(s => `"${s.name}" (orderIndex: ${s.orderIndex})`));
      const subjects = await Subject.find({ classId: cls._id }).sort({ orderIndex: 1 });
      console.log(`  Subjects:`, subjects.map(s => `"${s.name}" (orderIndex: ${s.orderIndex})`));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.connection.close();
  }
}

verify();
