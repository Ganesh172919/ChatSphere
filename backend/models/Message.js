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
}, {
  timestamps: true,
});

// Compound index for room message queries
messageSchema.index({ roomId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
