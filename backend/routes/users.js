const express = require('express');
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// PUT /api/users/profile — Update profile (displayName, bio, avatar)
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { displayName, bio, avatar } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (displayName !== undefined) {
      if (displayName.length > 50) {
        return res.status(400).json({ error: 'Display name must be under 50 characters' });
      }
      user.displayName = displayName.trim();
    }

    if (bio !== undefined) {
      if (bio.length > 200) {
        return res.status(400).json({ error: 'Bio must be under 200 characters' });
      }
      user.bio = bio.trim();
    }

    if (avatar !== undefined) {
      // Accept base64 data URLs for avatar
      if (avatar && avatar.length > 500000) {
        return res.status(400).json({ error: 'Avatar image too large (max ~375KB)' });
      }
      user.avatar = avatar;
    }

    await user.save();

    res.json(user.toSafeObject());
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// GET /api/users/:id — Get public profile
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user._id.toString(),
      username: user.username,
      displayName: user.displayName || user.username,
      bio: user.bio || '',
      avatar: user.avatar,
      onlineStatus: user.onlineStatus,
      lastSeen: user.lastSeen,
      createdAt: user.createdAt,
    });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to load user' });
  }
});

module.exports = router;
