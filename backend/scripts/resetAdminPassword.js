const dotenv = require('dotenv');

if (process.env.NODE_ENV === 'production') {
  dotenv.config({ path: '.env.production' });
} else {
  dotenv.config({ path: '.env.local' });
}

const mongoose = require('mongoose');
const User = require('../models/User');

async function resetPassword() {
  const args = process.argv.slice(2);
  const targetEmail = args[0] ? args[0].trim().toLowerCase() : 'iqbal@gamil.com';
  const newPassword = args[1] || 'HaroonAdmin123!';

  if (newPassword.length < 8) {
    console.error('Error: Password must be at least 8 characters long.');
    process.exit(1);
  }

  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/ihass';
    console.log(`Connecting to MongoDB... (${process.env.NODE_ENV || 'development'})`);
    await mongoose.connect(mongoUri);

    const user = await User.findOne({ email: targetEmail });
    if (!user) {
      console.error(`User with email "${targetEmail}" not found.`);
      process.exit(1);
    }

    // Set plain password and activation fields (User pre-save hook will hash password once)
    user.password = newPassword;
    user.isActivated = true;
    user.isActive = true;
    user.activationTokenHash = null;
    user.activationTokenExpires = null;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await user.save();

    console.log('----------------------------------------------------');
    console.log(`Successfully reset and activated administrator:`);
    console.log(`Name:        ${user.name}`);
    console.log(`Email:       ${user.email}`);
    console.log(`Role:        ${user.role}`);
    console.log(`Password:    ${newPassword}`);
    console.log(`isActivated: ${user.isActivated}`);
    console.log('----------------------------------------------------');
    process.exit(0);
  } catch (error) {
    console.error('Failed to reset admin password:', error);
    process.exit(1);
  }
}

resetPassword();
