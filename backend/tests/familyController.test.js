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
const FamilyVoucher = require('../models/FamilyVoucher');
const BookFee = require('../models/BookFee');
const Counter = require('../models/Counter');

const {
  getFamilies,
  getFamilyFeeSummary,
  getFamilyBooksSummary,
  payFamilyFees,
  payFamilyBooks
} = require('../controllers/familyController');

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

test.describe('Family Pass 2 Controller Tests', { concurrency: 1 }, () => {
  let testClass, testSection, studentA, studentB, testFamily;

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
      FamilyVoucher.deleteMany({}),
      BookFee.deleteMany({}),
      Counter.deleteMany({})
    ]);

    // 1. Seed Class & Section
    testClass = await Class.create({ name: 'Class 1', gender: 'mixed' });
    testSection = await Section.create({ name: 'A', classId: testClass._id });

    // 2. Create family
    testFamily = await Family.create({
      familyName: 'Iqbal Household',
      contactNumber: '03001234567',
      students: []
    });

    // 3. Create 2 students
    studentA = await Student.create({
      registrationNumber: '26001',
      fullName: 'Ahmed Iqbal',
      fatherName: 'Iqbal',
      fatherContact: '03001234567',
      gender: 'male',
      dateOfBirth: new Date('2015-01-01'),
      classId: testClass._id,
      sectionId: testSection._id,
      customFee: 5000,
      familyId: testFamily._id,
      status: 'active'
    });

    studentB = await Student.create({
      registrationNumber: '26002',
      fullName: 'Fatima Iqbal',
      fatherName: 'Iqbal',
      fatherContact: '03001234567',
      gender: 'female',
      dateOfBirth: new Date('2017-01-01'),
      classId: testClass._id,
      sectionId: testSection._id,
      customFee: 3000,
      familyId: testFamily._id,
      status: 'active'
    });

    testFamily.students = [studentA._id, studentB._id];
    await testFamily.save();
  });

  test('should return combined fee summary with lazy-loaded records', async () => {
    const req = mockRequest({ id: testFamily._id.toString() });
    const res = mockResponse();

    await getFamilyFeeSummary(req, res, mockNext);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.familyTotal, 8000); // 5000 + 3000

    const students = res.body.data.students;
    assert.strictEqual(students.length, 2);

    const sA = students.find(s => s.studentId.toString() === studentA._id.toString());
    const sB = students.find(s => s.studentId.toString() === studentB._id.toString());

    assert.strictEqual(sA.studentTotal, 5000);
    assert.strictEqual(sB.studentTotal, 3000);
    assert.strictEqual(sA.outstandingRecords.length, 1);
    assert.strictEqual(sB.outstandingRecords.length, 1);
  });

  test('should return aggregated family books summary', async () => {
    // Create BookFee record for studentA (1500) and studentB (2000, 500 paid = 1500 outstanding)
    await BookFee.create({
      student: studentA._id,
      classId: testClass._id,
      academicYear: '2025-2026',
      amount: 1500,
      amountPaid: 0,
      paymentStatus: 'pending',
      items: [{ title: 'Class 1 Book Set', price: 1500, quantity: 1 }]
    });

    await BookFee.create({
      student: studentB._id,
      classId: testClass._id,
      academicYear: '2025-2026',
      amount: 2000,
      amountPaid: 500,
      paymentStatus: 'partial',
      items: [{ title: 'Class 1 Full Bundle', price: 2000, quantity: 1 }]
    });

    const req = mockRequest({ id: testFamily._id.toString() });
    const res = mockResponse();

    await getFamilyBooksSummary(req, res, mockNext);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.students.length, 2);
    assert.strictEqual(res.body.data.familyTotal, 3000); // 1500 + (2000 - 500)

    const sA = res.body.data.students.find(s => s.studentId.toString() === studentA._id.toString());
    const sB = res.body.data.students.find(s => s.studentId.toString() === studentB._id.toString());

    assert.strictEqual(sA.studentTotal, 1500);
    assert.strictEqual(sA.outstandingRecords.length, 1);
    assert.strictEqual(sA.outstandingRecords[0].title, 'Class 1 Book Set');

    assert.strictEqual(sB.studentTotal, 1500);
    assert.strictEqual(sB.outstandingRecords.length, 1);
    assert.strictEqual(sB.outstandingRecords[0].paymentStatus, 'partial');
  });

  test('should process payment transaction successfully and respect idempotency key', async () => {
    // Get fee records
    const feeSummaryReq = mockRequest({ id: testFamily._id.toString() });
    const feeSummaryRes = mockResponse();
    await getFamilyFeeSummary(feeSummaryReq, feeSummaryRes, mockNext);

    const recordA = feeSummaryRes.body.data.students[0].outstandingRecords[0].feeRecordId;
    const recordB = feeSummaryRes.body.data.students[1].outstandingRecords[0].feeRecordId;

    const idempotencyKey = 'test-uuid-12345';
    const payReq = mockRequest(
      { id: testFamily._id.toString() },
      {
        feeRecordIds: [recordA.toString(), recordB.toString()],
        paymentMethod: 'cash',
        idempotencyKey
      },
      { id: new mongoose.Types.ObjectId() } // Mock admin user
    );

    const payRes = mockResponse();
    await payFamilyFees(payReq, payRes, mockNext);

    assert.strictEqual(payRes.statusCode, 201);
    assert.strictEqual(payRes.body.success, true);
    assert.strictEqual(payRes.body.data.totalAmount, 8000);
    assert.strictEqual(payRes.body.data.lineItems.length, 2);
    assert.strictEqual(payRes.body.data.voucherNumber, 'FRC-000001');

    // Check database records are updated
    const updatedRecordA = await FeeRecord.findById(recordA);
    const updatedRecordB = await FeeRecord.findById(recordB);

    assert.strictEqual(updatedRecordA.status, 'paid');
    assert.strictEqual(updatedRecordA.amountPaid, 5000);
    assert.strictEqual(updatedRecordB.status, 'paid');
    assert.strictEqual(updatedRecordB.amountPaid, 3000);

    // Test idempotency: send second request with the same idempotency key
    const payRes2 = mockResponse();
    await payFamilyFees(payReq, payRes2, mockNext);

    // Should return existing voucher instead of creating a new one
    assert.strictEqual(payRes2.statusCode, 200);
    assert.strictEqual(payRes2.body.success, true);
    assert.strictEqual(payRes2.body.data.voucherNumber, 'FRC-000001');
    assert.strictEqual(payRes2.body.message, 'Payment already processed (idempotent response)');

    // Verify only 1 voucher exists in DB
    const voucherCount = await FamilyVoucher.countDocuments({});
    assert.strictEqual(voucherCount, 1);
  });

  test('should abort transaction and make no database modifications if any step fails', async () => {
    // Get outstanding records
    const feeSummaryReq = mockRequest({ id: testFamily._id.toString() });
    const feeSummaryRes = mockResponse();
    await getFamilyFeeSummary(feeSummaryReq, feeSummaryRes, mockNext);

    const recordA = feeSummaryRes.body.data.students[0].outstandingRecords[0].feeRecordId;

    // Send one valid record ID and one invalid record ID
    const payReq = mockRequest(
      { id: testFamily._id.toString() },
      {
        feeRecordIds: [recordA.toString(), new mongoose.Types.ObjectId().toString()],
        paymentMethod: 'cash',
        idempotencyKey: 'test-uuid-fail'
      },
      { id: new mongoose.Types.ObjectId() }
    );

    const payRes = mockResponse();
    await payFamilyFees(payReq, payRes, mockNext);

    assert.strictEqual(payRes.statusCode, 400);
    assert.strictEqual(payRes.body.success, false);

    // Verify record A remained UNPAID (transaction aborted)
    const recordADb = await FeeRecord.findById(recordA);
    assert.strictEqual(recordADb.status, 'pending');
    assert.strictEqual(recordADb.amountPaid, 0);

    // Verify no voucher was created
    const voucherCount = await FamilyVoucher.countDocuments({});
    assert.strictEqual(voucherCount, 0);
  });

  test('Test 1 — Server must ignore a tampered totalAmount', async () => {
    // 1. Create a outstanding current month fee record for studentA
    const feeSummaryReq = mockRequest({ id: testFamily._id.toString() });
    const feeSummaryRes = mockResponse();
    await getFamilyFeeSummary(feeSummaryReq, feeSummaryRes, mockNext);
    const recordId = feeSummaryRes.body.data.students[0].outstandingRecords[0].feeRecordId;

    // 2. Pay using payFamilyFees with totalAmount: 1 in req.body
    const idempotencyKey = 'test-uuid-tamper';
    const payReq = mockRequest(
      { id: testFamily._id.toString() },
      {
        feeRecordIds: [recordId.toString()],
        paymentMethod: 'cash',
        idempotencyKey,
        totalAmount: 1 // Deliberately wrong
      },
      { id: new mongoose.Types.ObjectId() }
    );

    const payRes = mockResponse();
    await payFamilyFees(payReq, payRes, mockNext);

    assert.strictEqual(payRes.statusCode, 201);
    assert.strictEqual(payRes.body.success, true);

    // 3. Fetch from DB and assert
    const voucher = await FamilyVoucher.findOne({ idempotencyKey });
    assert.ok(voucher, 'Voucher should exist in DB');
    
    // Log for report
    console.log(`[TEST 1 REPORT] Voucher totalAmount in DB: ${voucher.totalAmount}`);
    
    const feeRecord = await FeeRecord.findById(recordId);
    const paymentAmount = feeRecord.payments.reduce((sum, p) => sum + p.amount, 0);
    console.log(`[TEST 1 REPORT] FeeRecord total payment amount in DB: ${paymentAmount}`);

    assert.strictEqual(voucher.totalAmount, 5000, `Expected voucher totalAmount in DB to be 5000, got ${voucher.totalAmount}`);
    assert.strictEqual(paymentAmount, 5000, `Expected feeRecord payment amount in DB to be 5000, got ${paymentAmount}`);
  });

  test('Test 2 — Double-submit produces exactly one voucher', async () => {
    // 1. Get outstanding record ID
    const feeSummaryReq = mockRequest({ id: testFamily._id.toString() });
    const feeSummaryRes = mockResponse();
    await getFamilyFeeSummary(feeSummaryReq, feeSummaryRes, mockNext);
    const recordId = feeSummaryRes.body.data.students[0].outstandingRecords[0].feeRecordId;

    // 2. Fire two near-simultaneous payFamilyFees calls with same idempotencyKey
    const idempotencyKey = 'test-uuid-double';
    const payReq = mockRequest(
      { id: testFamily._id.toString() },
      {
        feeRecordIds: [recordId.toString()],
        paymentMethod: 'cash',
        idempotencyKey
      },
      { id: new mongoose.Types.ObjectId() }
    );

    const payRes1 = mockResponse();
    const payRes2 = mockResponse();

    // Call them concurrently using Promise.allSettled
    await Promise.allSettled([
      payFamilyFees(payReq, payRes1, mockNext),
      payFamilyFees(payReq, payRes2, mockNext)
    ]);

    // 3. Assertions
    const vouchers = await FamilyVoucher.find({ idempotencyKey });
    assert.strictEqual(vouchers.length, 1, `Expected exactly 1 voucher in DB, found ${vouchers.length}`);

    const feeRecord = await FeeRecord.findById(recordId);
    assert.strictEqual(feeRecord.amountPaid, 5000, `Expected FeeRecord amountPaid to be 5000, got ${feeRecord.amountPaid}`);
    assert.strictEqual(feeRecord.status, 'paid');
    
    // Sum payments array
    const paymentSum = feeRecord.payments.reduce((sum, p) => sum + p.amount, 0);
    assert.strictEqual(paymentSum, 5000, `Expected sum of payments on FeeRecord to be 5000, got ${paymentSum}`);
  });

  test('Test 3 — Idempotent retry after success returns the same voucher', async () => {
    // 1. Get outstanding record ID
    const feeSummaryReq = mockRequest({ id: testFamily._id.toString() });
    const feeSummaryRes = mockResponse();
    await getFamilyFeeSummary(feeSummaryReq, feeSummaryRes, mockNext);
    const recordId = feeSummaryRes.body.data.students[0].outstandingRecords[0].feeRecordId;

    // 2. First call
    const idempotencyKey = 'test-uuid-retry';
    const payReq = mockRequest(
      { id: testFamily._id.toString() },
      {
        feeRecordIds: [recordId.toString()],
        paymentMethod: 'cash',
        idempotencyKey
      },
      { id: new mongoose.Types.ObjectId() }
    );

    const payRes1 = mockResponse();
    await payFamilyFees(payReq, payRes1, mockNext);

    assert.strictEqual(payRes1.statusCode, 201);
    const voucher1 = payRes1.body.data;

    // 3. Second call after the first has completed
    const payRes2 = mockResponse();
    await payFamilyFees(payReq, payRes2, mockNext);

    assert.strictEqual(payRes2.statusCode, 200);
    const voucher2 = payRes2.body.data;

    // 4. Assertions
    assert.strictEqual(voucher2._id.toString(), voucher1._id.toString(), 'Voucher IDs should match');
    assert.strictEqual(voucher2.voucherNumber, voucher1.voucherNumber, 'Voucher numbers should match');

    const vouchersInDb = await FamilyVoucher.find({ idempotencyKey });
    assert.strictEqual(vouchersInDb.length, 1, `Expected exactly 1 voucher in DB, got ${vouchersInDb.length}`);

    const feeRecord = await FeeRecord.findById(recordId);
    assert.strictEqual(feeRecord.amountPaid, 5000, `Expected FeeRecord amountPaid to be 5000, got ${feeRecord.amountPaid}`);
    
    const paymentSum = feeRecord.payments.reduce((sum, p) => sum + p.amount, 0);
    assert.strictEqual(paymentSum, 5000, `Expected sum of payments on FeeRecord to be 5000, got ${paymentSum}`);
  });

  test('Test 4 — Mismatched/foreign feeRecordId is rejected', async () => {
    // 1. Create family B
    const familyB = await Family.create({
      familyName: 'Other Family',
      contactNumber: '03009876543',
      students: []
    });

    const studentB2 = await Student.create({
      registrationNumber: 'studB',
      fullName: 'Bobby Other',
      fatherName: 'Other',
      gender: 'male',
      dateOfBirth: new Date('2014-04-04'),
      fatherContact: '03009876543',
      classId: testClass._id,
      sectionId: testSection._id,
      customFee: 4000,
      familyId: familyB._id,
      status: 'active'
    });

    familyB.students = [studentB2._id];
    await familyB.save();

    // 2. Get outstanding records for both families
    // Family A (testFamily)
    const summaryReqA = mockRequest({ id: testFamily._id.toString() });
    const summaryResA = mockResponse();
    await getFamilyFeeSummary(summaryReqA, summaryResA, mockNext);
    const recordA = summaryResA.body.data.students[0].outstandingRecords[0].feeRecordId;

    // Family B (familyB)
    const summaryReqB = mockRequest({ id: familyB._id.toString() });
    const summaryResB = mockResponse();
    await getFamilyFeeSummary(summaryReqB, summaryResB, mockNext);
    const recordB = summaryResB.body.data.students[0].outstandingRecords[0].feeRecordId;

    // 3. Attempt payment for Family A, but include Family B's record ID
    const payReq = mockRequest(
      { id: testFamily._id.toString() },
      {
        feeRecordIds: [recordB.toString()], // recordB is foreign to testFamily
        paymentMethod: 'cash',
        idempotencyKey: 'test-uuid-mismatch'
      },
      { id: new mongoose.Types.ObjectId() }
    );

    const payRes = mockResponse();
    await payFamilyFees(payReq, payRes, mockNext);

    // 4. Assertions: request rejected with 4xx
    assert.ok(payRes.statusCode >= 400 && payRes.statusCode < 500, `Expected 4xx status code, got ${payRes.statusCode}`);
    assert.strictEqual(payRes.body.success, false);

    // Verify no FamilyVoucher was created
    const voucherCount = await FamilyVoucher.countDocuments({ idempotencyKey: 'test-uuid-mismatch' });
    assert.strictEqual(voucherCount, 0, 'No voucher should have been created');

    // Verify neither FeeRecord was modified
    const dbRecordA = await FeeRecord.findById(recordA);
    const dbRecordB = await FeeRecord.findById(recordB);

    assert.strictEqual(dbRecordA.status, 'pending');
    assert.strictEqual(dbRecordA.amountPaid, 0);
    assert.strictEqual(dbRecordB.status, 'pending');
    assert.strictEqual(dbRecordB.amountPaid, 0);
  });

  test.it('should return families with correct combinedOutstanding live calculation in getFamilies', async () => {
    // 1. Create a test family with two students
    const testFamilyList = await Family.create({
      familyName: 'List Family Outstanding',
      contactNumber: '03001234567',
      guardianName: 'Guardian List'
    });

    const studentL1 = await Student.create({
      registrationNumber: 'studL1',
      fullName: 'List Student 1',
      fatherName: 'Father',
      gender: 'male',
      dateOfBirth: new Date('2015-05-05'),
      fatherContact: '03001234567',
      classId: testClass._id,
      sectionId: testSection._id,
      monthlyFeeAmount: 3000,
      familyId: testFamilyList._id,
      status: 'active'
    });

    const studentL2 = await Student.create({
      registrationNumber: 'studL2',
      fullName: 'List Student 2',
      fatherName: 'Father',
      gender: 'male',
      dateOfBirth: new Date('2016-06-06'),
      fatherContact: '03001234567',
      classId: testClass._id,
      sectionId: testSection._id,
      monthlyFeeAmount: 2500,
      familyId: testFamilyList._id,
      status: 'active'
    });

    testFamilyList.students = [studentL1._id, studentL2._id];
    await testFamilyList.save();

    // 2. Create another test family with fully paid fees
    const testFamilyListPaid = await Family.create({
      familyName: 'List Family Paid',
      contactNumber: '03001234568',
      guardianName: 'Guardian List Paid'
    });

    const studentL3 = await Student.create({
      registrationNumber: 'studL3',
      fullName: 'List Student 3',
      fatherName: 'Father',
      gender: 'male',
      dateOfBirth: new Date('2017-07-07'),
      fatherContact: '03001234568',
      classId: testClass._id,
      sectionId: testSection._id,
      monthlyFeeAmount: 2000,
      familyId: testFamilyListPaid._id,
      status: 'active'
    });

    testFamilyListPaid.students = [studentL3._id];
    await testFamilyListPaid.save();

    // 3. Create fee records for these students
    // studentL1: 3000 due, 1000 paid -> 2000 outstanding (partial)
    await FeeRecord.create({
      studentId: studentL1._id,
      month: '2026-08',
      amountDue: 3000,
      amountPaid: 1000,
      status: 'partial',
      type: 'monthly'
    });

    // studentL2: 2500 due, 0 paid -> 2500 outstanding (pending)
    await FeeRecord.create({
      studentId: studentL2._id,
      month: '2026-08',
      amountDue: 2500,
      amountPaid: 0,
      status: 'pending',
      type: 'monthly'
    });

    // studentL3: 2000 due, 2000 paid -> 0 outstanding (paid)
    await FeeRecord.create({
      studentId: studentL3._id,
      month: '2026-08',
      amountDue: 2000,
      amountPaid: 2000,
      status: 'paid',
      type: 'monthly'
    });

    // 4. Invoke getFamilies via mockRequest and mockResponse
    const getFamiliesReq = mockRequest();
    getFamiliesReq.query = { search: 'List Family' };
    const getFamiliesRes = mockResponse();

    await getFamilies(getFamiliesReq, getFamiliesRes, mockNext);

    assert.strictEqual(getFamiliesRes.statusCode, 200);
    assert.strictEqual(getFamiliesRes.body.success, true);

    const retrievedFamilies = getFamiliesRes.body.data.families;
    assert.ok(retrievedFamilies.length >= 2, 'Should retrieve the test families');

    // Find our created families in the response
    const famOutstanding = retrievedFamilies.find(f => f._id.toString() === testFamilyList._id.toString());
    const famPaid = retrievedFamilies.find(f => f._id.toString() === testFamilyListPaid._id.toString());

    assert.ok(famOutstanding, 'Should find family with outstanding fees');
    assert.ok(famPaid, 'Should find family with paid fees');

    // Expected outstanding: 2000 (from L1) + 2500 (from L2) = 4500
    assert.strictEqual(famOutstanding.combinedOutstanding, 4500, 'Combined outstanding sum should match');
    // Expected outstanding: 0
    assert.strictEqual(famPaid.combinedOutstanding, 0, 'Fully paid family outstanding should be 0.00');
  });

  test('should process family book payment transaction successfully and respect idempotency key', async () => {
    // 1. Create BookFee for studentA (1500) and studentB (2500)
    const bookFeeA = await BookFee.create({
      student: studentA._id,
      classId: testClass._id,
      academicYear: '2025-2026',
      amount: 1500,
      amountPaid: 0,
      paymentStatus: 'pending',
      items: [{ title: 'Math & English Set', price: 1500, quantity: 1 }]
    });

    const bookFeeB = await BookFee.create({
      student: studentB._id,
      classId: testClass._id,
      academicYear: '2025-2026',
      amount: 2500,
      amountPaid: 0,
      paymentStatus: 'pending',
      items: [{ title: 'Science & Arts Bundle', price: 2500, quantity: 1 }]
    });

    const idempotencyKey = 'test-books-uuid-12345';
    const payReq = mockRequest(
      { id: testFamily._id.toString() },
      {
        bookFeeRecordIds: [bookFeeA._id.toString(), bookFeeB._id.toString()],
        paymentMethod: 'bank_transfer',
        idempotencyKey
      }
    );
    const payRes = mockResponse();

    await payFamilyBooks(payReq, payRes, mockNext);

    assert.strictEqual(payRes.statusCode, 201);
    assert.strictEqual(payRes.body.success, true);
    assert.strictEqual(payRes.body.data.voucherType, 'book');
    assert.strictEqual(payRes.body.data.totalAmount, 4000); // 1500 + 2500
    assert.strictEqual(payRes.body.data.lineItems.length, 2);

    // Verify BookFee records in DB
    const updatedA = await BookFee.findById(bookFeeA._id);
    const updatedB = await BookFee.findById(bookFeeB._id);

    assert.strictEqual(updatedA.paymentStatus, 'paid');
    assert.strictEqual(updatedA.amountPaid, 1500);
    assert.strictEqual(updatedA.paid, true);
    assert.strictEqual(updatedA.payments.length, 1);
    assert.strictEqual(updatedA.payments[0].method, 'bank_transfer');

    assert.strictEqual(updatedB.paymentStatus, 'paid');
    assert.strictEqual(updatedB.amountPaid, 2500);
    assert.strictEqual(updatedB.paid, true);
    assert.strictEqual(updatedB.payments.length, 1);

    // Idempotency: replay with same key
    const replayReq = mockRequest(
      { id: testFamily._id.toString() },
      {
        bookFeeRecordIds: [bookFeeA._id.toString(), bookFeeB._id.toString()],
        paymentMethod: 'bank_transfer',
        idempotencyKey
      }
    );
    const replayRes = mockResponse();

    await payFamilyBooks(replayReq, replayRes, mockNext);

    assert.strictEqual(replayRes.statusCode, 200);
    assert.strictEqual(replayRes.body.success, true);
    assert.strictEqual(replayRes.body.message, 'Payment already processed (idempotent response)');
    assert.strictEqual(replayRes.body.data._id.toString(), payRes.body.data._id.toString());
  });
});
