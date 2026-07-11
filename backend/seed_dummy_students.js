const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const Student = require('./models/Student');
const Class = require('./models/Class');
const Section = require('./models/Section');
const FeeRecord = require('./models/FeeRecord');

const seedDummyStudents = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) {
      console.error('Error: MONGO_URI is not defined in backend/.env');
      process.exit(1);
    }

    console.log('Connecting to database...');
    await mongoose.connect(mongoURI);
    console.log('Database connected.');

    // Drop non-sparse email index if it exists to allow sparse index to take effect
    try {
      await mongoose.connection.collection('users').dropIndex('email_1');
      console.log('Dropped email_1 index from users.');
    } catch (err) {
      console.log('email_1 index did not exist or could not be dropped.');
    }

    // 1. Create a Class
    console.log('Creating Class 1...');
    let classObj = await Class.findOne({ name: 'Class 1' });
    if (!classObj) {
      classObj = await Class.create({ name: 'Class 1' });
    }
    console.log(`Class created/found: ${classObj.name} (ID: ${classObj._id})`);

    // 2. Create a Section
    console.log('Creating Section A...');
    let sectionObj = await Section.findOne({ name: 'A', classId: classObj._id });
    if (!sectionObj) {
      sectionObj = await Section.create({
        name: 'A',
        classId: classObj._id,
        capacity: 30,
      });
    }
    console.log(`Section created/found: ${sectionObj.name} (ID: ${sectionObj._id})`);

    // 3. Define dummy students list
    const dummyStudents = [
      {
        registrationNumber: 'stud101',
        fullName: 'Muhammad Ali',
        fatherName: 'Asif Ali',
        gender: 'male',
        dateOfBirth: new Date('2015-04-12'),
        fatherContact: '03001234561',
        address: 'Street 1, G-9, Islamabad',
        classId: classObj._id,
        sectionId: sectionObj._id,
        monthlyFeeAmount: 3500,
        status: 'active',
      },
      {
        registrationNumber: 'stud102',
        fullName: 'Ayesha Khan',
        fatherName: 'Tariq Khan',
        gender: 'female',
        dateOfBirth: new Date('2016-09-05'),
        fatherContact: '03001234562',
        address: 'House 45, F-10, Islamabad',
        classId: classObj._id,
        sectionId: sectionObj._id,
        monthlyFeeAmount: 4000,
        status: 'active',
      },
      {
        registrationNumber: 'stud103',
        fullName: 'Zainab Fatima',
        fatherName: 'Imran Shah',
        gender: 'female',
        dateOfBirth: new Date('2015-11-22'),
        fatherContact: '03001234563',
        address: 'Apartment 3B, E-11, Islamabad',
        classId: classObj._id,
        sectionId: sectionObj._id,
        monthlyFeeAmount: 3800,
        status: 'active',
      },
    ];

    const currentMonth = '2026-07';
    const defaultPassword = 'student123';

    for (const data of dummyStudents) {
      // Clean up existing User & Student if they exist with this reg number
      await User.deleteOne({ registrationNumber: data.registrationNumber.trim() });
      await Student.deleteOne({ registrationNumber: data.registrationNumber.trim() });

      // Create matching User account
      console.log(`Creating User account for Student ${data.fullName} (Reg: ${data.registrationNumber})...`);
      await User.create({
        name: data.fullName,
        registrationNumber: data.registrationNumber.trim(),
        password: defaultPassword,
        role: 'student',
        phone: data.fatherContact,
        isActivated: true,
        isActive: true,
      });

      // Create Student profile
      console.log(`Creating Student profile for ${data.fullName}...`);
      const student = await Student.create(data);

      // Create FeeRecord for current month
      console.log(`Creating FeeRecord for ${data.fullName} for month ${currentMonth}...`);
      await FeeRecord.create({
        studentId: student._id,
        month: currentMonth,
        amountDue: student.monthlyFeeAmount,
        amountPaid: 0,
        status: 'pending',
        payments: [],
      });
    }

    console.log('Dummy students seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding dummy students failed:', error);
    process.exit(1);
  }
};

seedDummyStudents();
