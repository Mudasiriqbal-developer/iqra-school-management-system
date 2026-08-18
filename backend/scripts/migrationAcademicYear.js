/**
 * One-time migration script to backfill academicYear on Attendance and Grade records.
 * Run manually: node scripts/migrationAcademicYear.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Settings = require('../models/Settings');
const Attendance = require('../models/Attendance');
const Grade = require('../models/Grade');

const runMigration = async () => {
  try {
    await connectDB();
    console.log('Connected to database.');

    // 1. Read currentSession from Settings
    const settings = await Settings.findOne({ schoolId: 'default' });
    if (!settings || !settings.currentSession) {
      console.error('ERROR: No Settings document found or currentSession is empty. Cannot proceed.');
      process.exit(1);
    }
    const academicYear = settings.currentSession;
    console.log(`Using academic year: "${academicYear}"`);

    // 2. Backfill Attendance records
    const attResult = await Attendance.updateMany(
      { $or: [{ academicYear: { $exists: false } }, { academicYear: '' }] },
      { $set: { academicYear } }
    );
    console.log(`Attendance: ${attResult.modifiedCount} records updated.`);

    // 3. Backfill Grade records
    const gradeResult = await Grade.updateMany(
      { $or: [{ academicYear: { $exists: false } }, { academicYear: '' }] },
      { $set: { academicYear } }
    );
    console.log(`Grades: ${gradeResult.modifiedCount} records updated.`);

    // 4. Drop old Grade unique index and note about new one
    try {
      await Grade.collection.dropIndex('studentId_1_subjectId_1_examType_1');
      console.log('Dropped old Grade unique index (studentId_1_subjectId_1_examType_1).');
    } catch (err) {
      if (err.codeName === 'IndexNotFound') {
        console.log('Old Grade index not found (may already be updated). Skipping drop.');
      } else {
        console.warn('Warning dropping old index:', err.message);
      }
    }

    // The new index { studentId, subjectId, examType, academicYear } will be created
    // automatically by Mongoose when the Grade model loads with ensureIndexes.
    await Grade.ensureIndexes();
    console.log('New Grade index (with academicYear) ensured.');

    console.log('\nMigration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

runMigration();
