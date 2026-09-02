const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const Student = require('./models/Student');
const BookFee = require('./models/BookFee');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB for seeding test legacy documents...');

    // Find any existing student or create a dummy reference
    let student = await Student.findOne();
    if (!student) {
      student = await Student.create({
        registrationNumber: 'TEST-MIG-001',
        fullName: 'Migration Test Student',
        fatherName: 'Father',
        gender: 'male',
        dateOfBirth: new Date('2015-01-01'),
        status: 'active'
      });
    }

    const collection = mongoose.connection.collection('bookfees');
    await collection.deleteMany({});

    const testDocs = [
      {
        student: student._id,
        amount: 3200,
        paid: false,
        dueDate: new Date('2026-04-10'),
        createdAt: new Date()
      },
      {
        student: student._id,
        amount: 2400,
        paid: true,
        paidAt: new Date('2026-03-15'),
        dueDate: new Date('2026-03-10'),
        createdAt: new Date()
      },
      {
        student: student._id,
        amount: 1500,
        paid: false,
        dueDate: new Date('2026-05-10'),
        createdAt: new Date()
      }
    ];

    const result = await collection.insertMany(testDocs);
    console.log(`Successfully seeded ${result.insertedCount} legacy BookFee documents.`);

    const seeded = await collection.find({ _id: { $in: Object.values(result.insertedIds) } }).toArray();
    console.log('\n--- SEEDED LEGACY DOCUMENTS BEFORE MIGRATION ---');
    seeded.forEach((doc, idx) => {
      console.log(`Doc ${idx + 1} [ID: ${doc._id}]: amount = ${doc.amount}, paid = ${doc.paid}, paymentStatus = ${doc.paymentStatus || 'undefined'}, amountPaid = ${doc.amountPaid !== undefined ? doc.amountPaid : 'undefined'}`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seed();
