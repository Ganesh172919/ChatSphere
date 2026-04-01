const express = require('express');
const authMiddleware = require('../middleware/auth');
const Room = require('../models/Room');
const Message = require('../models/Message');
const {
  isValidObjectId,
  findRoomMember,
  getRoomMemberRole,
  hasRoomRole,
} = require('../helpers/validate');
const { getRoomInsight, refreshRoomInsight } = require('../services/conversationInsights');
const { formatMessage } = require('../services/messageFormatting');

const router = express.Router();

function formatRoomSummary(room, currentUserId, messageCount = 0) {
  return {
    id: room._id.toString(),
    name: room.name,
    description: room.description,
    tags: room.tags || [],
    maxUsers: room.maxUsers,
    memberCount: room.members ? room.members.length : 0,
    creatorId: room.creatorId.toString(),
    createdAt: room.createdAt,
    messageCount,
    isMember: Boolean(findRoomMember(room, currentUserId)),
    currentUserRole: getRoomMemberRole(room, currentUserId),
  };
}

async function ensureRoomMember(roomId, userId, selection = 'name description tags maxUsers members creatorId createdAt') {
  if (!isValidObjectId(roomId)) {
    return { room: null, error: { status: 400, message: 'Invalid room ID' } };
  }

  const room = await Room.findById(roomId).select(selection).lean();
  if (!room) {
    return { room: null, error: { status: 404, message: 'Room not found' } };
  }

  if (!findRoomMember(room, userId)) {
    return { room: null, error: { status: 403, message: 'Join the room before accessing it' } };
  }

  return { room, error: null };
}

// GET /api/rooms
router.get('/', authMiddleware, async (req, res) => {
  try {
    const rooms = await Room.find()
      .select('name description tags maxUsers members creatorId createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const roomIds = rooms.map((room) => room._id);
    const messageCounts = await Message.aggregate([
      { $match: { roomId: { $in: roomIds } } },
      { $group: { _id: '$roomId', count: { $sum: 1 } } },
    ]);

    const countMap = new Map(messageCounts.map((entry) => [entry._id.toString(), entry.count]));
    res.json(rooms.map((room) => formatRoomSummary(room, req.user.id, countMap.get(room._id.toString()) || 0)));
  } catch (err) {
    console.error('List rooms error:', err);
    res.status(500).json({ error: 'Failed to load rooms' });
  }
});

// POST /api/rooms
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, tags, maxUsers } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Room name is required' });
    }

    if (name.trim().length > 50) {
      return res.status(400).json({ error: 'Room name must be under 50 characters' });
    }

    const parsedMaxUsers = Math.min(Math.max(parseInt(maxUsers, 10) || 20, 2), 100);
    const parsedTags = Array.isArray(tags)
      ? [...new Set(tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean).slice(0, 8))]
      : [];

    const room = new Room({
      name: name.trim(),
      description: typeof description === 'string' ? description.trim().slice(0, 500) : '',
      tags: parsedTags,
      maxUsers: parsedMaxUsers,
      creatorId: req.user.id,
      members: [{ userId: req.user.id, role: 'admin', joinedAt: new Date() }],
    });

    await room.save();
    res.status(201).json(formatRoomSummary(room.toObject(), req.user.id, 0));
  } catch (err) {
    console.error('Create room error:', err);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// POST /api/rooms/:id/join
router.post('/:id/join', authMiddleware, async (req, res) => {
  try {
    console.log(`→ [ROOM] ${req.user.username} requested HTTP join for room ${req.params.id}`);
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid room ID' });
    }

    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const existingMember = findRoomMember(room, req.user.id);
    if (!existingMember) {
      if (room.members.length >= room.maxUsers) {
        return res.status(409).json({ error: 'This room is already full' });
      }

      room.members.push({
        userId: req.user.id,
        role: 'member',
        joinedAt: new Date(),
      });
      await room.save();
    }

    const messageCount = await Message.countDocuments({ roomId: room._id });
    console.log(`✦ [ROOM] ${req.user.username} ${existingMember ? 'already belongs to' : 'joined'} room ${room._id}`);
    res.json({
      ...formatRoomSummary(room.toObject(), req.user.id, messageCount),
      alreadyMember: Boolean(existingMember),
    });
  } catch (err) {
    console.error('Join room error:', err);
    res.status(500).json({ error: 'Failed to join room' });
  }
});

// POST /api/rooms/:id/leave
router.post('/:id/leave', authMiddleware, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid room ID' });
    }

    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.creatorId.toString() === req.user.id) {
      return res.status(400).json({ error: 'The room creator cannot leave their own room' });
    }

    const member = findRoomMember(room, req.user.id);
    if (!member) {
      return res.status(404).json({ error: 'You are not a member of this room' });
    }

    room.members = room.members.filter((entry) => entry.userId.toString() !== req.user.id);
    await room.save();

    res.json({ message: 'You left the room successfully' });
  } catch (err) {
    console.error('Leave room error:', err);
    res.status(500).json({ error: 'Failed to leave room' });
  }
});

