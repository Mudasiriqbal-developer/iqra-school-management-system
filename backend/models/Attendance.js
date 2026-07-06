const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    date: {
      type: String, // YYYY-MM-DD
      required: [true, 'Date is required'],
      unique: true,
    },
    records: [
      {
        studentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Student',
          required: true,
        },
        status: {
          type: String,
          enum: ['present', 'absent', 'late', 'excused'],
          required: true,
        },
      }
    ]
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Attendance', attendanceSchema);
