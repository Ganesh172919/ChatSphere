const express = require('express');
const authMiddleware = require('../middleware/auth');
const Conversation = require('../models/Conversation');

const router = express.Router();

// GET /api/conversations — List user's conversations
router.get('/', authMiddleware, async (req, res) => {
  try {
    const conversations = await Conversation.find({ userId: req.user.id })
      .select('title messages createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    const result = conversations.map(c => ({
      id: c._id.toString(),
      title: c.title,
      messageCount: c.messages.length,
      lastMessage: c.messages.length > 0 ? c.messages[c.messages.length - 1].content.slice(0, 100) : '',
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    res.json(result);
  } catch (err) {
    console.error('List conversations error:', err);
    res.status(500).json({ error: 'Failed to load conversations' });
  }
});

// GET /api/conversations/:id — Get full conversation
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user.id,
    }).lean();

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({
      id: conversation._id.toString(),
      title: conversation.title,
      messages: conversation.messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      })),
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    });
  } catch (err) {
    console.error('Get conversation error:', err);
    res.status(500).json({ error: 'Failed to load conversation' });
  }
});

// DELETE /api/conversations/:id — Delete conversation
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await Conversation.deleteOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ message: 'Conversation deleted' });
  } catch (err) {
    console.error('Delete conversation error:', err);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

module.exports = router;