// GET /api/rooms/:id/insights
router.get('/:id/insights', authMiddleware, async (req, res) => {
  try {
    const { room, error } = await ensureRoomMember(req.params.id, req.user.id, 'members');
    if (error) {
      return res.status(error.status).json({ error: error.message });
    }

    const insight = await getRoomInsight(room._id.toString(), req.query.modelId || null);
    res.json(insight || null);
  } catch (err) {
    console.error('Get room insight error:', err);
    res.status(500).json({ error: 'Failed to load room insight' });
  }
});

// POST /api/rooms/:id/actions/:action
router.post('/:id/actions/:action', authMiddleware, async (req, res) => {
  try {
    const { room, error } = await ensureRoomMember(req.params.id, req.user.id, 'members');
    if (error) {
      return res.status(error.status).json({ error: error.message });
    }

    const insight = await refreshRoomInsight(room._id.toString(), req.body?.modelId || null);
    if (!insight) {
      return res.json({ insight: null, summary: '', decisions: [], actionItems: [] });
    }

    if (req.params.action === 'summarize') {
      return res.json({ summary: insight.summary, insight });
    }

    if (req.params.action === 'extract-tasks') {
      return res.json({ actionItems: insight.actionItems || [], insight });
    }

    if (req.params.action === 'extract-decisions') {
      return res.json({ decisions: insight.decisions || [], insight });
    }

    return res.status(400).json({ error: 'Unsupported action' });
  } catch (err) {
    console.error('Run room action error:', err);
    res.status(500).json({ error: 'Failed to run room action' });
  }
});

// GET /api/rooms/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { room, error } = await ensureRoomMember(req.params.id, req.user.id);
    if (error) {
      return res.status(error.status).json({ error: error.message });
    }

    const messages = await Message.find({ roomId: room._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    const insight = await getRoomInsight(room._id.toString());

    res.json({
      ...formatRoomSummary(room, req.user.id, messages.length),
      messages: messages.reverse().map(formatMessage),
      insight,
    });
  } catch (err) {
    console.error('Get room error:', err);
    res.status(500).json({ error: 'Failed to load room' });
  }
});

// DELETE /api/rooms/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid room ID' });
    }

    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.creatorId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only the room creator can delete this room' });
    }

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

// POST /api/rooms/:id/pin/:messageId
router.post('/:id/pin/:messageId', authMiddleware, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id) || !isValidObjectId(req.params.messageId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (!hasRoomRole(room, req.user.id, ['admin', 'moderator'])) {
      return res.status(403).json({ error: 'Only room moderators can pin messages' });
    }

    const message = await Message.findById(req.params.messageId);
    if (!message || message.roomId.toString() !== room._id.toString()) {
      return res.status(404).json({ error: 'Message not found in this room' });
    }

    if (message.isDeleted) {
      return res.status(400).json({ error: 'Deleted messages cannot be pinned' });
    }

    message.isPinned = true;
    message.pinnedBy = req.user.username;
    message.pinnedAt = new Date();
    await message.save();

    if (!room.pinnedMessages.some((id) => id.toString() === message._id.toString())) {
      room.pinnedMessages.push(message._id);
      await room.save();
    }

    res.json({ message: 'Message pinned', messageId: message._id.toString() });
  } catch (err) {
    console.error('Pin message error:', err);
    res.status(500).json({ error: 'Failed to pin message' });
  }
});

// DELETE /api/rooms/:id/pin/:messageId
router.delete('/:id/pin/:messageId', authMiddleware, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id) || !isValidObjectId(req.params.messageId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (!hasRoomRole(room, req.user.id, ['admin', 'moderator'])) {
      return res.status(403).json({ error: 'Only room moderators can unpin messages' });
    }

    const message = await Message.findById(req.params.messageId);
    if (message && message.roomId.toString() === room._id.toString()) {
      message.isPinned = false;
      message.pinnedBy = null;
      message.pinnedAt = null;
      await message.save();
    }

    room.pinnedMessages = room.pinnedMessages.filter((id) => id.toString() !== req.params.messageId);
    await room.save();

    res.json({ message: 'Message unpinned' });
  } catch (err) {
    console.error('Unpin message error:', err);
    res.status(500).json({ error: 'Failed to unpin message' });
  }
});

// GET /api/rooms/:id/pinned
router.get('/:id/pinned', authMiddleware, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid room ID' });
    }

    const room = await Room.findById(req.params.id).select('members creatorId').lean();
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (!findRoomMember(room, req.user.id)) {
      return res.status(403).json({ error: 'Only room members can view pinned messages' });
    }

    const messages = await Message.find({
      roomId: req.params.id,
      isPinned: true,
    })
      .sort({ pinnedAt: -1 })
      .lean();

    res.json(messages.map((message) => ({
      id: message._id.toString(),
      userId: message.userId,
      username: message.username,
      content: message.isDeleted ? '[deleted]' : message.content,
      timestamp: message.createdAt,
      pinnedBy: message.pinnedBy,
      pinnedAt: message.pinnedAt,
      isAI: message.isAI || false,
      reactions: message.reactions instanceof Map ? Object.fromEntries(message.reactions) : (message.reactions || {}),
    })));
  } catch (err) {
    console.error('Get pinned messages error:', err);
    res.status(500).json({ error: 'Failed to load pinned messages' });
  }
});

module.exports = router;
