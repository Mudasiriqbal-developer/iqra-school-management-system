const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const MONGO_URI = 'mongodb://localhost:27017/iqra_school_management';
const JWT_SECRET = 'IqraSMS@2026#SecureJWT$Mudasir123!Backend';

async function check() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB');

    const User = mongoose.model('User', new mongoose.Schema({
      name: String,
      email: String,
      role: String,
      password: String
    }));

    const users = await User.find();
    console.log('--- Users ---');
    users.forEach(u => {
      console.log(`Name: ${u.name}, Email: ${u.email}, Role: ${u.role}, ID: ${u._id}`);
      
      // Generate a token for this user
      const token = jwt.sign({ id: u._id }, JWT_SECRET, { expiresIn: '7d' });
      console.log(`Token: ${token}\n`);
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.connection.close();
  }
}

check();
