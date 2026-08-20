const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Student = require('../models/Student');
const User = require('../models/User');

const explicitMap = {
  'stud101': '26101',
  'stud102': '26102',
  'stud103': '26103',
  'reg-201': '26201',
  'reg-202': '26202',
  'reg-203': '26203',
  'reg-204': '26204',
  'reg-205': '26205',
  'reg-206': '26206',
  'reg-207': '26207'
};

const getNewRegNo = (oldReg) => {
  const normalized = oldReg.toLowerCase().trim();
  
  if (/^\d{5}$/.test(normalized)) {
    return { newReg: normalized, status: 'already_correct' };
  }

  if (explicitMap[normalized]) {
    return { newReg: explicitMap[normalized], status: 'mapped' };
  }
  
  const match = normalized.match(/^(?:reg-)?(\d{4})-(\d+)$/);
  if (match) {
    const year = match[1];
    const counter = match[2];
    const shortYear = year.slice(-2);
    return { newReg: `${shortYear}${counter}`, status: 'matched' };
  }
  
  return { newReg: null, status: 'ambiguous' };
};

const runMigration = async () => {
  const execute = process.argv.includes('--execute');
  const dryRun = !execute;

  console.log('====================================================');
  console.log(`Running Student Registration Number Migration`);
  console.log(`Mode: ${dryRun ? 'DRY-RUN (No changes will be written)' : 'EXECUTE (Changes will be written)'}`);
  console.log('====================================================\n');

  try {
    await connectDB();
    console.log('Connected to database.');

    const students = await Student.find({}).lean();
    console.log(`Found ${students.length} students in database.\n`);

    const summaryTable = [];
    let updatedCount = 0;
    let skippedCount = 0;
    let collidedCount = 0;

    for (const student of students) {
      const oldReg = student.registrationNumber;
      const { newReg, status } = getNewRegNo(oldReg);

      if (status === 'already_correct') {
        summaryTable.push({
          name: student.fullName,
          oldReg,
          newReg: oldReg,
          status: 'SKIPPED (Already correct)',
          details: '-'
        });
        skippedCount++;
        continue;
      }

      if (!newReg) {
        console.warn(`[WARNING] Student "${student.fullName}" has ambiguous registration number "${oldReg}". Skipping.`);
        summaryTable.push({
          name: student.fullName,
          oldReg,
          newReg: 'N/A',
          status: 'SKIPPED (Ambiguous)',
          details: 'Does not match pattern or explicit map'
        });
        skippedCount++;
        continue;
      }

      // Check collision on Student collection
      const studentCollision = await Student.findOne({ 
        registrationNumber: newReg, 
        _id: { $ne: student._id } 
      });

      if (studentCollision) {
        console.error(`[COLLISION] Cannot map "${oldReg}" to "${newReg}" for "${student.fullName}". Collides with Student ID: ${studentCollision._id} ("${studentCollision.fullName}").`);
        summaryTable.push({
          name: student.fullName,
          oldReg,
          newReg,
          status: 'COLLIDED (Student)',
          details: `Collides with Student ID: ${studentCollision._id} ("${studentCollision.fullName}")`
        });
        collidedCount++;
        continue;
      }

      // Find user document for this student
      const user = await User.findOne({ registrationNumber: oldReg });
      
      // Check collision on User collection
      const userCollision = await User.findOne({ 
        registrationNumber: newReg,
        ...(user ? { _id: { $ne: user._id } } : {})
      });

      if (userCollision) {
        console.error(`[COLLISION] Cannot map "${oldReg}" to "${newReg}" for "${student.fullName}". Collides with User ID: ${userCollision._id} ("${userCollision.name}").`);
        summaryTable.push({
          name: student.fullName,
          oldReg,
          newReg,
          status: 'COLLIDED (User)',
          details: `Collides with User ID: ${userCollision._id} ("${userCollision.name}")`
        });
        collidedCount++;
        continue;
      }

      // If we are executing, perform the updates
      if (!dryRun) {
        // Update Student
        await Student.updateOne(
          { _id: student._id },
          { $set: { registrationNumber: newReg } }
        );

        // Update User
        if (user) {
          await User.updateOne(
            { _id: user._id },
            { $set: { registrationNumber: newReg } }
          );
        }
      }

      summaryTable.push({
        name: student.fullName,
        oldReg,
        newReg,
        status: dryRun ? 'WOULD UPDATE' : 'UPDATED',
        details: user ? 'Student & User records updated' : 'Student record updated (No User record found)'
      });
      updatedCount++;
    }

    console.log('\n---------------- MIGRATION SUMMARY TABLE ----------------');
    console.table(summaryTable);
    console.log('---------------------------------------------------------');

    console.log(`\nFinal Counts:`);
    console.log(`- Updated (or would update): ${updatedCount}`);
    console.log(`- Skipped:                  ${skippedCount}`);
    console.log(`- Collided:                 ${collidedCount}`);
    console.log(`Total processed:            ${students.length}`);

    console.log('\nMigration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration execution failed:', error);
    process.exit(1);
  }
};

runMigration();
