const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

const User = require('../models/User');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Class = require('../models/Class');
const Section = require('../models/Section');
const Subject = require('../models/Subject');
const Assignment = require('../models/Assignment');
const Attendance = require('../models/Attendance');
const Grade = require('../models/Grade');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const cleanup = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB successfully.');

    // 1. Clean up Teacher profiles with missing/invalid userId
    const teachers = await Teacher.find();
    let orphanedTeachersCount = 0;
    for (const teacher of teachers) {
      const userExists = await User.findById(teacher.userId);
      if (!userExists) {
        console.log(`Deleting orphaned teacher profile: ID ${teacher._id}, employeeId ${teacher.employeeId}`);
        await Teacher.findByIdAndDelete(teacher._id);
        orphanedTeachersCount++;
        
        // Also unassign this teacher from any sections
        const updatedSections = await Section.updateMany(
          { classTeacherId: teacher._id },
          { $unset: { classTeacherId: '' } }
        );
        if (updatedSections.modifiedCount > 0) {
          console.log(`Unassigned deleted teacher ${teacher._id} from ${updatedSections.modifiedCount} section(s).`);
        }
      }
    }
    console.log(`Cleaned up ${orphanedTeachersCount} orphaned teacher profile(s).`);

    // 2. Clean up Student profiles with missing/invalid userId or classId
    const students = await Student.find();
    let orphanedStudentsCount = 0;
    for (const student of students) {
      const userExists = await User.findById(student.userId);
      const classExists = await Class.findById(student.classId);
      if (!userExists || !classExists) {
        console.log(`Deleting orphaned student profile: ID ${student._id}, name ${student.fullName}`);
        await Student.findByIdAndDelete(student._id);
        if (userExists) {
          // Soft delete or delete user account too if student profile is deleted? 
          // Usually, it's safer to keep user or delete if it's orphaned. Let's delete user if profile is missing, but here user exists and profile had missing classId. Let's delete user account too to be clean.
          await User.findByIdAndDelete(student.userId);
        }
        orphanedStudentsCount++;
      }
    }
    console.log(`Cleaned up ${orphanedStudentsCount} orphaned student profile(s).`);

    // 3. Clean up Section references to deleted classes or teachers
    const sections = await Section.find();
    let fixedSectionsCount = 0;
    for (const sec of sections) {
      const classExists = await Class.findById(sec.classId);
      if (!classExists) {
        console.log(`Deleting section with missing class: ID ${sec._id}, name ${sec.name}`);
        await Section.findByIdAndDelete(sec._id);
        fixedSectionsCount++;
        continue;
      }
      
      if (sec.classTeacherId) {
        const teacherExists = await Teacher.findById(sec.classTeacherId);
        if (!teacherExists) {
          console.log(`Removing invalid classTeacherId from section: ID ${sec._id}, name ${sec.name}`);
          sec.classTeacherId = undefined;
          await sec.save();
          fixedSectionsCount++;
        }
      }
    }
    console.log(`Cleaned up/fixed ${fixedSectionsCount} section document(s).`);

    // 4. Clean up Subject references to deleted classes
    const subjects = await Subject.find();
    let deletedSubjectsCount = 0;
    for (const sub of subjects) {
      const classExists = await Class.findById(sub.classId);
      if (!classExists) {
        console.log(`Deleting subject with missing class: ID ${sub._id}, name ${sub.name}`);
        await Subject.findByIdAndDelete(sub._id);
        deletedSubjectsCount++;
      }
    }
    console.log(`Cleaned up ${deletedSubjectsCount} subject document(s).`);

    // 5. Clean up Assignments with missing components
    const assignments = await Assignment.find();
    let deletedAssignmentsCount = 0;
    for (const asg of assignments) {
      const teacherExists = await Teacher.findById(asg.teacherId);
      const classExists = await Class.findById(asg.classId);
      const sectionExists = await Section.findById(asg.sectionId);
      const subjectExists = await Subject.findById(asg.subjectId);
      
      if (!teacherExists || !classExists || !sectionExists || !subjectExists) {
        console.log(`Deleting invalid assignment: ID ${asg._id}`);
        await Assignment.findByIdAndDelete(asg._id);
        deletedAssignmentsCount++;
      }
    }
    console.log(`Cleaned up ${deletedAssignmentsCount} invalid assignment document(s).`);

    console.log('Database cleanup completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error during database cleanup:', error);
    process.exit(1);
  }
};

cleanup();
