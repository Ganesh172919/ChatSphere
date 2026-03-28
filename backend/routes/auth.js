const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const passport = require('passport');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const authMiddleware = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const { sendResetEmail } = require('../services/email');

const router = express.Router();

const GOOGLE_OAUTH_ENABLED = Boolean(
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CALLBACK_URL
);
const GOOGLE_LOGIN_CODE_TTL_MS = 5 * 60 * 1000;
const googleLoginCodes = new Map();

function getClientUrl() {
  return process.env.CLIENT_URL || 'http://localhost:5173';
}

// Generate access + refresh tokens
function generateTokens(user) {
  const payload = {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
  };

  const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

  return { accessToken, refreshToken };
}

// Save refresh token to DB
async function saveRefreshToken(token, userId) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await RefreshToken.create({ token, userId, expiresAt });
}

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

// POST /api/auth/register
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const normalizedUsername = typeof username === 'string' ? username.trim().toLowerCase() : '';
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!normalizedUsername || !normalizedEmail || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (normalizedUsername.length < 3 || normalizedUsername.length > 30) {
      return res.status(400).json({ error: 'Username must be 3-30 characters' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const existingUsername = await User.findOne({ username: normalizedUsername });
    if (existingUsername) {
      return res.status(409).json({ error: 'Username already taken' });
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

    res.status(201).json({
      user: user.toSafeObject(),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (err) {
    console.error('Register error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!normalizedEmail || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.passwordHash) {
      return res.status(401).json({ error: 'This account uses Google sign-in. Please sign in with Google.' });
    }

    const validPassword = await user.comparePassword(password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const tokens = generateTokens(user);
    await saveRefreshToken(tokens.refreshToken, user._id);

    res.json({
      user: user.toSafeObject(),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', authLimiter, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const storedToken = await RefreshToken.findOne({ token: refreshToken });
    if (!storedToken) {
      return res.status(403).json({ error: 'Invalid refresh token' });
    }

    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) {
        await RefreshToken.deleteOne({ token: refreshToken });
        return res.status(403).json({ error: 'User not found' });
      }

      await RefreshToken.deleteOne({ token: refreshToken });
      const tokens = generateTokens(user);
      await saveRefreshToken(tokens.refreshToken, user._id);

      res.json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    } catch (jwtErr) {
      await RefreshToken.deleteOne({ token: refreshToken });
      return res.status(403).json({ error: 'Invalid or expired refresh token' });
    }
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await RefreshToken.deleteOne({ token: refreshToken });
    }
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.json({ message: 'Logged out' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user.toSafeObject());
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', authLimiter, async (req, res) => {
  try {
    const normalizedEmail = typeof req.body.email === 'string'
      ? req.body.email.trim().toLowerCase()
      : '';

    if (!normalizedEmail) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user || user.authProvider === 'google') {
      return res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const resetUrl = `${getClientUrl()}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;
    await sendResetEmail(user.email, resetUrl);

    res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', authLimiter, async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!normalizedEmail || !token || !newPassword) {
      return res.status(400).json({ error: 'Email, token, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({
      email: normalizedEmail,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    user.passwordHash = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    await RefreshToken.deleteMany({ userId: user._id });

    res.json({ message: 'Password reset successful. Please log in with your new password.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// GET /api/auth/google
router.get('/google', (req, res, next) => {
  if (!GOOGLE_OAUTH_ENABLED) {
    return res.redirect(`${getClientUrl()}/login?error=google_not_configured`);
  }

  return passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })(req, res, next);
});

// GET /api/auth/google/callback
router.get(
  '/google/callback',
  (req, res, next) => {
    if (!GOOGLE_OAUTH_ENABLED) {
      return res.redirect(`${getClientUrl()}/login?error=google_not_configured`);
    }

    return passport.authenticate('google', {
      session: false,
      failureRedirect: `${getClientUrl()}/login?error=google_auth_failed`,
    })(req, res, next);
  },
  async (req, res) => {
    try {
      const code = issueGoogleLoginCode(req.user._id);
      res.redirect(`${getClientUrl()}/auth/google/callback?code=${code}`);
    } catch (err) {
      console.error('Google callback error:', err);
      res.redirect(`${getClientUrl()}/login?error=google_auth_failed`);
    }
  }
);

// POST /api/auth/google/exchange
router.post('/google/exchange', async (req, res) => {
  try {
    const { code } = req.body;

    if (!GOOGLE_OAUTH_ENABLED) {
      return res.status(503).json({ error: 'Google sign-in is not configured' });
    }

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Google login code is required' });
    }

    const session = consumeGoogleLoginCode(code);
    if (!session) {
      return res.status(400).json({ error: 'Invalid or expired Google login code' });
    }

    const user = await User.findById(session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const tokens = generateTokens(user);
    await saveRefreshToken(tokens.refreshToken, user._id);

    res.json({
      user: user.toSafeObject(),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (err) {
    console.error('Google exchange error:', err);
    res.status(500).json({ error: 'Failed to complete Google sign-in' });
  }
});

module.exports = router;
