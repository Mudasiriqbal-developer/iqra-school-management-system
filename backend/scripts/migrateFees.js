require('dotenv').config();
const mongoose = require('mongoose');
const Class = require('../models/Class');
const Student = require('../models/Student');

async function runMigration() {
  console.log('--- Starting Fee Architecture Migration ---');
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/iqra-school';
  await mongoose.connect(mongoUri);

  // 1. Migrate Classes
  const totalClassesBefore = await Class.countDocuments();
  const classesUnset = await Class.countDocuments({ defaultFee: { $exists: false } });
  console.log(`Total Classes: ${totalClassesBefore} (Classes missing defaultFee: ${classesUnset})`);

  await Class.updateMany(
    { $or: [{ defaultFee: { $exists: false } }, { defaultFee: null }] },
    { $set: { defaultFee: 0 } }
  );

  const classes = await Class.find().sort({ orderIndex: 1, name: 1 });
  console.log('\nClass Default Fee Status after migration:');
  classes.forEach(c => {
    console.log(` - Class: ${c.name} (${c.gender}) -> defaultFee = Rs. ${c.defaultFee}`);
  });

  // 2. Migrate Students
  const totalStudentsBefore = await Student.countDocuments();
  const studentsUnsetCustom = await Student.countDocuments({ customFee: { $exists: false } });
  console.log(`\nTotal Students: ${totalStudentsBefore} (Students missing customFee field: ${studentsUnsetCustom})`);

  await Student.updateMany(
    { customFee: { $exists: false } },
    { $set: { customFee: null, customFeeNote: null } }
  );

  const totalStudentsWithCustom = await Student.countDocuments({ customFee: { $ne: null } });
  const totalStudentsWithDefault = await Student.countDocuments({ customFee: null });
  console.log(`Students with customFee override: ${totalStudentsWithCustom}`);
  console.log(`Students using class defaultFee: ${totalStudentsWithDefault}`);

  console.log('\n--- Migration Complete Successfully ---');
  await mongoose.disconnect();
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
