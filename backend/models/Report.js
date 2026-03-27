const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // What is being reported
  targetType: {
    type: String,
    enum: ['user', 'message'],
    required: true,
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  // Context
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    default: null,
  },
  reason: {
    type: String,
    enum: ['spam', 'harassment', 'hate_speech', 'inappropriate_content', 'impersonation', 'other'],
    required: true,
  },
  description: {
    type: String,
    maxlength: 1000,
    default: '',
  },
  // Resolution
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'action_taken', 'dismissed'],
    default: 'pending',
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  reviewNote: {
    type: String,
    default: '',
  },
  reviewedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

reportSchema.index({ reporterId: 1 });
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ targetType: 1, targetId: 1 });
reportSchema.index({ reason: 1 });

module.exports = mongoose.model('Report', reportSchema);
