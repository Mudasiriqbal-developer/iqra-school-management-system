const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Teacher = require('../models/Teacher');
const Section = require('../models/Section');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const Assignment = require('../models/Assignment');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const test = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;
    await mongoose.connect(mongoURI);

    const teacher = await Teacher.findOne({ employeeId: 'emp-123' });
    const singleClass = await Class.findOne({ name: 'class 1' });
    const section = await Section.findOne({ name: 'A', classId: singleClass._id });
    const subject = await Subject.findOne({ name: 'English', classId: singleClass._id });

    console.log('Teacher:', teacher?._id);
    console.log('Class:', singleClass?._id);
    console.log('Section:', section?._id);
    console.log('Subject:', subject?._id);

    if (teacher && singleClass && section && subject) {
      try {
        const assignment = await Assignment.create({
          teacherId: teacher._id,
          classId: singleClass._id,
          sectionId: section._id,
          subjectId: subject._id
        });
        console.log('Created Assignment:', assignment);
        // Clean up
        await Assignment.findByIdAndDelete(assignment._id);
        console.log('Deleted Assignment successfully');
      } catch (err) {
        console.error('Error during Assignment.create:', err);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

test();
