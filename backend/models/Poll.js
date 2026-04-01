const mongoose = require('mongoose');

const pollSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
  },
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  creatorUsername: {
    type: String,
    required: true,
  },
  question: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
  },
  options: [{
    text: { type: String, required: true, trim: true, maxlength: 200 },
    votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  }],
  // Settings
  allowMultipleVotes: {
    type: Boolean,
    default: false,
  },
  isAnonymous: {
    type: Boolean,
    default: false,
  },
  expiresAt: {
    type: Date,
    default: null,
  },
  isClosed: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

pollSchema.index({ roomId: 1, createdAt: -1 });

// Virtual for total votes
pollSchema.virtual('totalVotes').get(function () {
  return this.options.reduce((sum, opt) => sum + opt.votes.length, 0);
});

// Check if a user has voted
pollSchema.methods.hasUserVoted = function (userId) {
  return this.options.some(opt =>
    opt.votes.some(v => v.toString() === userId.toString())
  );
};

// Check if poll is expired
pollSchema.methods.isExpired = function () {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

module.exports = mongoose.model('Poll', pollSchema);
