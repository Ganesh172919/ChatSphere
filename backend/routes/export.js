const express = require('express');
const authMiddleware = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Room = require('../models/Room');

const router = express.Router();

// GET /api/export/conversations — Export solo conversations
router.get('/conversations', authMiddleware, async (req, res) => {
  try {
    const conversations = await Conversation.find({ userId: req.user.id })
      .sort({ updatedAt: -1 })
      .lean();

    const exportData = {
      exportedAt: new Date().toISOString(),
      userId: req.user.id,
      username: req.user.username,
      type: 'solo_conversations',
      conversations: conversations.map(c => ({
        id: c._id.toString(),
        title: c.title || 'Untitled',
        messages: (c.messages || []).map(m => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        })),
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      totalConversations: conversations.length,
    };

    res.setHeader('Content-Disposition', 'attachment; filename=chatsphere-conversations.json');
    res.setHeader('Content-Type', 'application/json');
    res.json(exportData);
  } catch (err) {
    console.error('Export conversations error:', err);
    res.status(500).json({ error: 'Failed to export conversations' });
  }
});

// GET /api/export/rooms/:roomId — Export room messages
router.get('/rooms/:roomId', authMiddleware, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId).lean();
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const messages = await Message.find({ roomId: req.params.roomId })
      .sort({ createdAt: 1 })
      .populate('userId', 'username displayName')
      .lean();

    const exportData = {
      exportedAt: new Date().toISOString(),
      exportedBy: req.user.username,
      type: 'room_messages',
      room: {
        id: room._id.toString(),
        name: room.name,
        description: room.description || '',
      },
      messages: messages.map(m => ({
        id: m._id.toString(),
        username: m.userId?.username || 'Unknown',
        displayName: m.userId?.displayName || m.userId?.username || 'Unknown',
        content: m.content,
        isAI: m.isAI || false,
        createdAt: m.createdAt,
      })),
      totalMessages: messages.length,
    };

    const filename = `chatsphere-room-${room.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'application/json');
    res.json(exportData);
  } catch (err) {
    console.error('Export room error:', err);
    res.status(500).json({ error: 'Failed to export room messages' });
  }
});

module.exports = router;
