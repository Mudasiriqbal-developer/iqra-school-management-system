const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const User = require('../models/User');
const Student = require('../models/Student');
const Counter = require('../models/Counter');

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('Error: MONGO_URI environment variable is not defined.');
    process.exit(1);
  }

  console.log('Connecting to database...');
  await mongoose.connect(uri);
  console.log('Connected.\n');

  try {
    // 1. Identify Orphaned Student Users
    console.log('=== Checking Orphaned Student Users ===');
    const studentUsers = await User.find({ role: 'student' });
    const orphanedUsers = [];

    for (const u of studentUsers) {
      const studentExists = await Student.exists({ registrationNumber: u.registrationNumber });
      if (!studentExists) {
        orphanedUsers.push({
          id: u._id,
          name: u.name,
          registrationNumber: u.registrationNumber,
          phone: u.phone,
          createdAt: u.createdAt
        });
      }
    }

    if (orphanedUsers.length > 0) {
      console.log(`[ALERT] Found ${orphanedUsers.length} orphaned student user(s) (User account exists but Student record does not):`);
      console.log(JSON.stringify(orphanedUsers, null, 2));
    } else {
      console.log('OK: No orphaned student users found.');
    }

    // 2. Identify Maximum Registration Numbers
    console.log('\n=== Checking Maximum Registration Numbers ===');
    const students = await Student.find({}, 'registrationNumber');
    let maxStudentReg = 0;
    students.forEach(s => {
      const num = parseInt(s.registrationNumber, 10);
      if (!isNaN(num) && num > maxStudentReg) {
        maxStudentReg = num;
      }
    });

    const users = await User.find({ role: 'student' }, 'registrationNumber');
    let maxUserReg = 0;
    users.forEach(u => {
      const num = parseInt(u.registrationNumber, 10);
      if (!isNaN(num) && num > maxUserReg) {
        maxUserReg = num;
      }
    });

    const absoluteMaxReg = Math.max(maxStudentReg, maxUserReg);
    console.log(`Highest numeric registration number in Student collection: ${maxStudentReg}`);
    console.log(`Highest numeric registration number in User (student) collection: ${maxUserReg}`);
    console.log(`Absolute highest registration number currently in use: ${absoluteMaxReg}`);

    // 3. Inspect the Counter document
    console.log('\n=== Checking Registration Number Counter ===');
    const counterDoc = await Counter.findOne({ id: 'student_registration' });

    if (!counterDoc) {
      console.log('[ALERT] Counter document for "student_registration" was NOT FOUND.');
      const expectedSeq = absoluteMaxReg - 26000;
      console.log('\n=== Resolution Instructions ===');
      console.log(`To create the missing Counter document and align it with the highest registration number (${absoluteMaxReg}):`);
      console.log(`Run this command in your MongoDB shell:`);
      console.log(`\x1b[33mdb.counters.updateOne({ id: "student_registration" }, { $set: { seq: ${expectedSeq} } }, { upsert: true })\x1b[0m`);
      console.log(`\n(This sets the sequence to ${expectedSeq}. The next generated number will be ${26000 + expectedSeq + 1} = ${absoluteMaxReg + 1})`);
    } else {
      const nextReg = 26000 + counterDoc.seq + 1;
      console.log(`Counter exists with sequence value (seq): ${counterDoc.seq}`);
      console.log(`Next registration number that will be assigned: ${nextReg}`);

      const expectedSeq = absoluteMaxReg - 26000;
      if (nextReg <= absoluteMaxReg) {
        console.log(`[ALERT] Counter sequence is out of sync (behind by ${absoluteMaxReg - nextReg + 1} numbers).`);
        console.log('\n=== Resolution Instructions ===');
        console.log(`To correct the Counter document to continue from ${absoluteMaxReg + 1}:`);
        console.log(`Run this command in your MongoDB shell:`);
        console.log(`\x1b[33mdb.counters.updateOne({ id: "student_registration" }, { $set: { seq: ${expectedSeq} } })\x1b[0m`);
      } else {
        console.log('OK: Counter sequence is in sync.');
      }
    }

  } catch (err) {
    console.error('Error during report execution:', err);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
  }
}

run();
