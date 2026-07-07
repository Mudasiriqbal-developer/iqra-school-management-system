const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Section name is required'],
      trim: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class ID is required'],
    },
    classTeacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index on { name, classId }
sectionSchema.index({ name: 1, classId: 1 }, { unique: true });

// Sparse unique index on classTeacherId
sectionSchema.index({ classTeacherId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Section', sectionSchema);
