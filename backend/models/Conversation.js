const mongoose = require('mongoose');

const conversationMessageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  memoryRefs: [{
    id: { type: String, required: true },
    summary: { type: String, required: true },
    score: { type: Number, default: null },
  }],
  fileUrl: {
    type: String,
    default: null,
  },
  fileName: {
    type: String,
    default: null,
  },
  fileType: {
    type: String,
    default: null,
  },
  fileSize: {
    type: Number,
    default: null,
  },
  modelId: {
    type: String,
    default: null,
  },
  provider: {
    type: String,
    default: null,
  },
}, { _id: false });

const conversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  messages: [conversationMessageSchema],
  sourceType: {
    type: String,
    enum: ['native', 'chatgpt', 'claude', 'markdown', 'text', 'json'],
    default: 'native',
  },
  sourceLabel: {
    type: String,
    default: 'ChatSphere',
  },
  importFingerprint: {
    type: String,
    default: null,
    index: true,
  },
  importSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ImportSession',
    default: null,
  },
}, {
  timestamps: true,
});

// Index for user-specific queries sorted by recency
conversationSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
