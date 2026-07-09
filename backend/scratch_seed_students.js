const mongoose = require('mongoose');
const Student = require('./models/Student');
const FeeRecord = require('./models/FeeRecord');

const MONGO_URI = 'mongodb://localhost:27017/iqra_school_management';
const classId = '6a4e303033c925262e56d074'; // Grade 1
const sectionId = '6a4e303e33c925262e56d087'; // Section Female

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB');

    // Clean up any old test students to keep database clean
    await Student.deleteMany({ fullName: { $regex: '^Test Student ' } });
    console.log('Cleaned old test students');

    const studentsToCreate = [
      // 2 Free Students (monthlyFeeAmount = 0)
      { name: 'Test Student Free One', reg: 'REG-201', fee: 0 },
      { name: 'Test Student Free Two', reg: 'REG-202', fee: 0 },
      // 3 Discounted Students (30% discount on 5000 -> 3500)
      { name: 'Test Student Discount One', reg: 'REG-203', fee: 3500 },
      { name: 'Test Student Discount Two', reg: 'REG-204', fee: 3500 },
      { name: 'Test Student Discount Three', reg: 'REG-205', fee: 3500 },
      // 5 Full Paying Students (100% fee -> 5000)
      { name: 'Test Student Full One', reg: 'REG-206', fee: 5000 },
      { name: 'Test Student Full Two', reg: 'REG-207', fee: 5000 },
      { name: 'Test Student Full Three', reg: 'REG-208', fee: 5000 },
      { name: 'Test Student Full Four', reg: 'REG-209', fee: 5000 },
      { name: 'Test Student Full Five', reg: 'REG-210', fee: 5000 },
    ];

    const currentMonth = '2026-07';

    for (const item of studentsToCreate) {
      // 1. Create Student
      const student = await Student.create({
        registrationNumber: item.reg,
        fullName: item.name,
        fatherName: 'Test Father',
        gender: 'female',
        dateOfBirth: new Date('2018-05-15'),
        fatherContact: '03001234567',
        classId,
        sectionId,
        monthlyFeeAmount: item.fee,
        status: 'active'
      });

      console.log(`Created Student: ${student.fullName} (Reg: ${student.registrationNumber}, Fee: ${student.monthlyFeeAmount})`);

      // 2. Create Current Month FeeRecord
      const status = item.fee === 0 ? 'paid' : 'pending';
      const record = await FeeRecord.create({
        studentId: student._id,
        month: currentMonth,
        amountDue: student.monthlyFeeAmount,
        amountPaid: 0,
        status,
        payments: []
      });

      console.log(`Created FeeRecord for ${student.fullName}: month: ${record.month}, amountDue: ${record.amountDue}, status: ${record.status}`);
    }

    console.log('All 10 students and fee records seeded successfully!');

  } catch (err) {
    console.error('Error during seeding:', err);
  } finally {
    await mongoose.connection.close();
  }
}

seed();
