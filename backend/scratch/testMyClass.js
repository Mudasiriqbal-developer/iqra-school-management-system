const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Teacher = require('../models/Teacher');
const Section = require('../models/Section');
const Class = require('../models/Class');
const User = require('../models/User');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const test = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;
    await mongoose.connect(mongoURI);

    const user = await User.findOne({ email: 'mromertariq@gmail.com' });
    console.log('User found:', user);

    const teacher = await Teacher.findOne({ userId: user._id });
    console.log('Teacher profile:', teacher);

    if (teacher) {
      const section = await Section.findOne({ classTeacherId: teacher._id }).populate('classId', 'name');
      console.log('Section found for teacher:', section);
    }

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

test();
