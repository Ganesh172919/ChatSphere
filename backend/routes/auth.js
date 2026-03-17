const express = require('express');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

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
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await RefreshToken.create({ token, userId, expiresAt });
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: 'Username must be 3-30 characters' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check existing
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const existingUsername = await User.findOne({ username: username.toLowerCase() });
    if (existingUsername) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    // Create user — passwordHash is hashed by pre-save hook
    const user = new User({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      passwordHash: password,
      displayName: username,
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
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
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
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    // Check if token exists in DB
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

      // Rotate: delete old, create new
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

// GET /api/auth/google — Redirect to Google OAuth
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false,
}));

// GET /api/auth/google/callback — Handle Google OAuth callback
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=google_auth_failed` }),
  async (req, res) => {
    try {
      const user = req.user;
      const tokens = generateTokens(user);
      await saveRefreshToken(tokens.refreshToken, user._id);

      // Redirect to frontend with tokens in URL params
      const clientURL = process.env.CLIENT_URL || 'http://localhost:5173';
      const params = new URLSearchParams({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        userId: user._id.toString(),
        username: user.username,
        email: user.email,
        displayName: user.displayName || user.username,
        avatar: user.avatar || '',
        authProvider: user.authProvider,
      });

      res.redirect(`${clientURL}/auth/google/callback?${params.toString()}`);
    } catch (err) {
      console.error('Google callback error:', err);
      const clientURL = process.env.CLIENT_URL || 'http://localhost:5173';
      res.redirect(`${clientURL}/login?error=google_auth_failed`);
    }
  }
);

module.exports = router;
