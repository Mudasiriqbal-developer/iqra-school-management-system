const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/User');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Class = require('../models/Class');
const Section = require('../models/Section');
const FeeRecord = require('../models/FeeRecord');

dotenv.config({ path: path.join(__dirname, '../.env') });

const CURRENT_MONTH = '2026-07';

async function seedData() {
  try {
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) {
      console.error('MONGO_URI is not defined');
      process.exit(1);
    }
    await mongoose.connect(mongoURI);
    console.log('Connected to DB successfully.');

    // ==========================================
    // 1. ADD 20 NEW TEACHERS
    // ==========================================
    console.log('\n--- Adding 20 New Teachers ---');
    
    // Find any existing teacher employee IDs to avoid duplicate employeeId errors
    const existingTeachers = await Teacher.find({}, 'employeeId');
    const existingEmpIds = new Set(existingTeachers.map(t => t.employeeId));
    
    let teachersAdded = 0;
    let empCounter = 100; // Start counter at 100

    while (teachersAdded < 20) {
      const empId = `EMP-T-${empCounter}`;
      const email = `teacher.new.${empCounter}@iqraschool.edu`;
      
      // Check if employeeId or email already exists
      const emailExists = await User.findOne({ email });
      if (existingEmpIds.has(empId) || emailExists) {
        empCounter++;
        continue;
      }

      const name = `Teacher Name ${teachersAdded + 1}`;
      const phone = `03123456${empCounter}`;
      
      // Create User
      const user = await User.create({
        name,
        email,
        password: 'teacher123',
        role: 'teacher',
        phone,
        isActivated: true,
        isActive: true,
      });

      // Create Teacher Profile
      await Teacher.create({
        userId: user._id,
        employeeId: empId,
        qualification: 'B.Ed / M.A.',
        joiningDate: new Date(),
        baseSalary: 35000 + (teachersAdded * 500),
      });

      console.log(`Created Teacher: "${name}" | Email: ${email} | EmployeeID: ${empId}`);
      
      teachersAdded++;
      empCounter++;
    }

    // ==========================================
    // 2. ADD 10 STUDENTS IN EVERY GRADE IN SECTION A
    // ==========================================
    console.log('\n--- Adding 10 Students in Section A of Every Grade ---');

    // Get all classes
    const classes = await Class.find({}).sort({ orderIndex: 1 });
    console.log(`Found ${classes.length} classes in database.`);

    // Find starting student registry counter to make sure registration numbers are unique
    const existingStudents = await Student.find({}, 'registrationNumber');
    const existingRegNums = new Set(existingStudents.map(s => s.registrationNumber.toLowerCase()));
    let studentCounter = 1000;

    for (const cls of classes) {
      console.log(`Processing Class: "${cls.name}" (${cls.gender})`);

      // Ensure Section "A" exists for this class
      let secA = await Section.findOne({ name: 'A', classId: cls._id });
      if (!secA) {
        console.log(`  Section "A" not found for class "${cls.name}". Creating Section "A"...`);
        secA = await Section.create({
          name: 'A',
          classId: cls._id,
          orderIndex: 0
        });
      } else {
        console.log(`  Found Section "A" (ID: ${secA._id})`);
      }

      // Add 10 students
      for (let i = 1; i <= 10; i++) {
        // Generate unique registrationNumber
        let regNum = '';
        while (true) {
          regNum = `reg-auto-${studentCounter}`;
          if (!existingRegNums.has(regNum)) {
            existingRegNums.add(regNum);
            break;
          }
          studentCounter++;
        }

        const fullName = `Student ${cls.name} ${cls.gender === 'mixed' ? 'Mixed' : cls.gender === 'female' ? 'Female' : 'Male'} A ${i}`;
        const fatherName = `Father of Student ${i}`;
        const fatherContact = `03001234${studentCounter.toString().slice(-3)}`;
        
        // Determine student gender based on class gender
        let studentGender = 'male';
        if (cls.gender === 'female') {
          studentGender = 'female';
        } else if (cls.gender === 'mixed') {
          // Alternate gender for mixed classes
          studentGender = i % 2 === 0 ? 'female' : 'male';
        }

        // Create User account for student
        await User.create({
          name: fullName,
          registrationNumber: regNum,
          password: 'student123',
          role: 'student',
          phone: fatherContact,
          isActivated: true,
          isActive: true
        });

        // Create Student profile
        const student = await Student.create({
          registrationNumber: regNum,
          fullName,
          fatherName,
          gender: studentGender,
          dateOfBirth: new Date('2018-05-15'),
          fatherContact,
          address: `Street ${i}, Islamabad`,
          classId: cls._id,
          sectionId: secA._id,
          monthlyFeeAmount: 5000,
          status: 'active'
        });

        // Create current month's FeeRecord
        await FeeRecord.create({
          studentId: student._id,
          month: CURRENT_MONTH,
          amountDue: student.monthlyFeeAmount,
          amountPaid: 0,
          status: 'pending',
          payments: []
        });

        studentCounter++;
      }
      console.log(`  Added 10 students to Section A of class "${cls.name}"`);
    }

    console.log('\nSeeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seedData();
