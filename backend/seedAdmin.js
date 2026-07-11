const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('./models/User');

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '.env') });

const seedAdmin = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) {
      console.error('Error: MONGO_URI is not defined in backend/.env');
      process.exit(1);
    }

    // Connect to database
    console.log('Connecting to database...');
    await mongoose.connect(mongoURI);
    console.log('Database connected successfully.');

    // Fetch credentials from .env or fallback to defaults
    const email = process.env.SEED_ADMIN_EMAIL || 'admin@ihass.edu';
    const password = process.env.SEED_ADMIN_PASSWORD || 'admin123456';
    const name = 'System Administrator';

    // Check if an admin already exists
    const adminExists = await User.findOne({ role: 'admin' });
    if (adminExists) {
      console.log(`An admin account already exists (${adminExists.email}). Seeding skipped.`);
      process.exit(0);
    }

    // Create the admin account
    // Note: The password will be hashed automatically in the User pre-save hook
    await User.create({
      name,
      email,
      password,
      role: 'admin',
      isActivated: true,
      isActive: true,
    });

    console.log('----------------------------------------------------');
    console.log('Admin user seeded successfully!');
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log('Please change this password after your first login.');
    console.log('----------------------------------------------------');
    
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedAdmin();
