const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Class = require('../models/Class');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const check = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;
    await mongoose.connect(mongoURI);
    const classes = await Class.find().sort({ orderIndex: 1 });
    console.log('Total Classes in DB:', classes.length);
    console.log(classes.map(c => ({ id: c._id, name: c.name, gender: c.gender, orderIndex: c.orderIndex })));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

check();
