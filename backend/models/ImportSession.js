const mongoose = require('mongoose');

const importSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  sourceType: {
    type: String,
    enum: ['chatgpt', 'claude', 'markdown', 'text', 'json'],
    required: true,
  },
  sourceName: {
    type: String,
    default: 'Imported history',
  },
  fingerprint: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['previewed', 'imported'],
    default: 'previewed',
  },
  preview: {
    conversationCount: { type: Number, default: 0 },
    memoryCount: { type: Number, default: 0 },
    duplicateCount: { type: Number, default: 0 },
    errors: [{ type: String }],
  },
  importedConversationIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
  }],
  importedMemoryIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MemoryEntry',
  }],
}, {
  timestamps: true,
});

importSessionSchema.index({ userId: 1, fingerprint: 1 }, { unique: true });

module.exports = mongoose.model('ImportSession', importSessionSchema);
