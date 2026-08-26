const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');

const Class = require('../models/Class');
const Section = require('../models/Section');
const Student = require('../models/Student');
const FeeRecord = require('../models/FeeRecord');
const Expense = require('../models/Expense');
const Payroll = require('../models/Payroll');
const { getFeeSummary } = require('../controllers/feeController');

const mockRequest = () => ({ query: {} });

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

test.describe('Fee Summary Controller Math Tests', () => {
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
      FeeRecord.deleteMany({}),
      Expense.deleteMany({}),
      Payroll.deleteMany({})
    ]);
  });

  test('should accurately calculate totalStudents, totalFeeExpected, totalCollected, partialAmount, partialCount, and netPL', async () => {
    // 1. Seed Class & Section
    const testClass = await Class.create({ name: 'Class 1', gender: 'mixed' });
    const testSection = await Section.create({ name: 'A', classId: testClass._id });

    // 2. Seed active students
    // A. Unpaid student: fee amount = 5000, no initial FeeRecord (it will be lazy-generated with amountPaid = 0, status pending)
    await Student.create({
      registrationNumber: 'unpaid1',
      fullName: 'Unpaid Student',
      fatherName: 'Father Unpaid',
      gender: 'male',
      dateOfBirth: new Date('2015-05-05'),
      fatherContact: '1234567890',
      classId: testClass._id,
      sectionId: testSection._id,
      monthlyFeeAmount: 5000,
      status: 'active'
    });

    // B. Partial student: fee amount = 4000, FeeRecord with status = partial, amountPaid = 1500
    const partialStudent = await Student.create({
      registrationNumber: 'partial1',
      fullName: 'Partial Student',
      fatherName: 'Father Partial',
      gender: 'female',
      dateOfBirth: new Date('2015-06-06'),
      fatherContact: '1234567891',
      classId: testClass._id,
      sectionId: testSection._id,
      monthlyFeeAmount: 4000,
      status: 'active'
    });

    // C. Fully paid student: fee amount = 3000, FeeRecord with status = paid, amountPaid = 3000
    const paidStudent = await Student.create({
      registrationNumber: 'paid1',
      fullName: 'Paid Student',
      fatherName: 'Father Paid',
      gender: 'male',
      dateOfBirth: new Date('2015-07-07'),
      fatherContact: '1234567892',
      classId: testClass._id,
      sectionId: testSection._id,
      monthlyFeeAmount: 3000,
      status: 'active'
    });

    // 3. Create current month's FeeRecords for partial & paid students
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    await FeeRecord.create([
      {
        studentId: partialStudent._id,
        month: currentMonth,
        amountDue: 4000,
        amountPaid: 1500,
        status: 'partial',
        type: 'monthly',
        payments: [{ amount: 1500, type: 'custom', method: 'cash', paidOn: new Date() }]
      },
      {
        studentId: paidStudent._id,
        month: currentMonth,
        amountDue: 3000,
        amountPaid: 3000,
        status: 'paid',
        type: 'monthly',
        payments: [{ amount: 3000, type: 'full', method: 'cash', paidOn: new Date() }]
      }
    ]);

    // 4. Seed Expenses and Payrolls
    await Expense.create({ title: 'Mock Rent', amount: 1000, category: 'utilities', date: new Date() });
    const mockTeacherId = new mongoose.Types.ObjectId();
    await Payroll.create({
      employeeId: new mongoose.Types.ObjectId(),
      teacherId: mockTeacherId,
      employeeName: 'Mock Teacher',
      baseSalary: 2000,
      netSalary: 2000,
      month: currentMonth,
      status: 'paid'
    });

    // 5. Invoke getFeeSummary controller function
    const req = mockRequest();
    const res = mockResponse();
    await getFeeSummary(req, res, mockNext);

    // 6. Assertions
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    
    const data = res.body.data;
    assert.strictEqual(data.totalStudents, 3);
    assert.strictEqual(data.totalFeeExpected, 5000 + 4000 + 3000); // 12000
    assert.strictEqual(data.totalCollected, 0 + 1500 + 3000); // 4500
    assert.strictEqual(data.partialAmount, 4000 - 1500); // 2500
    assert.strictEqual(data.partialCount, 1);
    
    // Net P&L: totalCollected (4500) - totalExpensesOut (1000) - totalPayrollOut (2000) = 1500
    assert.strictEqual(data.netPL, 1500);
  });
});
