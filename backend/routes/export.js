const express = require('express');
const authMiddleware = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Room = require('../models/Room');
const { isValidObjectId, findRoomMember } = require('../helpers/validate');
const { exportUserBundle } = require('../services/importExport');

const router = express.Router();

// GET /api/export/conversations - Export conversations and memory
router.get('/conversations', authMiddleware, async (req, res) => {
  try {
    const format = ['normalized', 'markdown', 'adapter'].includes(req.query.format)
      ? req.query.format
      : 'normalized';
    const payload = await exportUserBundle({ userId: req.user.id, format });

    if (format === 'markdown') {
      res.setHeader('Content-Disposition', 'attachment; filename=chatsphere-export.md');
      res.type('text/markdown');
      return res.send(payload);
    }

    res.setHeader('Content-Disposition', 'attachment; filename=chatsphere-conversations.json');
    return res.json(payload);
  } catch (err) {
    console.error('Export conversations error:', err);
    res.status(500).json({ error: 'Failed to export conversations' });
  }
});

// GET /api/export/rooms/:roomId - Export room messages
router.get('/rooms/:roomId', authMiddleware, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.roomId)) {
      return res.status(400).json({ error: 'Invalid room ID' });
    }

    const room = await Room.findById(req.params.roomId).lean();
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (!findRoomMember(room, req.user.id)) {
      return res.status(403).json({ error: 'You must be a room member to export messages' });
    }

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
      messages: messages.map((message) => ({
        id: message._id.toString(),
        username: message.username,
        content: message.isDeleted ? '[deleted]' : message.content,
        isAI: message.isAI || false,
        isEdited: message.isEdited || false,
        fileUrl: message.fileUrl || null,
        fileName: message.fileName || null,
        createdAt: message.createdAt,
        memoryRefs: message.memoryRefs || [],
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

// GET /api/export/conversation/:id - Export one conversation as markdown or json
router.get('/conversation/:id', authMiddleware, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user.id,
    }).lean();

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const format = req.query.format === 'markdown' ? 'markdown' : 'json';
    if (format === 'markdown') {
      const markdown = [
        `# ${conversation.title}`,
        '',
        ...conversation.messages.map((message) => `**${message.role}**: ${message.content}`),
      ].join('\n');

      res.type('text/markdown');
      return res.send(markdown);
    }

    return res.json(conversation);
  } catch (err) {
    console.error('Export single conversation error:', err);
    res.status(500).json({ error: 'Failed to export conversation' });
  }
});

module.exports = router;
