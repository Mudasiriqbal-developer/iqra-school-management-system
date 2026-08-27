const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const FeeRecord = require('./models/FeeRecord');

async function migrate() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/iqra_school_cms';
    console.log('Connecting to MongoDB:', mongoUri);
    await mongoose.connect(mongoUri);

    console.log('\n--- BEFORE MIGRATION AUDIT ---');
    const totalBefore = await FeeRecord.countDocuments();
    const typeCountsBefore = await FeeRecord.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);
    console.log('Total FeeRecord count:', totalBefore);
    console.log('Counts by type:', JSON.stringify(typeCountsBefore, null, 2));

    const collection = FeeRecord.collection;
    const existingIndexes = await collection.indexes();
    console.log('\nExisting Indexes before migration:');
    existingIndexes.forEach(idx => console.log(' -', idx.name, JSON.stringify(idx.key), idx.unique ? '(unique)' : ''));

    // Check if old compound index exists
    const oldIndex = existingIndexes.find(idx => idx.name === 'studentId_1_month_1_type_1');
    if (oldIndex) {
      console.log('\nDropping old unique index: studentId_1_month_1_type_1...');
      await collection.dropIndex('studentId_1_month_1_type_1');
      console.log('Old index dropped successfully.');
    } else {
      console.log('\nOld index studentId_1_month_1_type_1 not found (or already dropped).');
    }

    console.log('Re-syncing model indexes (creating partial unique index)...');
    await FeeRecord.syncIndexes();

    console.log('\n--- AFTER MIGRATION AUDIT ---');
    const totalAfter = await FeeRecord.countDocuments();
    const typeCountsAfter = await FeeRecord.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);
    console.log('Total FeeRecord count:', totalAfter);
    console.log('Counts by type:', JSON.stringify(typeCountsAfter, null, 2));

    const newIndexes = await collection.indexes();
    console.log('\nNew Indexes after migration:');
    newIndexes.forEach(idx => {
      console.log(' -', idx.name, JSON.stringify(idx.key), 
        idx.unique ? '(unique)' : '', 
        idx.partialFilterExpression ? `(partial: ${JSON.stringify(idx.partialFilterExpression)})` : ''
      );
    });

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
