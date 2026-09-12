const dotenv = require('dotenv');

dotenv.config();
if (process.env.NODE_ENV === 'production') {
  dotenv.config({ path: '.env.production', override: true });
} else {
  dotenv.config({ path: '.env.local', override: true });
}

const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');

const User = require('../models/User');
const Teacher = require('../models/Teacher');
const { registerUser } = require('../controllers/authController');
const { createTeacher, activateTeacherDirectly, resendInvitation } = require('../controllers/teacherController');

const mockRequest = (params = {}, body = {}, query = {}, user = {}) => ({
  params,
  body,
  query,
  user,
});

const mockResponse = () => {
  const res = {};
  res.statusCode = 200;
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

test.describe('Dual-Mode Account Provisioning Tests', { concurrency: 1 }, () => {
  let createdUserIds = [];
  let createdTeacherIds = [];

  test.before(async () => {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ihass';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
  });

  test.after(async () => {
    // Cleanup created test records
    if (createdTeacherIds.length > 0) {
      await Teacher.deleteMany({ _id: { $in: createdTeacherIds } });
    }
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
    await mongoose.connection.close();
  });

  // --- 1. ADMIN REGISTRATION (authController.registerUser) ---
  test('Admin Registration - Direct Password mode activates user immediately', async () => {
    const testEmail = `direct_admin_${Date.now()}@test.com`;
    const directPassword = 'SecureAdminPassword123!';

    const req = mockRequest({}, {
      name: 'Direct Admin Test',
      email: testEmail,
      role: 'admin',
      password: directPassword,
      requireVerification: false,
    });
    const res = mockResponse();

    await registerUser(req, res, mockNext);

    assert.strictEqual(res.statusCode, 201, 'Expected HTTP 201');
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.user.isActivated, true);
    assert.strictEqual(res.body.data.user.email, testEmail);

    const createdUser = await User.findById(res.body.data.user.id);
    assert.ok(createdUser, 'User must exist in DB');
    createdUserIds.push(createdUser._id);

    assert.strictEqual(createdUser.isActivated, true);
    assert.ok(!createdUser.activationTokenHash, 'Activation token hash must not be set');

    const isMatch = await createdUser.comparePassword(directPassword);
    assert.strictEqual(isMatch, true, 'User direct password must match correctly');
  });

  test('Admin Registration - Direct Mode rejects password shorter than 8 characters', async () => {
    const testEmail = `short_admin_${Date.now()}@test.com`;
    const req = mockRequest({}, {
      name: 'Short Password Admin',
      email: testEmail,
      role: 'admin',
      password: 'short7',
      requireVerification: false,
    });
    const res = mockResponse();

    await registerUser(req, res, mockNext);

    assert.strictEqual(res.statusCode, 400, 'Expected HTTP 400');
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /at least 8 characters/i);
  });

  test('Admin Registration - Invitation Mode creates unactivated user and returns activation link', async () => {
    const testEmail = `invite_admin_${Date.now()}@test.com`;
    const req = mockRequest({}, {
      name: 'Invite Admin Test',
      email: testEmail,
      role: 'admin',
      requireVerification: true,
    });
    const res = mockResponse();

    await registerUser(req, res, mockNext);

    assert.strictEqual(res.statusCode, 201, 'Expected HTTP 201');
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.user.isActivated, false);
    assert.ok(res.body.data.activationLink, 'Must return activationLink in response data');
    assert.match(res.body.data.activationLink, /\/activate\//);

    const createdUser = await User.findById(res.body.data.user.id);
    assert.ok(createdUser);
    createdUserIds.push(createdUser._id);

    assert.strictEqual(createdUser.isActivated, false);
    assert.ok(createdUser.activationTokenHash, 'Activation token hash must exist');
    assert.ok(createdUser.activationTokenExpires > new Date(), 'Activation token expiry must be future');
  });

  // --- 2. TEACHER PROVISIONING (teacherController.createTeacher) ---
  test('Teacher Creation - Direct Password mode activates teacher account immediately', async () => {
    const testEmail = `direct_teacher_${Date.now()}@test.com`;
    const empId = `EMP-${Date.now().toString().slice(-5)}`;
    const directPassword = 'SecureTeacherPassword123!';

    const req = mockRequest({}, {
      name: 'Direct Teacher Test',
      email: testEmail,
      employeeId: empId,
      qualification: 'M.Sc Mathematics',
      phone: '03001122334',
      password: directPassword,
      requireVerification: false,
    });
    const res = mockResponse();

    await createTeacher(req, res, mockNext);

    assert.strictEqual(res.statusCode, 201, 'Expected HTTP 201');
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.user.isActivated, true);
    assert.strictEqual(res.body.data.user.email, testEmail);

    createdTeacherIds.push(res.body.data.teacher._id);
    createdUserIds.push(res.body.data.user.id);

    const userInDb = await User.findById(res.body.data.user.id);
    assert.strictEqual(userInDb.isActivated, true);
    assert.ok(!userInDb.activationTokenHash, 'Activation token hash must not be set');

    const isMatch = await userInDb.comparePassword(directPassword);
    assert.strictEqual(isMatch, true, 'Teacher direct password must match');
  });

  test('Teacher Creation - Direct Mode rejects password shorter than 8 characters', async () => {
    const testEmail = `short_teacher_${Date.now()}@test.com`;
    const req = mockRequest({}, {
      name: 'Short Teacher Test',
      email: testEmail,
      employeeId: `EMP-${Date.now().toString().slice(-5)}`,
      password: 'short',
      requireVerification: false,
    });
    const res = mockResponse();

    await createTeacher(req, res, mockNext);

    assert.strictEqual(res.statusCode, 400, 'Expected HTTP 400');
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /at least 8 characters/i);
  });

  test('Teacher Creation - Invitation Mode creates unactivated teacher and returns activation link', async () => {
    const testEmail = `invite_teacher_${Date.now()}@test.com`;
    const empId = `EMP-${Date.now().toString().slice(-5)}`;

    const req = mockRequest({}, {
      name: 'Invite Teacher Test',
      email: testEmail,
      employeeId: empId,
      qualification: 'B.Ed Science',
      requireVerification: true,
    });
    const res = mockResponse();

    await createTeacher(req, res, mockNext);

    assert.strictEqual(res.statusCode, 201, 'Expected HTTP 201');
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.user.isActivated, false);
    assert.ok(res.body.data.activationLink, 'Must return activationLink in data');
    assert.match(res.body.data.activationLink, /\/activate\//);

    createdTeacherIds.push(res.body.data.teacher._id);
    createdUserIds.push(res.body.data.user.id);

    const userInDb = await User.findById(res.body.data.user.id);
    assert.strictEqual(userInDb.isActivated, false);
    assert.ok(userInDb.activationTokenHash, 'Activation token hash must exist');
  });

  // --- 3. DIRECT ACTIVATION OF EXISTING INVITATION TEACHER ---
  test('Direct Activation - Activates pending teacher with new password', async () => {
    // 1. First create an unactivated teacher via invitation mode
    const testEmail = `pending_teacher_${Date.now()}@test.com`;
    const empId = `EMP-${Date.now().toString().slice(-5)}`;

    const createReq = mockRequest({}, {
      name: 'Pending Teacher Test',
      email: testEmail,
      employeeId: empId,
      requireVerification: true,
    });
    const createRes = mockResponse();
    await createTeacher(createReq, createRes, mockNext);

    const teacherId = createRes.body.data.teacher._id;
    const userId = createRes.body.data.user.id;
    createdTeacherIds.push(teacherId);
    createdUserIds.push(userId);

    // 2. Direct activate with a new password
    const newPassword = 'DirectActivatedPassword99!';
    const activateReq = mockRequest({ id: teacherId }, { password: newPassword });
    const activateRes = mockResponse();

    await activateTeacherDirectly(activateReq, activateRes, mockNext);

    assert.strictEqual(activateRes.statusCode, 200, 'Expected HTTP 200');
    assert.strictEqual(activateRes.body.success, true);
    assert.strictEqual(activateRes.body.data.user.isActivated, true);

    const updatedUser = await User.findById(userId);
    assert.strictEqual(updatedUser.isActivated, true);
    assert.strictEqual(updatedUser.isActive, true);
    assert.ok(!updatedUser.activationTokenHash, 'Activation token hash must not be set');

    const isMatch = await updatedUser.comparePassword(newPassword);
    assert.strictEqual(isMatch, true, 'Activated user password must match new password');
  });

  test('Direct Activation - Rejects password shorter than 8 characters', async () => {
    const activateReq = mockRequest({ id: new mongoose.Types.ObjectId() }, { password: '123' });
    const activateRes = mockResponse();

    await activateTeacherDirectly(activateReq, activateRes, mockNext);

    assert.strictEqual(activateRes.statusCode, 400, 'Expected HTTP 400');
    assert.strictEqual(activateRes.body.success, false);
    assert.match(activateRes.body.message, /at least 8 characters/i);
  });

  // --- 4. RESEND INVITATION RETURNS ACTIVATION LINK ---
  test('Resend Invitation - Returns freshly generated activation link', async () => {
    const testEmail = `resend_teacher_${Date.now()}@test.com`;
    const empId = `EMP-${Date.now().toString().slice(-5)}`;

    const createReq = mockRequest({}, {
      name: 'Resend Teacher Test',
      email: testEmail,
      employeeId: empId,
      requireVerification: true,
    });
    const createRes = mockResponse();
    await createTeacher(createReq, createRes, mockNext);

    const teacherId = createRes.body.data.teacher._id;
    const userId = createRes.body.data.user.id;
    createdTeacherIds.push(teacherId);
    createdUserIds.push(userId);

    const resendReq = mockRequest({ id: teacherId });
    const resendRes = mockResponse();

    await resendInvitation(resendReq, resendRes, mockNext);

    assert.strictEqual(resendRes.statusCode, 200, 'Expected HTTP 200');
    assert.strictEqual(resendRes.body.success, true);
    assert.ok(resendRes.body.data.activationLink, 'Expected activationLink in data');
  });
});
