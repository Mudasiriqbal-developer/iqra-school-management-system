const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'Teacher ID is required'],
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
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject ID is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index to prevent assigning two different teachers to the same subject in the same section
assignmentSchema.index({ classId: 1, sectionId: 1, subjectId: 1 }, { unique: true });

module.exports = mongoose.model('Assignment', assignmentSchema);
