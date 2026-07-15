const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Class = require('../models/Class');
const Section = require('../models/Section');
const Subject = require('../models/Subject');
const Assignment = require('../models/Assignment');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function verify() {
  try {
    const mongoURI = process.env.MONGO_URI;
    await mongoose.connect(mongoURI);
    console.log('Connected');

    const classes = await Class.find().sort({ orderIndex: 1 });
    let totalUnassigned = 0;
    
    console.log('\n--- Checking Section A Unassigned Subjects ---');
    for (const cls of classes) {
      const secA = await Section.findOne({ name: 'A', classId: cls._id });
      if (!secA) continue;
      
      const subjects = await Subject.find({ classId: cls._id });
      let classUnassigned = 0;
      
      for (const sub of subjects) {
        const assignment = await Assignment.findOne({
          classId: cls._id,
          sectionId: secA._id,
          subjectId: sub._id
        });
        if (!assignment) {
          classUnassigned++;
          totalUnassigned++;
        }
      }
      if (classUnassigned > 0) {
        console.log(`Class: "${cls.name}" (${cls.gender}) has ${classUnassigned} unassigned subjects.`);
      }
    }
    
    console.log(`Total remaining unassigned subjects in Section A: ${totalUnassigned}`);

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.connection.close();
  }
}

verify();
