const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student ID is required'],
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject ID is required'],
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class ID is required'],
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      required: [true, 'Section ID is required'],
    },
    examType: {
      type: String,
      enum: {
        values: ['quiz', 'assignment', 'midterm', 'final'],
        message: 'Exam type must be quiz, assignment, midterm, or final',
      },
      required: [true, 'Exam type is required'],
    },
    marksObtained: {
      type: Number,
      required: [true, 'Marks obtained is required'],
      min: [0, 'Marks cannot be negative'],
    },
    totalMarks: {
      type: Number,
      required: [true, 'Total marks is required'],
      min: [1, 'Total marks must be at least 1'],
    },
    comments: {
      type: String,
      trim: true,
      default: '',
    },
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Graded By user reference is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate grade entries for same student, subject, examType
gradeSchema.index({ studentId: 1, subjectId: 1, examType: 1 }, { unique: true });

module.exports = mongoose.model('Grade', gradeSchema);
