const mongoose = require('mongoose');

const actionItemSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 240,
  },
  owner: {
    type: String,
    default: null,
  },
  done: {
    type: Boolean,
    default: false,
  },
}, { _id: false });

const conversationInsightSchema = new mongoose.Schema({
  scopeKey: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  scopeType: {
    type: String,
    enum: ['conversation', 'room'],
    required: true,
  },
  scopeId: {
    type: String,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    default: null,
  },
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    default: null,
  },
  title: {
    type: String,
    default: '',
    maxlength: 120,
  },
  summary: {
    type: String,
    default: '',
    maxlength: 2400,
  },
  intent: {
    type: String,
    default: 'general',
    maxlength: 80,
  },
  topics: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
  decisions: [{
    type: String,
    trim: true,
    maxlength: 240,
  }],
  actionItems: [actionItemSchema],
  messageCount: {
    type: Number,
    default: 0,
  },
  lastGeneratedAt: {
    type: Date,
    default: Date.now,
  },
  promptVersion: {
    type: String,
    default: 'local-default',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('ConversationInsight', conversationInsightSchema);
