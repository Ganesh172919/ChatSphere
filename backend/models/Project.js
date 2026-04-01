const mongoose = require('mongoose');

const projectFileSchema = new mongoose.Schema({
  fileUrl: {
    type: String,
    required: true,
  },
  fileName: {
    type: String,
    required: true,
    trim: true,
  },
  fileType: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
    required: true,
  },
  note: {
    type: String,
    default: '',
    trim: true,
    maxlength: 240,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: true });

const projectSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 80,
  },
  description: {
    type: String,
    default: '',
    trim: true,
    maxlength: 280,
  },
  instructions: {
    type: String,
    default: '',
    trim: true,
    maxlength: 5000,
  },
  context: {
    type: String,
    default: '',
    trim: true,
    maxlength: 8000,
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 32,
  }],
  suggestedPrompts: [{
    type: String,
    trim: true,
    maxlength: 200,
  }],
  files: [projectFileSchema],
}, {
  timestamps: true,
});

projectSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model('Project', projectSchema);
