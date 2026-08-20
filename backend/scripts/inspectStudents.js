const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Student = require('../models/Student');

const run = async () => {
  try {
    await connectDB();
    console.log('Connected to database.');

    const students = await Student.find({}, 'registrationNumber fullName').limit(30).lean();
    console.log('Sample registration numbers:');
    console.log(students);

    const counts = await Student.countDocuments();
    console.log(`Total students in DB: ${counts}`);

    process.exit(0);
  } catch (error) {
    console.error('Inspection failed:', error);
    process.exit(1);
  }
};

run();
