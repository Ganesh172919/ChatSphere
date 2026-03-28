const express = require('express');
const authMiddleware = require('../middleware/auth');
const Report = require('../models/Report');
const User = require('../models/User');
const Message = require('../models/Message');
const { isValidObjectId } = require('../helpers/validate');

const router = express.Router();

// POST /api/moderation/report — Submit a report
router.post('/report', authMiddleware, async (req, res) => {
  try {
    const { targetType, targetId, roomId, reason, description } = req.body;

    if (!targetType || !targetId || !reason) {
      return res.status(400).json({ error: 'targetType, targetId, and reason are required' });
    }

    if (!['user', 'message'].includes(targetType)) {
      return res.status(400).json({ error: 'targetType must be "user" or "message"' });
    }

    if (!isValidObjectId(targetId)) {
      return res.status(400).json({ error: 'Invalid target ID' });
    }

    const validReasons = ['spam', 'harassment', 'hate_speech', 'inappropriate_content', 'impersonation', 'other'];
    if (!validReasons.includes(reason)) {
      return res.status(400).json({ error: `reason must be one of: ${validReasons.join(', ')}` });
    }

    // Prevent self-reporting
    if (targetType === 'user' && targetId === req.user.id) {
      return res.status(400).json({ error: 'Cannot report yourself' });
    }

    if (targetType === 'user') {
      const targetUser = await User.findById(targetId).select('_id').lean();
      if (!targetUser) {
        return res.status(404).json({ error: 'Reported user not found' });
      }
    }

    if (targetType === 'message') {
      const targetMessage = await Message.findById(targetId).select('_id roomId').lean();
      if (!targetMessage) {
        return res.status(404).json({ error: 'Reported message not found' });
      }

      if (roomId && targetMessage.roomId && targetMessage.roomId.toString() !== roomId) {
        return res.status(400).json({ error: 'Message does not belong to the selected room' });
      }
    }

    // Check for duplicate pending reports from this user
    const existing = await Report.findOne({
      reporterId: req.user.id,
      targetType,
      targetId,
      status: 'pending',
    });

    if (existing) {
      return res.status(409).json({ error: 'You have already reported this. It is under review.' });
    }

    const report = new Report({
      reporterId: req.user.id,
      targetType,
      targetId,
      roomId: roomId && isValidObjectId(roomId) ? roomId : null,
      reason,
      description: description?.trim().slice(0, 1000) || '',
    });

    await report.save();

    res.status(201).json({
      id: report._id.toString(),
      message: 'Report submitted successfully. Our team will review it.',
    });
  } catch (err) {
    console.error('Report error:', err);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

// POST /api/moderation/block — Block a user
router.post('/block', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId || !isValidObjectId(userId)) {
      return res.status(400).json({ error: 'Valid userId is required' });
    }

    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot block yourself' });
    }

    const [user, targetUser] = await Promise.all([
      User.findById(req.user.id),
      User.findById(userId).select('_id').lean(),
    ]);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    if (!user.blockedUsers) {
      user.blockedUsers = [];
    }

    const alreadyBlocked = user.blockedUsers.some(
      id => id.toString() === userId
    );

    if (alreadyBlocked) {
      return res.status(409).json({ error: 'User is already blocked' });
    }

    user.blockedUsers.push(userId);
    await user.save();

    res.json({ message: 'User blocked successfully' });
  } catch (err) {
    console.error('Block error:', err);
    res.status(500).json({ error: 'Failed to block user' });
  }
});

// DELETE /api/moderation/block/:userId — Unblock a user
router.delete('/block/:userId', authMiddleware, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.blockedUsers) {
      return res.status(404).json({ error: 'User not found in blocked list' });
    }

    user.blockedUsers = user.blockedUsers.filter(
      id => id.toString() !== req.params.userId
    );

    await user.save();

    res.json({ message: 'User unblocked successfully' });
  } catch (err) {
    console.error('Unblock error:', err);
    res.status(500).json({ error: 'Failed to unblock user' });
  }
});

// GET /api/moderation/blocked — Get blocked users list
router.get('/blocked', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('blockedUsers', 'username displayName avatar')
      .lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const blockedUsers = (user.blockedUsers || []).map(u => ({
      userId: u._id.toString(),
      username: u.username,
      displayName: u.displayName || u.username,
      avatar: u.avatar || null,
    }));

    res.json(blockedUsers);
  } catch (err) {
    console.error('Get blocked error:', err);
    res.status(500).json({ error: 'Failed to load blocked users' });
  }
});

module.exports = router;
