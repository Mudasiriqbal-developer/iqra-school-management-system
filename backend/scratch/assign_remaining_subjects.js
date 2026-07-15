const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Class = require('../models/Class');
const Section = require('../models/Section');
const Subject = require('../models/Subject');
const Assignment = require('../models/Assignment');

dotenv.config({ path: path.join(__dirname, '../.env') });

// Teacher IDs mapped to their assigned subjects
const TEACHER_SUBJECT_MAP = {
  // Teacher Name 20 (English, Physics)
  '6a562f4328f305de9ff13af6': ['English', 'Physics'],
  
  // Dr Mudasir Iqbal (Chemistry, Biology)
  '6a520d97c7429f2fa5d138b6': ['Chemistry', 'Biology'],
  
  // Dr Maaz Khan (Science, Mutalia Quran)
  '6a520d97c7429f2fa5d138ba': ['Science', 'Mutalia Quran'],
  
  // Muhammad Umar (Islamiyat, Urdu)
  '6a549a7946ae89d72477f00c': ['Islamiyat', 'Urdu'],
  
  // Mudassir Iqbal (Pak Study, Drawing)
  '6a55d98b2ba8783a1e2f4a01': ['Pak Study', 'Drawing']
};

async function assignRemaining() {
  try {
    const mongoURI = process.env.MONGO_URI;
    await mongoose.connect(mongoURI);
    console.log('Connected to DB');

    // Get all classes
    const classes = await Class.find().sort({ orderIndex: 1 });
    console.log(`Processing assignments for ${classes.length} classes...`);

    let createdAssignmentsCount = 0;

    for (const cls of classes) {
      // Find Section A
      const secA = await Section.findOne({ name: 'A', classId: cls._id });
      if (!secA) {
        console.log(`WARNING: Section A not found for class "${cls.name}"`);
        continue;
      }

      // Get all subjects for this class
      const subjects = await Subject.find({ classId: cls._id }).sort({ orderIndex: 1 });
      
      for (const sub of subjects) {
        // Check if assignment already exists
        const existingAssignment = await Assignment.findOne({
          classId: cls._id,
          sectionId: secA._id,
          subjectId: sub._id
        });

        if (existingAssignment) {
          // Assignment already exists, do not overwrite
          continue;
        }

        // Find which remaining teacher is mapped to this subject name
        let assignedTeacherId = null;
        for (const [teacherId, subjectNames] of Object.entries(TEACHER_SUBJECT_MAP)) {
          if (subjectNames.includes(sub.name)) {
            assignedTeacherId = teacherId;
            break;
          }
        }

        if (assignedTeacherId) {
          // Create the new assignment
          await Assignment.create({
            teacherId: assignedTeacherId,
            classId: cls._id,
            sectionId: secA._id,
            subjectId: sub._id
          });
          createdAssignmentsCount++;
          console.log(`Created assignment: Class "${cls.name}" | Section "A" | Subject "${sub.name}" -> Teacher ID ${assignedTeacherId}`);
        } else {
          console.log(`WARNING: No teacher mapping found for unassigned subject "${sub.name}" in class "${cls.name}"`);
        }
      }
    }

    console.log(`\nSuccessfully created ${createdAssignmentsCount} new subject assignments!`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

assignRemaining();
