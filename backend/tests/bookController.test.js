const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');

const Class = require('../models/Class');
const Section = require('../models/Section');
const Student = require('../models/Student');
const BookFee = require('../models/BookFee');
const Counter = require('../models/Counter');
const Settings = require('../models/Settings');

const {
  getBookSummary,
  getBookDues,
  recordBookPayment,
  generateBookReceiptPDF,
  generateBookReportPDF,
  issueBookCharge
} = require('../controllers/bookController');
const { PassThrough } = require('stream');

const mockRequest = (params = {}, body = {}, query = {}, user = {}) => ({
  params,
  body,
  query,
  user
});

const mockResponse = () => {
  const pt = new PassThrough();
  pt.headers = {};
  pt.status = (code) => {
    pt.statusCode = code;
    return pt;
  };
  pt.json = (data) => {
    pt.body = data;
    return pt;
  };
  pt.setHeader = (key, val) => {
    pt.headers[key] = val;
  };
  return pt;
};

const mockNext = (err) => {
  if (err) throw err;
};

test.describe('Book Controller Integration Tests', { concurrency: 1 }, () => {
  let testClass, testSection, studentA, studentB;

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
      BookFee.deleteMany({}),
      Counter.deleteMany({}),
      Settings.deleteMany({})
    ]);

    await Settings.create({
      schoolName: 'Iqra School',
      currentSession: '2025-2026',
      schoolId: 'default'
    });

    testClass = await Class.create({ name: 'Grade 5', gender: 'mixed' });
    testSection = await Section.create({ name: 'A', classId: testClass._id });

    studentA = await Student.create({
      registrationNumber: 'BK-001',
      fullName: 'Zubair Ahmed',
      fatherName: 'Ahmed',
      fatherContact: '03001234567',
      gender: 'male',
      dateOfBirth: new Date('2015-01-01'),
      classId: testClass._id,
      sectionId: testSection._id,
      status: 'active'
    });

    studentB = await Student.create({
      registrationNumber: 'BK-002',
      fullName: 'Amina Bibi',
      fatherName: 'Bibi',
      fatherContact: '03007654321',
      gender: 'female',
      dateOfBirth: new Date('2015-05-05'),
      classId: testClass._id,
      sectionId: testSection._id,
      status: 'active'
    });
  });

  test('should compute getBookSummary statistics accurately', async () => {
    await BookFee.create([
      {
        student: studentA._id,
        classId: testClass._id,
        academicYear: '2025-2026',
        amount: 3000,
        amountPaid: 1000,
        paymentStatus: 'partial'
      },
      {
        student: studentB._id,
        classId: testClass._id,
        academicYear: '2025-2026',
        amount: 2500,
        amountPaid: 2500,
        paymentStatus: 'paid'
      }
    ]);

    const req = mockRequest();
    const res = mockResponse();

    await getBookSummary(req, res, mockNext);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.totalBilled, 5500);
    assert.strictEqual(res.body.data.totalCollected, 3500);
    assert.strictEqual(res.body.data.totalOutstanding, 2000);
    assert.strictEqual(res.body.data.partialCount, 1);
    assert.strictEqual(res.body.data.paidCount, 1);
    assert.strictEqual(res.body.data.totalCount, 2);
  });

  test('should return paginated and filtered getBookDues roster', async () => {
    await BookFee.create([
      {
        student: studentA._id,
        classId: testClass._id,
        academicYear: '2025-2026',
        amount: 3000,
        amountPaid: 0,
        paymentStatus: 'pending',
        items: [{ title: 'Full Book Set', price: 3000, quantity: 1 }]
      },
      {
        student: studentB._id,
        classId: testClass._id,
        academicYear: '2025-2026',
        amount: 2500,
        amountPaid: 2500,
        paymentStatus: 'paid'
      }
    ]);

    // Query pending only
    const req = mockRequest({}, {}, { status: 'pending', page: '1', limit: '10' });
    const res = mockResponse();

    await getBookDues(req, res, mockNext);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.total, 1);
    assert.strictEqual(res.body.data.records.length, 1);
    assert.strictEqual(res.body.data.records[0].student.registrationNumber.toLowerCase(), 'bk-001');
  });

  test('should record single student book payment and prevent duplicate submit via idempotencyKey', async () => {
    const bookDoc = await BookFee.create({
      student: studentA._id,
      classId: testClass._id,
      academicYear: '2025-2026',
      amount: 3000,
      amountPaid: 0,
      paymentStatus: 'pending'
    });

    const idempotencyKey = 'bk-uuid-test-999';
    const payReq = mockRequest(
      { id: bookDoc._id.toString() },
      {
        type: 'custom',
        amount: 1500,
        method: 'cash',
        note: 'Front office collection',
        idempotencyKey
      }
    );
    const payRes = mockResponse();

    await recordBookPayment(payReq, payRes, mockNext);

    assert.strictEqual(payRes.statusCode, 200);
    assert.strictEqual(payRes.body.success, true);
    assert.strictEqual(payRes.body.data.amountPaid, 1500);
    assert.strictEqual(payRes.body.data.paymentStatus, 'partial');
    assert.ok(payRes.body.receiptNumber.startsWith('BK-'));

    // Replay same request -> idempotency test
    const replayReq = mockRequest(
      { id: bookDoc._id.toString() },
      {
        type: 'custom',
        amount: 1500,
        method: 'cash',
        note: 'Front office collection',
        idempotencyKey
      }
    );
    const replayRes = mockResponse();

    await recordBookPayment(replayReq, replayRes, mockNext);

    assert.strictEqual(replayRes.statusCode, 200);
    assert.strictEqual(replayRes.body.message, 'Payment already processed (idempotent response)');

    // Verify DB
    const finalDoc = await BookFee.findById(bookDoc._id);
    assert.strictEqual(finalDoc.amountPaid, 1500);
    assert.strictEqual(finalDoc.payments.length, 1);
    assert.strictEqual(finalDoc.payments[0].idempotencyKey, idempotencyKey);
  });

  test('should bulk issue book charges to an entire class', async () => {
    const issueReq = mockRequest(
      {},
      {
        targetType: 'class',
        classId: testClass._id.toString(),
        amount: 2200,
        dueDate: '2026-10-15',
        academicYear: '2025-2026',
        items: [{ title: 'Grade 5 Syllabus Set', price: 2200, quantity: 1 }]
      }
    );
    const issueRes = mockResponse();

    await issueBookCharge(issueReq, issueRes, mockNext);

    assert.strictEqual(issueRes.statusCode, 201);
    assert.strictEqual(issueRes.body.success, true);
    assert.strictEqual(issueRes.body.count, 2);

    const countInDb = await BookFee.countDocuments({ classId: testClass._id });
    assert.strictEqual(countInDb, 2);
  });

  test('should support getBookDues with collected, partial, and pending filters', async () => {
    // Seed one paid, one partial, one pending
    await BookFee.deleteMany({});
    await BookFee.create([
      {
        student: studentA._id,
        classId: testClass._id,
        amount: 2000,
        amountPaid: 2000,
        paymentStatus: 'paid'
      },
      {
        student: studentB._id,
        classId: testClass._id,
        amount: 2000,
        amountPaid: 800,
        paymentStatus: 'partial'
      }
    ]);

    // Filter: collected (records where amountPaid > 0)
    const collectedReq = mockRequest({}, {}, { status: 'collected' });
    const collectedRes = mockResponse();
    await getBookDues(collectedReq, collectedRes, mockNext);
    assert.strictEqual(collectedRes.body.data.records.length, 2);

    // Filter: partial
    const partialReq = mockRequest({}, {}, { status: 'partial' });
    const partialRes = mockResponse();
    await getBookDues(partialReq, partialRes, mockNext);
    assert.strictEqual(partialRes.body.data.records.length, 1);
    assert.strictEqual(partialRes.body.data.records[0].paymentStatus, 'partial');

    // Filter: pending
    const pendingReq = mockRequest({}, {}, { status: 'pending' });
    const pendingRes = mockResponse();
    await getBookDues(pendingReq, pendingRes, mockNext);
    assert.strictEqual(pendingRes.body.data.records.length, 0);
  });

  test('should stream a valid PDF report for book dues', async () => {
    const pdfReq = mockRequest({}, {}, { type: 'collected' });
    const pdfRes = mockResponse();

    let chunksReceived = 0;
    pdfRes.on('data', (chunk) => {
      if (chunk && chunk.length > 0) chunksReceived++;
    });

    await generateBookReportPDF(pdfReq, pdfRes, mockNext);

    assert.strictEqual(pdfRes.headers['Content-Type'], 'application/pdf');
    assert.ok(pdfRes.headers['Content-Disposition'].includes('collected-books-report'));
  });
});
