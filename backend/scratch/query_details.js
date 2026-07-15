const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Class = require('../models/Class');
const Section = require('../models/Section');
const Subject = require('../models/Subject');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function queryDetails() {
  try {
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) {
      console.error('MONGO_URI is not defined');
      process.exit(1);
    }
    await mongoose.connect(mongoURI);
    console.log('Connected to DB');

    const classes = await Class.find().sort({ orderIndex: 1 });
    for (const cls of classes) {
      console.log(`\n========================================`);
      console.log(`Class Name: "${cls.name}" (ID: ${cls._id})`);
      console.log(`Gender: "${cls.gender}" | OrderIndex: ${cls.orderIndex}`);

      const sections = await Section.find({ classId: cls._id }).sort({ orderIndex: 1 });
      console.log(`Sections [${sections.length}]:`);
      sections.forEach(sec => {
        console.log(`  - "${sec.name}" (ID: ${sec._id}) [order: ${sec.orderIndex}]`);
      });

      const subjects = await Subject.find({ classId: cls._id }).sort({ orderIndex: 1 });
      console.log(`Subjects [${subjects.length}]:`);
      subjects.forEach(sub => {
        console.log(`  - "${sub.name}" (ID: ${sub._id}) [order: ${sub.orderIndex}]`);
      });
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.connection.close();
  }
}

queryDetails();
