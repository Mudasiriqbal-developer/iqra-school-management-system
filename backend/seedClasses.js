const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Class = require('./models/Class');

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '.env') });

const defaultClasses = [
  'Nursery',
  'Prep',
  'Class 1',
  'Class 2',
  'Class 3',
  'Class 4',
  'Class 5',
  'Class 6',
  'Class 7',
  'Class 8',
  'Class 9',
  'Class 10'
];

const seedClasses = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) {
      console.error('Error: MONGO_URI is not defined in backend/.env');
      process.exit(1);
    }

    // Connect to database
    console.log('Connecting to database...');
    await mongoose.connect(mongoURI);
    console.log('Database connected successfully.');

    let createdCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < defaultClasses.length; i++) {
      const className = defaultClasses[i];
      
      // Check if class already exists
      const existingClass = await Class.findOne({ name: className });
      if (existingClass) {
        skippedCount++;
        continue;
      }

      // Create new class
      await Class.create({
        name: className,
        orderIndex: i
      });
      createdCount++;
    }

    console.log('----------------------------------------------------');
    console.log('Class seeding completed!');
    console.log(`Seeded: ${createdCount} classes`);
    console.log(`Skipped (already existed): ${skippedCount} classes`);
    console.log('----------------------------------------------------');

    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedClasses();
