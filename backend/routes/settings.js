const express = require('express');
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// GET /api/settings — Get user settings
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('settings').lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user.settings || getDefaultSettings());
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

// PUT /api/settings — Update user settings
router.put('/', authMiddleware, async (req, res) => {
  try {
    const { theme, accentColor, notifications, aiFeatures } = req.body;

    const updateData = {};

    // Theme settings
    if (theme) {
      if (theme.mode && ['dark', 'light', 'system'].includes(theme.mode)) {
        updateData['settings.theme.mode'] = theme.mode;
      }
      if (theme.customTheme && typeof theme.customTheme === 'string') {
        updateData['settings.theme.customTheme'] = theme.customTheme;
      }
    }

    // Accent color
    if (accentColor && typeof accentColor === 'string') {
      if (/^#[0-9a-fA-F]{6}$/.test(accentColor)) {
        updateData['settings.accentColor'] = accentColor;
      }
    }

    // Notification settings
    if (notifications && typeof notifications === 'object') {
      if (typeof notifications.sound === 'boolean') {
        updateData['settings.notifications.sound'] = notifications.sound;
      }
      if (typeof notifications.desktop === 'boolean') {
        updateData['settings.notifications.desktop'] = notifications.desktop;
      }
      if (typeof notifications.mentions === 'boolean') {
        updateData['settings.notifications.mentions'] = notifications.mentions;
      }
      if (typeof notifications.replies === 'boolean') {
        updateData['settings.notifications.replies'] = notifications.replies;
      }
    }

    // AI feature toggles
    if (aiFeatures && typeof aiFeatures === 'object') {
      if (typeof aiFeatures.smartReplies === 'boolean') {
        updateData['settings.aiFeatures.smartReplies'] = aiFeatures.smartReplies;
      }
      if (typeof aiFeatures.sentimentAnalysis === 'boolean') {
        updateData['settings.aiFeatures.sentimentAnalysis'] = aiFeatures.sentimentAnalysis;
      }
      if (typeof aiFeatures.grammarCheck === 'boolean') {
        updateData['settings.aiFeatures.grammarCheck'] = aiFeatures.grammarCheck;
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true }
    ).select('settings').lean();

    res.json(user.settings);
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

function getDefaultSettings() {
  return {
    theme: { mode: 'dark', customTheme: 'default' },
    accentColor: '#A855F7',
    notifications: {
      sound: true,
      desktop: true,
      mentions: true,
      replies: true,
    },
    aiFeatures: {
      smartReplies: true,
      sentimentAnalysis: false,
      grammarCheck: false,
    },
  };
}

module.exports = router;
