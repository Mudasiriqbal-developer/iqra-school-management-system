const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Class = require('../models/Class');
const Section = require('../models/Section');
const Subject = require('../models/Subject');

dotenv.config({ path: path.join(__dirname, '../.env') });

const SUBJECT_LIST = [
  'Maths',
  'English',
  'Physics',
  'Chemistry',
  'Biology',
  'Science',
  'Mutalia Quran',
  'Islamiyat',
  'Urdu',
  'Pak Study',
  'Drawing'
];

async function updateAcademic() {
  try {
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) {
      console.error('MONGO_URI is not defined');
      process.exit(1);
    }
    await mongoose.connect(mongoURI);
    console.log('Connected to DB successfully.');

    // Drop old single field unique index on name if it exists
    try {
      await mongoose.connection.collection('classes').dropIndex('name_1');
      console.log('Successfully dropped old single-field "name" unique index.');
    } catch (err) {
      console.log('Old unique index "name_1" not found or already dropped. Proceeding...');
    }

    // 1. Process Grades 4 to 10
    const grades = [4, 5, 6, 7, 8, 9, 10];

    for (const g of grades) {
      const className = `Grade ${g}`;
      console.log(`\nProcessing ${className}...`);

      // Ensure Male class exists (Old class)
      let maleClass = await Class.findOne({ name: className, gender: 'male' });
      if (!maleClass) {
        console.log(`WARNING: Male class "${className}" not found! Creating it...`);
        maleClass = await Class.create({ name: className, gender: 'male', orderIndex: 0 });
      } else {
        console.log(`Found existing Male class: ID ${maleClass._id}`);
      }

      // Ensure Female class exists (New class)
      let femaleClass = await Class.findOne({ name: className, gender: 'female' });
      if (!femaleClass) {
        console.log(`Creating Female class "${className}"...`);
        femaleClass = await Class.create({ name: className, gender: 'female', orderIndex: 0 });
      } else {
        console.log(`Found existing Female class: ID ${femaleClass._id}`);
      }

      // Process both male and female classes for this grade
      const targetClasses = [
        { doc: maleClass, type: 'male' },
        { doc: femaleClass, type: 'female' }
      ];

      for (const target of targetClasses) {
        const cls = target.doc;
        console.log(`  Targeting Class: "${cls.name}" (${target.type}) [ID: ${cls._id}]`);

        // Ensure Section A exists and has orderIndex = 0
        let secA = await Section.findOne({ name: 'A', classId: cls._id });
        if (!secA) {
          console.log(`    Creating Section "A"`);
          secA = await Section.create({ name: 'A', classId: cls._id, orderIndex: 0 });
        } else {
          secA.orderIndex = 0;
          await secA.save();
          console.log(`    Updated existing Section "A" orderIndex`);
        }

        // Ensure Section B exists and has orderIndex = 1
        let secB = await Section.findOne({ name: 'B', classId: cls._id });
        if (!secB) {
          console.log(`    Creating Section "B"`);
          secB = await Section.create({ name: 'B', classId: cls._id, orderIndex: 1 });
        } else {
          secB.orderIndex = 1;
          await secB.save();
          console.log(`    Updated existing Section "B" orderIndex`);
        }

        // Delete any other subjects not in our list to be absolutely clean
        const deleteRes = await Subject.deleteMany({ classId: cls._id, name: { $nin: SUBJECT_LIST } });
        if (deleteRes.deletedCount > 0) {
          console.log(`    Deleted ${deleteRes.deletedCount} non-standard subjects`);
        }

        // Add / Update the 11 subjects in order
        for (let order = 0; order < SUBJECT_LIST.length; order++) {
          const subjectName = SUBJECT_LIST[order];
          let subject = await Subject.findOne({ name: subjectName, classId: cls._id });
          if (!subject) {
            console.log(`    Creating Subject: "${subjectName}" with orderIndex ${order}`);
            await Subject.create({ name: subjectName, classId: cls._id, orderIndex: order });
          } else {
            subject.orderIndex = order;
            await subject.save();
            console.log(`    Updated Subject: "${subjectName}" to orderIndex ${order}`);
          }
        }
      }
    }

    // 2. Assign logical orderIndex values to all classes to display them beautifully in order:
    // Play Group -> Prep -> Grade 1 -> Grade 2 -> Grade 3 -> (Grade 4 Male -> Grade 4 Female) -> ... -> (Grade 10 Male -> Grade 10 Female)
    console.log('\nRe-ordering all classes in the database...');
    const allExistingClasses = await Class.find({});

    const orderedClassKeys = [
      { name: 'Play Group', gender: 'mixed' },
      { name: 'Prep', gender: 'mixed' },
      { name: 'Grade 1', gender: 'mixed' },
      { name: 'Grade 2', gender: 'mixed' },
      { name: 'Grade 3', gender: 'mixed' },
      // Grade 4 to 10 (male first, then female)
      { name: 'Grade 4', gender: 'male' },
      { name: 'Grade 4', gender: 'female' },
      { name: 'Grade 5', gender: 'male' },
      { name: 'Grade 5', gender: 'female' },
      { name: 'Grade 6', gender: 'male' },
      { name: 'Grade 6', gender: 'female' },
      { name: 'Grade 7', gender: 'male' },
      { name: 'Grade 7', gender: 'female' },
      { name: 'Grade 8', gender: 'male' },
      { name: 'Grade 8', gender: 'female' },
      { name: 'Grade 9', gender: 'male' },
      { name: 'Grade 9', gender: 'female' },
      { name: 'Grade 10', gender: 'male' },
      { name: 'Grade 10', gender: 'female' }
    ];

    for (let index = 0; index < orderedClassKeys.length; index++) {
      const key = orderedClassKeys[index];
      const match = allExistingClasses.find(c => c.name === key.name && c.gender === key.gender);
      if (match) {
        match.orderIndex = index;
        await match.save();
        console.log(`Assigned orderIndex ${index} to "${key.name}" (${key.gender})`);
      } else {
        // Just in case a class was deleted or not found
        console.log(`WARNING: Expected class "${key.name}" (${key.gender}) not found during re-ordering.`);
      }
    }

    console.log('\nAcademic structure update finished successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Update failed:', error);
    process.exit(1);
  }
}

updateAcademic();
