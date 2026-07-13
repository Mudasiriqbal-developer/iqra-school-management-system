const mongoose = require('mongoose');

const classSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Class name is required'],
      trim: true,
    },
    gender: {
      type: String,
      enum: {
        values: ['male', 'female', 'mixed'],
        message: 'Gender must be male, female, or mixed',
      },
      default: 'mixed',
    },
    orderIndex: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index on { name, gender }
classSchema.index({ name: 1, gender: 1 }, { unique: true });

module.exports = mongoose.model('Class', classSchema);
