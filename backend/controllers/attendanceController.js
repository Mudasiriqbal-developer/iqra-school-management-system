const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Section = require('../models/Section');

/**
 * @desc    Mark daily attendance for a class section
 * @route   POST /api/attendance
 * @access  Private (Teacher Only)
 */
const markAttendance = async (req, res, next) => {
  try {
    const { classId, sectionId, date, records } = req.body;

    if (!classId || !sectionId || !date || !records || !Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Bad Request: classId, sectionId, date, and records array are required',
      });
    }

    // 1. Validate every studentId belongs to that classId + sectionId
    const studentIds = records.map(r => r.studentId);
    const validStudentsCount = await Student.countDocuments({
      _id: { $in: studentIds },
      classId,
      sectionId,
    });

    if (validStudentsCount !== studentIds.length) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Validation Error: One or more student IDs are invalid or do not belong to the specified class and section.',
      });
    }

    // 2. Normalize date to UTC midnight
    const parsedDate = new Date(date);
    parsedDate.setUTCHours(0, 0, 0, 0);

    // 3. findOneAndUpdate with upsert:true on { classId, sectionId, date }
    const updatedAttendance = await Attendance.findOneAndUpdate(
      { classId, sectionId, date: parsedDate },
      {
        classId,
        sectionId,
        teacherId: req.teacher._id, // populated in verifyClassTeacher middleware
        date: parsedDate,
        records,
      },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      data: updatedAttendance,
      message: 'Attendance marked successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get attendance records for a class section
 * @route   GET /api/attendance
 * @access  Private (Admin, Teacher)
 */
const getAttendanceByClass = async (req, res, next) => {
  try {
    let classId = req.query.classId;
    let sectionId = req.query.sectionId;
    const { date, startDate, endDate } = req.query;

    // 1. Resolve credentials/permissions
    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ userId: req.user.id });
      if (!teacher) {
        return res.status(403).json({
          success: false,
          data: null,
          message: 'Forbidden: Current user is not registered as a teacher',
        });
      }

      // For teachers, ignore query classId/sectionId and force to their own classTeacher section
      const section = await Section.findOne({ classTeacherId: teacher._id });
      if (!section) {
        return res.status(200).json({
          success: true,
          data: [],
          message: 'You are not assigned as a Class Teacher to any section.',
        });
      }
      classId = section.classId.toString();
      sectionId = section._id.toString();
    } else {
      // Admin: must supply classId and sectionId
      if (!classId || !sectionId) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'Bad Request: classId and sectionId are required for admin queries',
        });
      }
    }

    // 2. Build the query object
    const query = { classId, sectionId };

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    } else if (date) {
      const targetDate = new Date(date);
      targetDate.setUTCHours(0, 0, 0, 0);
      query.date = targetDate;
    }

    // 3. Retrieve and populate records
    const attendances = await Attendance.find(query)
      .populate({
        path: 'records.studentId',
        select: 'fullName registrationNumber',
      })
      .populate('classId', 'name')
      .populate('sectionId', 'name')
      .sort({ date: 1 });

    return res.status(200).json({
      success: true,
      data: attendances,
      message: 'Attendance retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get attendance summary for a specific student
 * @route   GET /api/attendance/summary/:studentId
 * @access  Private (Admin, Teacher)
 */
const getStudentAttendanceSummary = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    const attendanceRecords = await Attendance.find({
      'records.studentId': studentId,
    });

    let present = 0;
    let absent = 0;
    let late = 0;
    let leave = 0;

    attendanceRecords.forEach(att => {
      const rec = att.records.find(r => r.studentId.toString() === studentId);
      if (rec) {
        if (rec.status === 'present') present++;
        else if (rec.status === 'absent') absent++;
        else if (rec.status === 'late') late++;
        else if (rec.status === 'leave') leave++;
      }
    });

    const totalDays = present + absent + late + leave;
    const attendancePercentage = totalDays > 0 ? Math.round(((present + late) / totalDays) * 100) : 0;

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          present,
          absent,
          late,
          leave,
          totalDays,
          attendancePercentage,
        },
      },
      message: 'Student attendance summary retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  markAttendance,
  getAttendanceByClass,
  getStudentAttendanceSummary,
};
