const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Teacher = require('../models/Teacher');
const User = require('../models/User');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function list() {
  try {
    const mongoURI = process.env.MONGO_URI;
    await mongoose.connect(mongoURI);
    const teachers = await Teacher.find().populate('userId');
    teachers.forEach(t => {
      console.log(`Teacher ID: ${t._id} | Name: ${t.userId?.name} | Email: ${t.userId?.email} | EmployeeID: ${t.employeeId}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.connection.close();
  }
}

list();
