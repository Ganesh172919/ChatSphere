const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
    index: true,
  },
  userId: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  isAI: {
    type: Boolean,
    default: false,
  },
  triggeredBy: {
    type: String,
    default: null,
  },
  replyTo: {
    id: { type: String, default: null },
    username: { type: String, default: null },
    content: { type: String, default: null },
  },
  reactions: {
    type: Map,
    of: [String],
    default: {},
  },
  // Read receipts
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent',
  },
  readBy: [{
    userId: { type: String },
    readAt: { type: Date, default: Date.now },
  }],
  // Pinned messages
  isPinned: {
    type: Boolean,
    default: false,
  },
  pinnedBy: {
    type: String,
    default: null,
  },
  pinnedAt: {
    type: Date,
    default: null,
  },
  // Edit/delete support
  isEdited: {
    type: Boolean,
    default: false,
  },
  editedAt: {
    type: Date,
    default: null,
  },
  originalContent: {
    type: String,
    default: null,
  },
  editHistory: [{
    content: { type: String, required: true },
    editedAt: { type: Date, default: Date.now },
  }],
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
  deletedBy: {
    type: String,
    default: null,
  },
  // File attachment support
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
  memoryRefs: [{
    id: { type: String, required: true },
    summary: { type: String, required: true },
    score: { type: Number, default: null },
  }],
  modelId: {
    type: String,
    default: null,
  },
  provider: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

// Compound index for room message queries
messageSchema.index({ roomId: 1, createdAt: -1 });
// Text index for full-text search
messageSchema.index({ content: 'text', username: 'text' });
// Index for pinned messages
messageSchema.index({ roomId: 1, isPinned: 1 });

module.exports = mongoose.model('Message', messageSchema);
