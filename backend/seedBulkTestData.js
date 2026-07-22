/**
 * =========================================================================================
 * WARNING: This script is for LOCAL TESTING ONLY.
 * NEVER run this script against a production or Atlas database!
 * =========================================================================================
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

const Class = require('./models/Class');
const Section = require('./models/Section');
const Subject = require('./models/Subject');
const Student = require('./models/Student');
const Teacher = require('./models/Teacher');
const User = require('./models/User');
const FeeRecord = require('./models/FeeRecord');
const Attendance = require('./models/Attendance');
const Grade = require('./models/Grade');
const Assignment = require('./models/Assignment');

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('\n=========================================================================================');
console.log('WARNING: This bulk seed script is for LOCAL TESTING ONLY.');
console.log('NEVER run this script against a production or live cloud database!');
console.log('=========================================================================================\n');

// Sample Pakistani Data Generators
const MALE_NAMES = [
  'Muhammad Ali', 'Hamza Ahmed', 'Usman Tariq', 'Bilal Hassan', 'Omer Farooq',
  'Abdullah Rehan', 'Zain Qureshi', 'Hassan Malik', 'Ahmed Raza', 'Saad Iqbal',
  'Ibrahim Chaudhry', 'Mustafa Khan', 'Taha Mirza', 'Danyal Bhatti', 'Rayyan Yousaf',
  'Yahya Mehmood', 'Rehan Ghaffar', 'Farhan Baig', 'Shahzaib Siddiqui', 'Ammar Pervez'
];

const FEMALE_NAMES = [
  'Fatima Zahra', 'Aisha Khan', 'Zainab Bibi', 'Sara Malik', 'Zoya Ahmed',
  'Hira Shah', 'Sanaa Qureshi', 'Mariam Farooq', 'Areeba Hassan', 'Khadija Rehan',
  'Laiba Chaudhry', 'Anum Bhatti', 'Iqra Yousaf', 'Mahnoor Mehmood', 'Nida Ghaffar',
  'Eshal Baig', 'Minahil Siddiqui', 'Rimsha Pervez', 'Sadia Iqbal', 'Syeda Maryam'
];

const FATHER_NAMES = [
  'Tariq Mahmood', 'Muhammad Usman', 'Syed Ahmad Shah', 'Aamir Khan', 'Kamran Rehan',
  'Rashid Minhas', 'Bilal Siddiqui', 'Faisal Iqbal', 'Chaudhry Pervez', 'Mirza Farooq',
  'Asif Mehmood', 'Javed Iqbal', 'Khalid Hassan', 'Naveed Bhatti', 'Zubair Raza'
];

const TEACHER_PROFILES = [
  { name: 'Dr. Tariq Mahmood', email: 'teacher.tariq@iqra.edu.pk', empId: 'EMP-101', qual: 'Ph.D. Physics', salary: 75000 },
  { name: 'Syed Ahmad Shah', email: 'teacher.ahmad@iqra.edu.pk', empId: 'EMP-102', qual: 'M.Sc. Mathematics', salary: 65000 },
  { name: 'Prof. Muhammad Usman', email: 'teacher.usman@iqra.edu.pk', empId: 'EMP-103', qual: 'M.A. English Literature', salary: 60000 },
  { name: 'Zainab Farooq', email: 'teacher.zainab@iqra.edu.pk', empId: 'EMP-104', qual: 'M.Sc. Chemistry', salary: 58000 },
  { name: 'Sobia Malik', email: 'teacher.sobia@iqra.edu.pk', empId: 'EMP-105', qual: 'M.Sc. Biology', salary: 55000 },
  { name: 'Aamir Khan', email: 'teacher.aamir@iqra.edu.pk', empId: 'EMP-106', qual: 'M.Sc. Computer Science', salary: 62000 },
  { name: 'Dr. Nadia Hassan', email: 'teacher.nadia@iqra.edu.pk', empId: 'EMP-107', qual: 'M.A. Urdu', salary: 52000 },
  { name: 'Kamran Rehan', email: 'teacher.kamran@iqra.edu.pk', empId: 'EMP-108', qual: 'M.Sc. Mathematics', salary: 57000 },
  { name: 'Asma Bibi', email: 'teacher.asma@iqra.edu.pk', empId: 'EMP-109', qual: 'B.Ed. Elementary Education', salary: 48000 },
  { name: 'Rashid Minhas', email: 'teacher.rashid@iqra.edu.pk', empId: 'EMP-110', qual: 'M.Sc. Pakistan Studies', salary: 50000 },
  { name: 'Sadia Pervez', email: 'teacher.sadia@iqra.edu.pk', empId: 'EMP-111', qual: 'M.A. Islamiat', salary: 49000 },
  { name: 'Bilal Siddiqui', email: 'teacher.bilal@iqra.edu.pk', empId: 'EMP-112', qual: 'M.Sc. Physics', salary: 56000 },
  { name: 'Noreen Akhter', email: 'teacher.noreen@iqra.edu.pk', empId: 'EMP-113', qual: 'M.Sc. Chemistry', salary: 54000 },
  { name: 'Faisal Iqbal', email: 'teacher.faisal@iqra.edu.pk', empId: 'EMP-114', qual: 'M.Sc. Computer Science', salary: 61000 },
  { name: 'Bushra Chaudhry', email: 'teacher.bushra@iqra.edu.pk', empId: 'EMP-115', qual: 'M.A. English', salary: 53000 }
];

const seedBulkData = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) {
      console.error('Error: MONGO_URI is not defined in backend/.env');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('Connected successfully.\n');

    // Find an Admin user to associate with createdBy / gradedBy
    let adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('No admin user found. Creating temporary admin user for seeding...');
      adminUser = await User.create({
        name: 'System Admin',
        email: 'admin@iqra.edu.pk',
        password: 'password123',
        role: 'admin',
        isActive: true,
        isActivated: true
      });
    }

    // Load classes, sections, and subjects
    const classes = await Class.find().sort({ orderIndex: 1, createdAt: 1 });
    if (classes.length === 0) {
      console.error('No classes found in DB. Please run node seedClasses.js first.');
      process.exit(1);
    }

    const sections = await Section.find();
    const subjects = await Subject.find();

    console.log(`Found ${classes.length} classes, ${sections.length} sections, and ${subjects.length} subjects in DB.\n`);

    // Ensure every class has basic subjects if subjects are missing
    const defaultSubjectNames = ['Mathematics', 'English', 'Urdu', 'Science'];
    for (const cls of classes) {
      const clsSubjects = subjects.filter(s => s.classId.toString() === cls._id.toString());
      if (clsSubjects.length === 0) {
        console.log(`Class "${cls.name}" has 0 subjects. Seeding default subjects for it...`);
        for (let idx = 0; idx < defaultSubjectNames.length; idx++) {
          const newSub = await Subject.create({
            name: defaultSubjectNames[idx],
            classId: cls._id,
            orderIndex: idx
          });
          subjects.push(newSub);
        }
      }
    }

    // Map sections by classId
    const sectionsByClass = {};
    sections.forEach(sec => {
      const cid = sec.classId.toString();
      if (!sectionsByClass[cid]) sectionsByClass[cid] = [];
      sectionsByClass[cid].push(sec);
    });

    // Map subjects by classId
    const subjectsByClass = {};
    subjects.forEach(sub => {
      const cid = sub.classId.toString();
      if (!subjectsByClass[cid]) subjectsByClass[cid] = [];
      subjectsByClass[cid].push(sub);
    });

    // Counters for final summary
    const summary = {
      teachersCreated: 0,
      teachersSkipped: 0,
      studentsCreated: 0,
      studentsSkipped: 0,
      feeRecordsCreated: 0,
      feeRecordsSkipped: 0,
      attendanceRecordsCreated: 0,
      attendanceRecordsSkipped: 0,
      gradeRecordsCreated: 0,
      gradeRecordsSkipped: 0
    };

    // =========================================================================
    // 1. SEED TEACHERS (~15 Teachers)
    // =========================================================================
    console.log('--- Seeding Dummy Teachers ---');
    const createdTeachers = [];

    for (const prof of TEACHER_PROFILES) {
      let existingUser = await User.findOne({ email: prof.email });
      let existingTeacher = null;

      if (existingUser) {
        existingTeacher = await Teacher.findOne({ userId: existingUser._id });
      }

      if (existingTeacher) {
        summary.teachersSkipped++;
        createdTeachers.push(existingTeacher);
        continue;
      }

      if (!existingUser) {
        existingUser = await User.create({
          name: prof.name,
          email: prof.email,
          password: 'password123',
          role: 'teacher',
          isActive: true,
          isActivated: true
        });
      }

      existingTeacher = await Teacher.create({
        userId: existingUser._id,
        employeeId: prof.empId,
        qualification: prof.qual,
        joiningDate: new Date('2024-01-15'),
        baseSalary: prof.salary
      });

      summary.teachersCreated++;
      createdTeachers.push(existingTeacher);
    }
    console.log(`Teachers: ${summary.teachersCreated} created, ${summary.teachersSkipped} skipped.\n`);

    // Assign class teachers and subject assignments
    let teacherIndex = 0;
    for (const cls of classes) {
      const clsSecs = sectionsByClass[cls._id.toString()] || [];
      const clsSubs = subjectsByClass[cls._id.toString()] || [];

      for (const sec of clsSecs) {
        const assignedTeacher = createdTeachers[teacherIndex % createdTeachers.length];
        teacherIndex++;

        // Assign Class Teacher to section if not assigned
        if (!sec.classTeacherId) {
          try {
            sec.classTeacherId = assignedTeacher._id;
            await sec.save();
          } catch (_) {}
        }

        // Create subject assignments
        for (const sub of clsSubs) {
          const subTeacher = createdTeachers[teacherIndex % createdTeachers.length];
          try {
            await Assignment.create({
              teacherId: subTeacher._id,
              classId: cls._id,
              sectionId: sec._id,
              subjectId: sub._id
            });
          } catch (_) {
            // Index constraint: duplicate assignment skipped safely
          }
        }
      }
    }

    // =========================================================================
    // 2. SEED STUDENTS (~150 Students)
    // =========================================================================
    console.log('--- Seeding Dummy Students (~150) ---');
    const createdStudents = [];
    const TOTAL_TARGET_STUDENTS = 150;
    let studentRegNumCounter = 101;

    for (let i = 0; i < TOTAL_TARGET_STUDENTS; i++) {
      const regNo = `reg-2026-${studentRegNumCounter}`;
      studentRegNumCounter++;

      // Check if student already exists by regNo
      let existingStudent = await Student.findOne({ registrationNumber: regNo });
      if (existingStudent) {
        summary.studentsSkipped++;
        createdStudents.push(existingStudent);
        continue;
      }

      // Pick class sequentially to distribute evenly
      const targetClass = classes[i % classes.length];
      const clsSecs = sectionsByClass[targetClass._id.toString()] || [];
      if (clsSecs.length === 0) continue;
      const targetSection = clsSecs[i % clsSecs.length];

      // Determine gender based on class gender setting
      let gender = 'male';
      if (targetClass.gender === 'female') {
        gender = 'female';
      } else if (targetClass.gender === 'male') {
        gender = 'male';
      } else {
        gender = i % 2 === 0 ? 'male' : 'female';
      }

      const namePool = gender === 'female' ? FEMALE_NAMES : MALE_NAMES;
      const fullName = `${namePool[i % namePool.length]} ${i > 20 ? (i + 1) : ''}`.trim();
      const fatherName = FATHER_NAMES[i % FATHER_NAMES.length];
      const fatherContact = `0300-1234${String(500 + i).padStart(3, '0')}`;
      const monthlyFeeAmount = 2500 + ((i % 6) * 500); // 2500, 3000, 3500, 4000, 4500, 5000

      // Check if User already exists for this registrationNumber
      let studentUser = await User.findOne({ registrationNumber: regNo });
      if (!studentUser) {
        studentUser = await User.create({
          name: fullName,
          registrationNumber: regNo,
          password: 'password123',
          role: 'student',
          isActive: true,
          isActivated: true
        });
      }

      const newStudent = await Student.create({
        registrationNumber: regNo,
        fullName,
        fatherName,
        gender,
        dateOfBirth: new Date(2012 - (i % 6), (i % 12), (i % 28) + 1),
        fatherContact,
        address: `House #${(i * 3) + 10}, Street ${i % 15 + 1}, Sector I-9, Islamabad`,
        classId: targetClass._id,
        sectionId: targetSection._id,
        monthlyFeeAmount,
        status: 'active'
      });

      summary.studentsCreated++;
      createdStudents.push(newStudent);
    }
    console.log(`Students: ${summary.studentsCreated} created, ${summary.studentsSkipped} skipped.\n`);

    // =========================================================================
    // 3. SEED FEE RECORDS (Varied: Paid, Partial, Pending)
    // =========================================================================
    console.log('--- Seeding Fee Records (Paid, Partial, Defaulters) ---');
    const monthsToSeed = ['2026-05', '2026-06', '2026-07'];

    for (const student of createdStudents) {
      for (let mIdx = 0; mIdx < monthsToSeed.length; mIdx++) {
        const monthStr = monthsToSeed[mIdx];
        const existingRecord = await FeeRecord.findOne({
          studentId: student._id,
          month: monthStr,
          type: 'monthly'
        });

        if (existingRecord) {
          summary.feeRecordsSkipped++;
          continue;
        }

        const fee = student.monthlyFeeAmount || 3000;
        let status = 'paid';
        let amountPaid = fee;
        let payments = [];

        // Mix: 50% paid, 25% partial, 25% unpaid (defaulters)
        const selector = (createdStudents.indexOf(student) + mIdx) % 4;

        if (selector === 0 || selector === 1) {
          // Fully Paid
          status = 'paid';
          amountPaid = fee;
          payments = [{
            amount: fee,
            type: 'full',
            method: 'cash',
            paidOn: new Date(`${monthStr}-05T10:00:00Z`)
          }];
        } else if (selector === 2) {
          // Partially Paid
          status = 'partial';
          amountPaid = Math.floor(fee / 2);
          payments = [{
            amount: Math.floor(fee / 2),
            type: 'custom',
            method: 'bank_transfer',
            paidOn: new Date(`${monthStr}-10T14:30:00Z`)
          }];
        } else {
          // Unpaid Defaulter
          status = 'pending';
          amountPaid = 0;
          payments = [];
        }

        await FeeRecord.create({
          studentId: student._id,
          month: monthStr,
          amountDue: fee,
          amountPaid,
          status,
          type: 'monthly',
          payments
        });

        summary.feeRecordsCreated++;
      }
    }
    console.log(`Fee Records: ${summary.feeRecordsCreated} created, ${summary.feeRecordsSkipped} skipped.\n`);

    // =========================================================================
    // 4. SEED ATTENDANCE RECORDS (Past 5 Weekdays)
    // =========================================================================
    console.log('--- Seeding Attendance Records ---');
    
    // Drop old single field unique index "date_1" on attendances if it exists
    try {
      await mongoose.connection.collection('attendances').dropIndex('date_1');
      console.log('Dropped legacy single-field "date_1" index from attendances collection.');
    } catch (_) {}

    const pastDates = [
      new Date('2026-07-20T00:00:00.000Z'),
      new Date('2026-07-21T00:00:00.000Z'),
      new Date('2026-07-22T00:00:00.000Z')
    ];

    // Group students by section
    const studentsBySection = {};
    createdStudents.forEach(st => {
      const secId = st.sectionId.toString();
      if (!studentsBySection[secId]) studentsBySection[secId] = [];
      studentsBySection[secId].push(st);
    });

    for (const secId of Object.keys(studentsBySection)) {
      const secStudents = studentsBySection[secId];
      if (secStudents.length === 0) continue;

      const firstStudent = secStudents[0];
      const targetSection = sections.find(s => s._id.toString() === secId);
      const teacherId = targetSection?.classTeacherId || createdTeachers[0]._id;

      for (const attDate of pastDates) {
        const existingAtt = await Attendance.findOne({
          classId: firstStudent.classId,
          sectionId: firstStudent.sectionId,
          date: attDate
        });

        if (existingAtt) {
          summary.attendanceRecordsSkipped++;
          continue;
        }

        const records = secStudents.map((st, idx) => {
          let status = 'present';
          const r = (idx + attDate.getDate()) % 10;
          if (r === 8) status = 'absent';
          else if (r === 7) status = 'late';
          else if (r === 9) status = 'leave';
          return { studentId: st._id, status };
        });

        try {
          await Attendance.create({
            classId: firstStudent.classId,
            sectionId: firstStudent.sectionId,
            teacherId,
            date: attDate,
            records
          });
          summary.attendanceRecordsCreated++;
        } catch (_) {
          summary.attendanceRecordsSkipped++;
        }
      }
    }
    console.log(`Attendance Records: ${summary.attendanceRecordsCreated} created, ${summary.attendanceRecordsSkipped} skipped.\n`);

    // =========================================================================
    // 5. SEED GRADES (Across Terms for a subset of students)
    // =========================================================================
    console.log('--- Seeding Grade Records ---');
    const terms = ['first_term', 'second_term', 'final_term'];

    for (let sIdx = 0; sIdx < Math.min(createdStudents.length, 60); sIdx++) {
      const student = createdStudents[sIdx];
      const clsSubs = subjectsByClass[student.classId.toString()] || [];

      for (const sub of clsSubs) {
        for (const term of terms) {
          const existingGrade = await Grade.findOne({
            studentId: student._id,
            subjectId: sub._id,
            examType: term
          });

          if (existingGrade) {
            summary.gradeRecordsSkipped++;
            continue;
          }

          const baseMarks = 65 + ((sIdx * 3 + sub.name.length * 5) % 30); // 65 to 95
          const comments = baseMarks > 85 ? 'Excellent work' : baseMarks > 75 ? 'Good performance' : 'Satisfactory';

          try {
            await Grade.create({
              studentId: student._id,
              subjectId: sub._id,
              classId: student.classId,
              sectionId: student.sectionId,
              examType: term,
              marksObtained: baseMarks,
              totalMarks: 100,
              comments,
              gradedBy: adminUser._id
            });
            summary.gradeRecordsCreated++;
          } catch (_) {
            summary.gradeRecordsSkipped++;
          }
        }
      }
    }
    console.log(`Grade Records: ${summary.gradeRecordsCreated} created, ${summary.gradeRecordsSkipped} skipped.\n`);

    // =========================================================================
    // SUMMARY REPORT
    // =========================================================================
    console.log('=========================================================================================');
    console.log('SEEDING SUMMARY REPORT');
    console.log('=========================================================================================');
    console.log(`Teachers:           ${summary.teachersCreated} Created | ${summary.teachersSkipped} Skipped`);
    console.log(`Students:           ${summary.studentsCreated} Created | ${summary.studentsSkipped} Skipped`);
    console.log(`Fee Records:        ${summary.feeRecordsCreated} Created | ${summary.feeRecordsSkipped} Skipped`);
    console.log(`Attendance Entries: ${summary.attendanceRecordsCreated} Created | ${summary.attendanceRecordsSkipped} Skipped`);
    console.log(`Grade Entries:      ${summary.gradeRecordsCreated} Created | ${summary.gradeRecordsSkipped} Skipped`);
    console.log('=========================================================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Bulk Seeding failed:', error);
    process.exit(1);
  }
};

seedBulkData();
