const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');

const Class = require('../models/Class');
const Section = require('../models/Section');
const Student = require('../models/Student');
const Family = require('../models/Family');
const FeeRecord = require('../models/FeeRecord');
const BookFee = require('../models/BookFee');
const User = require('../models/User');
const Counter = require('../models/Counter');

const { createFamilyWithEnrollment } = require('../controllers/familyController');

const mockRequest = (params = {}, body = {}, user = {}) => ({
  params,
  body,
  user
});

const mockResponse = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.body = data;
    return res;
  };
  return res;
};

const mockNext = (err) => {
  if (err) throw err;
};

test.describe('Family Pass 3 Enrollment Controller Tests', () => {
  let testClass, testSection, existingStudent, otherFamily;

  test.before(async () => {
    const productionUri = process.env.MONGO_URI;
    if (!productionUri) {
      throw new Error('MONGO_URI is missing in .env');
    }
    const testUri = productionUri.includes('/iqra_school_management')
      ? productionUri.replace('/iqra_school_management', '/iqra_school_management_test')
      : productionUri + '_test';
      
    await mongoose.connect(testUri);
    console.log(`Connected to test DB: ${mongoose.connection.host}/${mongoose.connection.name}`);
  });

  test.after(async () => {
    await mongoose.disconnect();
    console.log('Disconnected from test DB.');
  });

  test.beforeEach(async () => {
    await Promise.all([
      Class.deleteMany({}),
      Section.deleteMany({}),
      Student.deleteMany({}),
      Family.deleteMany({}),
      FeeRecord.deleteMany({}),
      BookFee.deleteMany({}),
      User.deleteMany({}),
      Counter.deleteMany({})
    ]);

    // 1. Seed Class & Section
    testClass = await Class.create({ name: 'Class 1', gender: 'mixed' });
    testSection = await Section.create({ name: 'A', classId: testClass._id });

    // 2. Create an existing student
    existingStudent = await Student.create({
      registrationNumber: 'stud-exist',
      fullName: 'Ahmed Iqbal',
      fatherName: 'Iqbal',
      gender: 'male',
      dateOfBirth: new Date('2015-05-05'),
      fatherContact: '03001234567',
      classId: testClass._id,
      sectionId: testSection._id,
      monthlyFeeAmount: 5000,
      status: 'active'
    });

    // 3. Create another family for testing link constraints
    otherFamily = await Family.create({
      familyName: 'Other Household',
      contactNumber: '03009999999',
      students: []
    });
  });

  test('Happy path: 1 existing + 2 new students, family created, BookFee records created', async () => {
    const reqBody = {
      familyName: 'Iqbal Household',
      address: 'House 123, Islamabad',
      contactInfo: '03001234567',
      members: [
        {
          mode: 'existing',
          studentId: existingStudent._id
        },
        {
          mode: 'new',
          studentData: {
            name: 'Fatima Iqbal',
            dateOfBirth: '2018-09-09',
            gender: 'female',
            classId: testClass._id,
            sectionId: testSection._id,
            parentName: 'Iqbal',
            fatherContact: '03001234567'
          },
          feeConfig: {
            monthlyFee: 4500,
            bookFee: 2000,
            bookFeeDueDate: '2026-10-10'
          }
        },
        {
          mode: 'new',
          studentData: {
            name: 'Ali Iqbal',
            dateOfBirth: '2020-01-01',
            gender: 'male',
            classId: testClass._id,
            sectionId: testSection._id,
            parentName: 'Iqbal',
            fatherContact: '03001234567'
          },
          feeConfig: {
            monthlyFee: 4000,
            bookFee: 0 // no book fee
          }
        }
      ]
    };

    const req = mockRequest({}, reqBody, { id: new mongoose.Types.ObjectId().toString() });
    const res = mockResponse();

    await createFamilyWithEnrollment(req, res, mockNext);

    console.log('DEBUG RES.BODY:', JSON.stringify(res.body, null, 2));
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.family);
    assert.strictEqual(res.body.createdStudents.length, 2);

    // Verify family document structure
    const familyInDb = await Family.findById(res.body.family._id);
    assert.ok(familyInDb);
    assert.strictEqual(familyInDb.students.length, 3);
    assert.strictEqual(familyInDb.familyName, 'Iqbal Household');
    assert.strictEqual(familyInDb.contactNumber, '03001234567');

    // Verify existing student has new familyId
    const updatedExisting = await Student.findById(existingStudent._id);
    assert.strictEqual(updatedExisting.familyId.toString(), familyInDb._id.toString());

    // Verify new students created in DB
    const fatima = await Student.findOne({ fullName: 'Fatima Iqbal' });
    assert.ok(fatima);
    assert.strictEqual(fatima.registrationNumber, '26001');
    assert.strictEqual(fatima.familyId.toString(), familyInDb._id.toString());

    const ali = await Student.findOne({ fullName: 'Ali Iqbal' });
    assert.ok(ali);
    assert.strictEqual(ali.registrationNumber, '26002');
    assert.strictEqual(ali.familyId.toString(), familyInDb._id.toString());

    // Verify User documents created
    const fatimaUser = await User.findOne({ registrationNumber: '26001' });
    assert.ok(fatimaUser);
    assert.strictEqual(fatimaUser.role, 'student');

    // Verify FeeRecord was lazy loaded/created
    const fatimaFeeRecord = await FeeRecord.findOne({ studentId: fatima._id, type: 'monthly' });
    assert.ok(fatimaFeeRecord);
    assert.strictEqual(fatimaFeeRecord.amountDue, 4500);

    const aliFeeRecord = await FeeRecord.findOne({ studentId: ali._id, type: 'monthly' });
    assert.ok(aliFeeRecord);
    assert.strictEqual(aliFeeRecord.amountDue, 4000);

    // Verify BookFee records
    const fatimaBookFee = await BookFee.findOne({ student: fatima._id });
    assert.ok(fatimaBookFee);
    assert.strictEqual(fatimaBookFee.amount, 2000);
    assert.strictEqual(new Date(fatimaBookFee.dueDate).toISOString().split('T')[0], '2026-10-10');

    const aliBookFee = await BookFee.findOne({ student: ali._id });
    assert.strictEqual(aliBookFee, null); // should not exist since bookFee = 0
  });

  test('Rollback path: force a duplicate registration number and assert zero database changes persist', async () => {
    // 1. Pre-insert a student with registration number 26002
    await Student.create({
      registrationNumber: '26002',
      fullName: 'Pre-existing Duplicate Reg',
      fatherName: 'Dup Father',
      gender: 'male',
      dateOfBirth: new Date('2015-05-05'),
      fatherContact: '03009999999',
      classId: testClass._id,
      sectionId: testSection._id,
      monthlyFeeAmount: 5000,
      status: 'active'
    });

    // 2. Prepare request with 2 new students.
    // The sequence starts at 26000.
    // 1st student gets 26001 (success).
    // 2nd student gets 26002 (should trigger duplicate key error on Student write).
    const reqBody = {
      familyName: 'Rollback Household',
      address: 'House 456, Lahore',
      contactInfo: '03007654321',
      members: [
        {
          mode: 'new',
          studentData: {
            name: 'Rollback Student 1',
            dateOfBirth: '2018-09-09',
            gender: 'female',
            classId: testClass._id,
            sectionId: testSection._id,
            parentName: 'Rollback Parent',
            fatherContact: '03007654321'
          },
          feeConfig: {
            monthlyFee: 3000,
            bookFee: 1500,
            bookFeeDueDate: '2026-11-11'
          }
        },
        {
          mode: 'new',
          studentData: {
            name: 'Rollback Student 2',
            dateOfBirth: '2019-10-10',
            gender: 'male',
            classId: testClass._id,
            sectionId: testSection._id,
            parentName: 'Rollback Parent',
            fatherContact: '03007654321'
          },
          feeConfig: {
            monthlyFee: 3500,
            bookFee: 1000,
            bookFeeDueDate: '2026-11-11'
          }
        }
      ]
    };

    const req = mockRequest({}, reqBody, { id: new mongoose.Types.ObjectId().toString() });
    const res = mockResponse();

    await createFamilyWithEnrollment(req, res, mockNext);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.message.includes('unique constraint') || res.body.message.includes('duplicate key') || res.body.message.includes('registration number'));

    // Assert that NO family was created
    const familyCount = await Family.countDocuments({ familyName: 'Rollback Household' });
    assert.strictEqual(familyCount, 0);

    // Assert that Student 1 (Rollback Student 1, 26001) was NOT saved
    const student1 = await Student.findOne({ fullName: 'Rollback Student 1' });
    assert.strictEqual(student1, null);

    // Assert that no BookFee was saved
    const bookFeeCount = await BookFee.countDocuments({});
    assert.strictEqual(bookFeeCount, 0);

    // Assert that no FeeRecord was saved for 26001
    const feeRecordCount = await FeeRecord.countDocuments({ type: 'monthly' });
    assert.strictEqual(feeRecordCount, 0);

    // Assert no User document for 26001 was saved
    const userCount = await User.countDocuments({ registrationNumber: '26001' });
    assert.strictEqual(userCount, 0);
  });

  test('One-family-per-student: fails if existing student is already in another family', async () => {
    // 1. Link the existing student to otherFamily
    existingStudent.familyId = otherFamily._id;
    await existingStudent.save();

    otherFamily.students = [existingStudent._id];
    await otherFamily.save();

    // 2. Try to create family with this existing student
    const reqBody = {
      familyName: 'New Iqbal Family',
      address: 'House 789, Peshawar',
      contactInfo: '03001234567',
      members: [
        {
          mode: 'existing',
          studentId: existingStudent._id
        },
        {
          mode: 'new',
          studentData: {
            name: 'New Baby Student',
            dateOfBirth: '2021-01-01',
            gender: 'male',
            classId: testClass._id,
            sectionId: testSection._id,
            parentName: 'Iqbal',
            fatherContact: '03001234567'
          },
          feeConfig: {
            monthlyFee: 2000
          }
        }
      ]
    };

    const req = mockRequest({}, reqBody, { id: new mongoose.Types.ObjectId().toString() });
    const res = mockResponse();

    await createFamilyWithEnrollment(req, res, mockNext);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.errors);

    // Assert specific error in the memberErrors array
    const errorObj = res.body.errors.find(e => e.index === 0);
    assert.ok(errorObj);
    assert.ok(errorObj.errors[0].includes('already linked to family'));

    // Assert that the new family was not created and new student was not saved
    const familyExists = await Family.findOne({ familyName: 'New Iqbal Family' });
    assert.strictEqual(familyExists, null);

    const studentExists = await Student.findOne({ fullName: 'New Baby Student' });
    assert.strictEqual(studentExists, null);
  });

  test('Concurrency: overlapping requests create students with unique registration numbers', async () => {
    const req1 = mockRequest({}, {
      familyName: 'Concurrent Fam 1',
      address: 'Address 1',
      contactInfo: '03001111111',
      members: [
        {
          mode: 'new',
          studentData: {
            name: 'Student X',
            dateOfBirth: '2015-01-01',
            gender: 'male',
            classId: testClass._id,
            sectionId: testSection._id,
            parentName: 'Parent X',
            fatherContact: '03001111111'
          },
          feeConfig: { monthlyFee: 3000 }
        }
      ]
    }, { id: new mongoose.Types.ObjectId().toString() });

    const req2 = mockRequest({}, {
      familyName: 'Concurrent Fam 2',
      address: 'Address 2',
      contactInfo: '03002222222',
      members: [
        {
          mode: 'new',
          studentData: {
            name: 'Student Y',
            dateOfBirth: '2015-02-02',
            gender: 'female',
            classId: testClass._id,
            sectionId: testSection._id,
            parentName: 'Parent Y',
            fatherContact: '03002222222'
          },
          feeConfig: { monthlyFee: 4000 }
        }
      ]
    }, { id: new mongoose.Types.ObjectId().toString() });

    const res1 = mockResponse();
    const res2 = mockResponse();

    // Trigger concurrently
    await Promise.all([
      createFamilyWithEnrollment(req1, res1, mockNext),
      createFamilyWithEnrollment(req2, res2, mockNext)
    ]);

    console.log('CONCURRENCY RES1:', JSON.stringify(res1.body, null, 2));
    console.log('CONCURRENCY RES2:', JSON.stringify(res2.body, null, 2));
    assert.strictEqual(res1.statusCode, 201);
    assert.strictEqual(res2.statusCode, 201);

    const studentX = await Student.findOne({ fullName: 'Student X' });
    const studentY = await Student.findOne({ fullName: 'Student Y' });

    assert.ok(studentX);
    assert.ok(studentY);
    assert.notStrictEqual(studentX.registrationNumber, studentY.registrationNumber);

    const regX = parseInt(studentX.registrationNumber, 10);
    const regY = parseInt(studentY.registrationNumber, 10);

    assert.ok(regX === 26001 || regX === 26002);
    assert.ok(regY === 26001 || regY === 26002);
  });
});
