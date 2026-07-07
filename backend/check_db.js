const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://localhost:27017/iqra_school_management';

async function check() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB');

    // Load models
    const Class = mongoose.model('Class', new mongoose.Schema({ name: String }));
    const Section = mongoose.model('Section', new mongoose.Schema({ name: String }));
    const Subject = mongoose.model('Subject', new mongoose.Schema({ name: String }));
    const Teacher = mongoose.model('Teacher', new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } }));
    const User = mongoose.model('User', new mongoose.Schema({ name: String, role: String }));
    
    const Assignment = mongoose.model('Assignment', new mongoose.Schema({
      teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
      classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
      sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
      subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }
    }));

    const Attendance = mongoose.model('Attendance', new mongoose.Schema({
      date: String,
      records: Array
    }));

    const classes = await Class.find();
    console.log('--- Classes ---');
    classes.forEach(c => console.log(`${c.name}: ${c._id}`));

    const sections = await Section.find();
    console.log('\n--- Sections ---');
    sections.forEach(s => console.log(`${s.name}: ${s._id}`));

    const subjects = await Subject.find();
    console.log('\n--- Subjects ---');
    subjects.forEach(s => console.log(`${s.name}: ${s._id}`));

    const assignments = await Assignment.find()
      .populate({ path: 'teacherId', populate: { path: 'userId' } })
      .populate('classId')
      .populate('sectionId')
      .populate('subjectId');
    
    console.log('\n--- Assignments ---');
    assignments.forEach(a => {
      console.log(`Teacher: ${a.teacherId?.userId?.name || 'N/A'}, Class: ${a.classId?.name}, Section: ${a.sectionId?.name}, Subject: ${a.subjectId?.name}`);
      console.log(`IDs - Class: ${a.classId?._id}, Section: ${a.sectionId?._id}, Subject: ${a.subjectId?._id}`);
    });

    const attendances = await Attendance.find();
    console.log('\n--- Attendance Records in DB ---');
    console.log(`Found ${attendances.length} records`);
    attendances.forEach(att => {
      console.log(`Date: ${att.date}, Records Count: ${att.records?.length}`);
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.connection.close();
  }
}

check();
