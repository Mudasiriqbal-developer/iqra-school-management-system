const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Class = require('./models/Class');
const Section = require('./models/Section');
const Subject = require('./models/Subject');

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '.env') });

const defaultClasses = [
  'Nursery',
  'Prep',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10'
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

    // Drop old single field unique index on name if it exists
    try {
      await mongoose.connection.collection('classes').dropIndex('name_1');
      console.log('Successfully dropped old single-field "name" unique index.');
    } catch (err) {
      // Index name_1 might not exist or already dropped
      console.log('Old unique index "name_1" not found or already dropped. Proceeding...');
    }

    // Clear existing classes, sections, and subjects to prevent duplicate/corrupt data
    console.log('Cleaning up existing classes, sections, and subjects...');
    await Class.deleteMany({});
    await Section.deleteMany({});
    await Subject.deleteMany({});
    console.log('Cleanup completed.');

    let createdCount = 0;

    for (let i = 0; i < defaultClasses.length; i++) {
      const className = defaultClasses[i];

      // Create mixed-gender class
      const newClass = await Class.create({
        name: className,
        gender: 'mixed',
        orderIndex: i
      });

      // Automatically create default Section "A" for the seeded class
      await Section.create({
        name: 'A',
        classId: newClass._id,
        orderIndex: 0
      });

      createdCount++;
    }

    console.log('----------------------------------------------------');
    console.log('Class seeding completed!');
    console.log(`Seeded: ${createdCount} mixed-gender classes`);
    console.log('All previous classes, sections, and subjects have been cleaned.');
    console.log('----------------------------------------------------');

    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedClasses();
