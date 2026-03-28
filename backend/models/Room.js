const mongoose = require('mongoose');
const { buildInitialRoomHistory } = require('../services/promptCatalog');

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
    default: '',
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
  maxUsers: {
    type: Number,
    default: 20,
    min: 2,
    max: 100,
  },
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  members: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['admin', 'moderator', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
  }],
  pinnedMessages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
  }],
  aiHistory: [{
    role: { type: String, enum: ['user', 'model'] },
    parts: [{ text: String }],
  }],
}, {
  timestamps: true,
});

roomSchema.index({ creatorId: 1 });
roomSchema.index({ tags: 1 });

roomSchema.pre('save', function (next) {
  if (this.isNew && this.aiHistory.length === 0) {
    this.aiHistory = buildInitialRoomHistory(this.name);
  }

  next();
});

module.exports = mongoose.model('Room', roomSchema);
