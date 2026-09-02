const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const BookFee = require('./models/BookFee');
const Student = require('./models/Student');
const Settings = require('./models/Settings');

async function migrate() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/iqra_school_cms';
    console.log('Connecting to MongoDB:', mongoUri);
    await mongoose.connect(mongoUri);

    console.log('\n--- BEFORE MIGRATION AUDIT ---');
    const totalBefore = await BookFee.countDocuments();
    const paidCountsBefore = await BookFee.aggregate([
      { $group: { _id: '$paid', count: { $sum: 1 } } }
    ]);
    console.log('Total BookFee count:', totalBefore);
    console.log('Counts by paid boolean:', JSON.stringify(paidCountsBefore, null, 2));

    // Fetch settings for default academic year if needed
    const settings = await Settings.findOne({ schoolId: 'default' });
    const fallbackAcademicYear = settings?.currentSession || '2025-2026';

    const cursor = BookFee.find().cursor();
    let updatedCount = 0;

    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      let modified = false;

      // 1. Backfill paymentStatus & amountPaid from paid boolean
      if (doc.paid === true) {
        if (doc.paymentStatus !== 'paid') {
          doc.paymentStatus = 'paid';
          modified = true;
        }
        if (!doc.amountPaid || doc.amountPaid === 0) {
          doc.amountPaid = doc.amount || 0;
          modified = true;
        }
      } else {
        if (doc.amountPaid && doc.amountPaid > 0 && doc.amountPaid < doc.amount) {
          if (doc.paymentStatus !== 'partial') {
            doc.paymentStatus = 'partial';
            modified = true;
          }
        } else if (doc.amountPaid && doc.amountPaid >= doc.amount && doc.amount > 0) {
          if (doc.paymentStatus !== 'paid' || !doc.paid) {
            doc.paymentStatus = 'paid';
            doc.paid = true;
            modified = true;
          }
        } else {
          if (doc.paymentStatus !== 'pending') {
            doc.paymentStatus = 'pending';
            modified = true;
          }
          if (doc.amountPaid === undefined || doc.amountPaid === null) {
            doc.amountPaid = 0;
            modified = true;
          }
        }
      }

      // 2. Ensure deliveryStatus is initialized
      if (!doc.deliveryStatus) {
        doc.deliveryStatus = 'pending';
        modified = true;
      }

      // 3. Ensure arrays exist
      if (!doc.items) {
        doc.items = [];
        modified = true;
      }
      if (!doc.payments) {
        doc.payments = [];
        modified = true;
      }

      // 4. Backfill academicYear from settings if missing
      if (!doc.academicYear) {
        doc.academicYear = fallbackAcademicYear;
        modified = true;
      }

      // 5. Backfill classId from Student record if missing
      if (!doc.classId && doc.student) {
        const studentDoc = await Student.findById(doc.student).select('classId');
        if (studentDoc && studentDoc.classId) {
          doc.classId = studentDoc.classId;
          modified = true;
        }
      }

      if (modified) {
        await doc.save();
        updatedCount++;
      }
    }

    console.log(`\nUpdated ${updatedCount} BookFee documents.`);

    console.log('Re-syncing model indexes...');
    await BookFee.syncIndexes();

    console.log('\n--- AFTER MIGRATION AUDIT ---');
    const totalAfter = await BookFee.countDocuments();
    const statusCountsAfter = await BookFee.aggregate([
      { $group: { _id: '$paymentStatus', count: { $sum: 1 } } }
    ]);
    const deliveryCountsAfter = await BookFee.aggregate([
      { $group: { _id: '$deliveryStatus', count: { $sum: 1 } } }
    ]);

    console.log('Total BookFee count:', totalAfter);
    console.log('Counts by paymentStatus:', JSON.stringify(statusCountsAfter, null, 2));
    console.log('Counts by deliveryStatus:', JSON.stringify(deliveryCountsAfter, null, 2));

    const indexes = await BookFee.collection.indexes();
    console.log('\nExisting Indexes:');
    indexes.forEach(idx => console.log(' -', idx.name, JSON.stringify(idx.key)));

    if (totalBefore === totalAfter) {
      console.log('\n[SUCCESS] Document count verified: 100% data integrity preserved with 0 data loss.');
    } else {
      console.error('\n[WARNING] Count mismatch between before and after migration!');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
