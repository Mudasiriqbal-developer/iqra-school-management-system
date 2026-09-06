const mongoose = require('mongoose');

/**
 * Connects to MongoDB database using Mongoose.
 * If MONGO_URI is missing or connection fails, logs the error and returns
 * without crashing the process.
 */
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoURI) {
      console.error('Database connection error: MONGODB_URI is not defined in .env');
      return;
    }
    
    const conn = await mongoose.connect(mongoURI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log('Connected to:', process.env.MONGODB_URI);
  } catch (error) {
    console.error(`Database connection failed: ${error.message}`);
  }
};

module.exports = connectDB;
