const mongoose = require('mongoose');

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
  // Members with roles
  members: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['admin', 'moderator', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
  }],
  // Pinned message IDs
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

// Initialize AI history with system prompt
roomSchema.pre('save', function (next) {
  if (this.isNew && this.aiHistory.length === 0) {
    this.aiHistory = [
      {
        role: 'user',
        parts: [{ text: `You are an advanced reasoning engine — not a simple assistant.
You think deeply, challenge assumptions, and provide structured, insightful responses.
When answering: break down complex problems step by step, provide multiple angles,
use analogies when helpful, cite reasoning behind conclusions, and never give
shallow one-liner answers unless explicitly asked. You are direct, intellectually
honest, and occasionally witty. Format responses using markdown — headers, bullets,
code blocks, and bold text where appropriate. Think before you speak.
You are in a group chat room called "${this.name}". Multiple users may interact with you. Address them by name when relevant.` }]
      },
      {
        role: 'model',
        parts: [{ text: 'Understood. I am ready to engage in deep, structured reasoning within this group context. Let\'s think together.' }]
      }
    ];
  }
  next();
});

module.exports = mongoose.model('Room', roomSchema);
