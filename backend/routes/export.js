const express = require('express');
const authMiddleware = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Room = require('../models/Room');
const { isValidObjectId, findRoomMember } = require('../helpers/validate');

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

// GET /api/export/rooms/:roomId — Export room messages (membership required)
router.get('/rooms/:roomId', authMiddleware, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.roomId)) {
      return res.status(400).json({ error: 'Invalid room ID' });
    }

    const room = await Room.findById(req.params.roomId).lean();
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check membership — only room members can export
    if (!findRoomMember(room, req.user.id)) {
      return res.status(403).json({ error: 'You must be a room member to export messages' });
    }

    // userId is a String field, not an ObjectId reference — don't populate
    const messages = await Message.find({ roomId: req.params.roomId })
      .sort({ createdAt: 1 })
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
        username: m.username,
        content: m.isDeleted ? '[deleted]' : m.content,
        isAI: m.isAI || false,
        isEdited: m.isEdited || false,
        fileUrl: m.fileUrl || null,
        fileName: m.fileName || null,
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
