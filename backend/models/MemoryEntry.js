const mongoose = require('mongoose');

const memoryEntrySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  summary: {
    type: String,
    required: true,
    trim: true,
    maxlength: 280,
  },
  details: {
    type: String,
    default: '',
    maxlength: 1200,
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
  fingerprint: {
    type: String,
    required: true,
  },
  sourceType: {
    type: String,
    enum: ['conversation', 'room', 'import', 'manual'],
    required: true,
  },
  sourceConversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    default: null,
  },
  sourceRoomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    default: null,
  },
  sourceMessageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null,
  },
  sourceImportSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ImportSession',
    default: null,
  },
  confidenceScore: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.6,
  },
  importanceScore: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.5,
  },
  recencyScore: {
    type: Number,
    min: 0,
    max: 1,
    default: 1,
  },
  pinned: {
    type: Boolean,
    default: false,
  },
  usageCount: {
    type: Number,
    default: 0,
  },
  lastObservedAt: {
    type: Date,
    default: Date.now,
  },
  lastUsedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

memoryEntrySchema.index({ userId: 1, fingerprint: 1 }, { unique: true });
memoryEntrySchema.index({ userId: 1, updatedAt: -1 });
memoryEntrySchema.index({ userId: 1, pinned: 1, updatedAt: -1 });

module.exports = mongoose.model('MemoryEntry', memoryEntrySchema);
