const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    lowercase: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  passwordHash: {
    type: String,
    default: null,
  },
  googleId: {
    type: String,
    default: null,
    sparse: true,
  },
  avatar: {
    type: String,
    default: null,
  },
  displayName: {
    type: String,
    default: null,
  },
  bio: {
    type: String,
    maxlength: 200,
    default: '',
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local',
  },
  // Presence tracking
  onlineStatus: {
    type: String,
    enum: ['online', 'away', 'offline'],
    default: 'offline',
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
  // User settings & preferences
  settings: {
    theme: {
      mode: { type: String, enum: ['dark', 'light', 'system'], default: 'dark' },
      customTheme: { type: String, default: 'default' },
    },
    accentColor: { type: String, default: '#A855F7' },
    notifications: {
      sound: { type: Boolean, default: true },
      desktop: { type: Boolean, default: true },
      mentions: { type: Boolean, default: true },
      replies: { type: Boolean, default: true },
    },
    aiFeatures: {
      smartReplies: { type: Boolean, default: true },
      sentimentAnalysis: { type: Boolean, default: false },
      grammarCheck: { type: Boolean, default: false },
    },
  },
  // Blocked users
  blockedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  // Admin flag
  isAdmin: {
    type: Boolean,
    default: false,
  },
  // Password reset
  resetPasswordToken: {
    type: String,
    default: null,
  },
  resetPasswordExpires: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Compare password instance method
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash') || !this.passwordHash) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Transform output — remove sensitive fields
userSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    username: this.username,
    email: this.email,
    avatar: this.avatar,
    displayName: this.displayName || this.username,
    bio: this.bio || '',
    authProvider: this.authProvider,
    onlineStatus: this.onlineStatus,
    lastSeen: this.lastSeen?.toISOString() || null,
    isAdmin: this.isAdmin || false,
    createdAt: this.createdAt.toISOString(),
  };
};

module.exports = mongoose.model('User', userSchema);
