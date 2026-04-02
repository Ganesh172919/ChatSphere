const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { generateTokens, saveRefreshToken } = require('../utils/token');
const { sendResetEmail } = require('./email');

// ─── Google OAuth login-code store (in-memory, same behaviour as before) ──────
const GOOGLE_LOGIN_CODE_TTL_MS = 5 * 60 * 1000;
const googleLoginCodes = new Map();

const GOOGLE_OAUTH_ENABLED = Boolean(
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CALLBACK_URL
);

function getClientUrl() {
  return process.env.CLIENT_URL || 'http://localhost:5173';
}

function isGoogleOAuthEnabled() {
  return GOOGLE_OAUTH_ENABLED;
}

// ─── Google login-code helpers ────────────────────────────────────────────────

function issueGoogleLoginCode(userId) {
  const now = Date.now();

  for (const [code, session] of googleLoginCodes.entries()) {
    if (session.expiresAt <= now) {
      googleLoginCodes.delete(code);
    }
  }

  const code = crypto.randomBytes(32).toString('hex');
  googleLoginCodes.set(code, {
    userId: userId.toString(),
    expiresAt: now + GOOGLE_LOGIN_CODE_TTL_MS,
  });

  return code;
}

function consumeGoogleLoginCode(code) {
  const session = googleLoginCodes.get(code);
  if (!session) {
    return null;
  }

  googleLoginCodes.delete(code);

  if (session.expiresAt <= Date.now()) {
    return null;
  }

  return session;
}

// ─── Core auth operations ─────────────────────────────────────────────────────

async function registerUser({ username, email, password }) {
  const normalizedUsername = typeof username === 'string' ? username.trim().toLowerCase() : '';
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!normalizedUsername || !normalizedEmail || !password) {
    return { status: 400, error: 'Username, email, and password are required' };
  }

  if (normalizedUsername.length < 3 || normalizedUsername.length > 30) {
    return { status: 400, error: 'Username must be 3-30 characters' };
  }

  if (password.length < 6) {
    return { status: 400, error: 'Password must be at least 6 characters' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return { status: 400, error: 'Invalid email format' };
  }

  const existingEmail = await User.findOne({ email: normalizedEmail });
  if (existingEmail) {
    return { status: 409, error: 'Email already registered' };
  }

  const existingUsername = await User.findOne({ username: normalizedUsername });
  if (existingUsername) {
    return { status: 409, error: 'Username already taken' };
  }

  const user = new User({
    username: normalizedUsername,
    email: normalizedEmail,
    passwordHash: password,
    displayName: username.trim(),
    authProvider: 'local',
  });
  await user.save();

  const tokens = generateTokens(user);
  await saveRefreshToken(tokens.refreshToken, user._id);

  return {
    status: 201,
    data: {
      user: user.toSafeObject(),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    },
  };
}

async function loginUser({ email, password }) {
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!normalizedEmail || !password) {
    return { status: 400, error: 'Email and password are required' };
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return { status: 401, error: 'Invalid email or password' };
  }

  if (!user.passwordHash) {
    return { status: 401, error: 'This account uses Google sign-in. Please sign in with Google.' };
  }

  const validPassword = await user.comparePassword(password);
  if (!validPassword) {
    return { status: 401, error: 'Invalid email or password' };
  }

  const tokens = generateTokens(user);
  await saveRefreshToken(tokens.refreshToken, user._id);

  return {
    status: 200,
    data: {
      user: user.toSafeObject(),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    },
  };
}

async function refreshTokens({ refreshToken }) {
  if (!refreshToken) {
    return { status: 400, error: 'Refresh token is required' };
  }

  const storedToken = await RefreshToken.findOne({ token: refreshToken });
  if (!storedToken) {
    return { status: 403, error: 'Invalid refresh token' };
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (_jwtErr) {
    await RefreshToken.deleteOne({ token: refreshToken });
    return { status: 403, error: 'Invalid or expired refresh token' };
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    await RefreshToken.deleteOne({ token: refreshToken });
    return { status: 403, error: 'User not found' };
  }

  await RefreshToken.deleteOne({ token: refreshToken });
  const tokens = generateTokens(user);
  await saveRefreshToken(tokens.refreshToken, user._id);

  return {
    status: 200,
    data: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    },
  };
}

async function logoutUser({ refreshToken }) {
  if (refreshToken) {
    await RefreshToken.deleteOne({ token: refreshToken });
  }
  return { status: 200, data: { message: 'Logged out successfully' } };
}

async function getMe(userId) {
  const user = await User.findById(userId);
  if (!user) {
    return { status: 404, error: 'User not found' };
  }

  return { status: 200, data: user.toSafeObject() };
}

async function forgotPassword({ email }) {
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!normalizedEmail) {
    return { status: 400, error: 'Email is required' };
  }

  const genericMessage = 'If an account with that email exists, a reset link has been sent.';
  const user = await User.findOne({ email: normalizedEmail });

  if (!user || user.authProvider === 'google') {
    return { status: 200, data: { message: genericMessage } };
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  const resetUrl = `${getClientUrl()}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;
  await sendResetEmail(user.email, resetUrl);

  return { status: 200, data: { message: genericMessage } };
}

async function resetPassword({ email, token, newPassword }) {
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!normalizedEmail || !token || !newPassword) {
    return { status: 400, error: 'Email, token, and new password are required' };
  }

  if (newPassword.length < 6) {
    return { status: 400, error: 'Password must be at least 6 characters' };
  }

  const user = await User.findOne({
    email: normalizedEmail,
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: new Date() },
  });

  if (!user) {
    return { status: 400, error: 'Invalid or expired reset token' };
  }

  user.passwordHash = newPassword;
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  await user.save();

  await RefreshToken.deleteMany({ userId: user._id });

  return { status: 200, data: { message: 'Password reset successful. Please log in with your new password.' } };
}

async function exchangeGoogleCode({ code }) {
  if (!GOOGLE_OAUTH_ENABLED) {
    return { status: 503, error: 'Google sign-in is not configured' };
  }

  if (!code || typeof code !== 'string') {
    return { status: 400, error: 'Google login code is required' };
  }

  const session = consumeGoogleLoginCode(code);
  if (!session) {
    return { status: 400, error: 'Invalid or expired Google login code' };
  }

  const user = await User.findById(session.userId);
  if (!user) {
    return { status: 404, error: 'User not found' };
  }

  const tokens = generateTokens(user);
  await saveRefreshToken(tokens.refreshToken, user._id);

  return {
    status: 200,
    data: {
      user: user.toSafeObject(),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    },
  };
}

module.exports = {
  // Core operations
  registerUser,
  loginUser,
  refreshTokens,
  logoutUser,
  getMe,
  forgotPassword,
  resetPassword,
  exchangeGoogleCode,
  // Google helpers (used by the controller / routes layer)
  issueGoogleLoginCode,
  isGoogleOAuthEnabled,
  getClientUrl,
};
