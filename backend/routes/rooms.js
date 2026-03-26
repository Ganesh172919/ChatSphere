const express = require('express');
const authMiddleware = require('../middleware/auth');
const Room = require('../models/Room');
const Message = require('../models/Message');

const router = express.Router();

// GET /api/rooms — List all rooms
router.get('/', authMiddleware, async (req, res) => {
  try {
    const rooms = await Room.find()
      .select('name description tags maxUsers creatorId createdAt')
      .sort({ createdAt: -1 })
      .lean();

    // Get message counts in parallel
    const roomsWithCounts = await Promise.all(
      rooms.map(async (room) => {
        const messageCount = await Message.countDocuments({ roomId: room._id });
        return {
          id: room._id.toString(),
          name: room.name,
          description: room.description,
          tags: room.tags,
          maxUsers: room.maxUsers,
          creatorId: room.creatorId.toString(),
          createdAt: room.createdAt,
          messageCount,
        };
      })
    );

    res.json(roomsWithCounts);
  } catch (err) {
    console.error('List rooms error:', err);
    res.status(500).json({ error: 'Failed to load rooms' });
  }
});

// POST /api/rooms — Create room
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, tags, maxUsers } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Room name is required' });
    }

    if (name.length > 50) {
      return res.status(400).json({ error: 'Room name must be under 50 characters' });
    }

    const room = new Room({
      name: name.trim(),
      description: (description || '').trim(),
      tags: Array.isArray(tags) ? tags.map(t => t.trim().toLowerCase()).filter(Boolean) : [],
      maxUsers: Math.min(Math.max(parseInt(maxUsers) || 20, 2), 100),
      creatorId: req.user.id,
    });

    await room.save();

    res.status(201).json({
      id: room._id.toString(),
      name: room.name,
      description: room.description,
      tags: room.tags,
      maxUsers: room.maxUsers,
      creatorId: room.creatorId.toString(),
      createdAt: room.createdAt,
      messageCount: 0,
    });
  } catch (err) {
    console.error('Create room error:', err);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// GET /api/rooms/:id — Get room + recent messages
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id).lean();
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const messages = await Message.find({ roomId: room._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Reverse to chronological order
    const formattedMessages = messages.reverse().map(m => ({
      id: m._id.toString(),
      userId: m.userId,
      username: m.username,
      content: m.content,
      timestamp: m.createdAt,
      isAI: m.isAI,
      triggeredBy: m.triggeredBy,
      replyTo: m.replyTo && m.replyTo.id ? m.replyTo : null,
      reactions: m.reactions ? (m.reactions instanceof Map ? Object.fromEntries(m.reactions) : m.reactions) : {},
      status: m.status || 'sent',
      isPinned: m.isPinned || false,
    }));

    res.json({
      id: room._id.toString(),
      name: room.name,
      description: room.description,
      tags: room.tags,
      maxUsers: room.maxUsers,
      creatorId: room.creatorId.toString(),
      createdAt: room.createdAt,
      messages: formattedMessages,
    });
  } catch (err) {
    console.error('Get room error:', err);
    res.status(500).json({ error: 'Failed to load room' });
  }
});

// DELETE /api/rooms/:id — Delete room (creator only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.creatorId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only the room creator can delete this room' });
    }

    // Delete room and its messages
    await Promise.all([
      Room.deleteOne({ _id: room._id }),
      Message.deleteMany({ roomId: room._id }),
    ]);

    res.json({ message: 'Room deleted successfully' });
  } catch (err) {
    console.error('Delete room error:', err);
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

// POST /api/rooms/:id/pin/:messageId — Pin a message
router.post('/:id/pin/:messageId', authMiddleware, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.roomId.toString() !== room._id.toString()) {
      return res.status(400).json({ error: 'Message does not belong to this room' });
    }

    // Update message
    message.isPinned = true;
    message.pinnedBy = req.user.username || req.user.id;
    message.pinnedAt = new Date();
    await message.save();

    // Add to room's pinned list (avoid duplicates)
    if (!room.pinnedMessages.includes(message._id)) {
      room.pinnedMessages.push(message._id);
      await room.save();
    }

    res.json({ message: 'Message pinned', messageId: message._id.toString() });
  } catch (err) {
    console.error('Pin message error:', err);
    res.status(500).json({ error: 'Failed to pin message' });
  }
});

// DELETE /api/rooms/:id/pin/:messageId — Unpin a message
router.delete('/:id/pin/:messageId', authMiddleware, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const message = await Message.findById(req.params.messageId);
    if (message) {
      message.isPinned = false;
      message.pinnedBy = null;
      message.pinnedAt = null;
      await message.save();
    }

    room.pinnedMessages = room.pinnedMessages.filter(
      (id) => id.toString() !== req.params.messageId
    );
    await room.save();

    res.json({ message: 'Message unpinned' });
  } catch (err) {
    console.error('Unpin message error:', err);
    res.status(500).json({ error: 'Failed to unpin message' });
  }
});

// GET /api/rooms/:id/pinned — Get pinned messages
router.get('/:id/pinned', authMiddleware, async (req, res) => {
  try {
    const messages = await Message.find({
      roomId: req.params.id,
      isPinned: true,
    })
      .sort({ pinnedAt: -1 })
      .lean();

    const formatted = messages.map((m) => ({
      id: m._id.toString(),
      userId: m.userId,
      username: m.username,
      content: m.content,
      timestamp: m.createdAt,
      pinnedBy: m.pinnedBy,
      pinnedAt: m.pinnedAt,
      isAI: m.isAI,
      reactions: m.reactions instanceof Map ? Object.fromEntries(m.reactions) : (m.reactions || {}),
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Get pinned messages error:', err);
    res.status(500).json({ error: 'Failed to load pinned messages' });
  }
});

module.exports = router;
