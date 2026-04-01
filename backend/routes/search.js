const express = require('express');
const authMiddleware = require('../middleware/auth');
const Message = require('../models/Message');
const Room = require('../models/Room');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const { isValidObjectId, escapeRegex } = require('../helpers/validate');

const router = express.Router();

// GET /api/search/messages
router.get('/messages', authMiddleware, async (req, res) => {
  try {
    const {
      q,
      roomId,
      userId,
      startDate,
      endDate,
      isAI,
      isPinned,
      hasFile,
      fileType,
      page = 1,
      limit = 20,
    } = req.query;

    const searchQuery = typeof q === 'string' ? q.trim() : '';
    if (!searchQuery) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const [joinedRooms, currentUser] = await Promise.all([
      Room.find({ 'members.userId': req.user.id }).select('_id name').lean(),
      User.findById(req.user.id).select('blockedUsers').lean(),
    ]);

    const joinedRoomIds = joinedRooms.map((room) => room._id);
    if (joinedRoomIds.length === 0) {
      return res.json({ results: [], total: 0, page: parsedPage, totalPages: 0 });
    }

    if (roomId) {
      if (!isValidObjectId(roomId)) {
        return res.status(400).json({ error: 'Invalid room ID filter' });
      }

      const isMember = joinedRoomIds.some((id) => id.toString() === roomId.toString());
      if (!isMember) {
        return res.status(403).json({ error: 'You can only search rooms you are a member of' });
      }
    }

    const filter = {
      $text: { $search: searchQuery },
      roomId: roomId || { $in: joinedRoomIds },
      isDeleted: { $ne: true },
    };

    if (userId) {
      filter.userId = userId;
    }

    if (isAI === 'true') {
      filter.isAI = true;
    }

    if (isPinned === 'true') {
      filter.isPinned = true;
    }

    if (hasFile === 'true') {
      filter.fileUrl = { $ne: null };
    }

    if (fileType && typeof fileType === 'string') {
      filter.fileType = fileType;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    const blockedUsers = (currentUser?.blockedUsers || []).map((id) => id.toString());
    if (blockedUsers.length > 0) {
      if (typeof filter.userId === 'string' && blockedUsers.includes(filter.userId)) {
        return res.json({ results: [], total: 0, page: parsedPage, totalPages: 0 });
      }

      filter.userId = filter.userId
        ? filter.userId
        : { $nin: blockedUsers };

      if (typeof filter.userId === 'object' && !Array.isArray(filter.userId) && !filter.userId.$nin) {
        filter.userId = { ...filter.userId, $nin: blockedUsers };
      }
    }

    const [messages, total] = await Promise.all([
      Message.find(filter, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      Message.countDocuments(filter),
    ]);

    const roomMap = new Map(joinedRooms.map((room) => [room._id.toString(), room.name]));

    res.json({
      results: messages.map((message) => ({
        id: message._id.toString(),
        content: message.content,
        username: message.username,
        userId: message.userId,
        roomId: message.roomId?.toString() || null,
        roomName: roomMap.get(message.roomId?.toString()) || null,
        isAI: message.isAI || false,
        isPinned: message.isPinned || false,
        fileUrl: message.fileUrl || null,
        fileName: message.fileName || null,
        fileType: message.fileType || null,
        timestamp: message.createdAt,
        score: message.score,
      })),
      total,
      page: parsedPage,
      totalPages: Math.ceil(total / parsedLimit),
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Failed to search messages' });
  }
});

// GET /api/search/conversations
router.get('/conversations', authMiddleware, async (req, res) => {
  try {
    const searchQuery = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!searchQuery) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const parsedLimit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const parsedPage = Math.max(1, parseInt(req.query.page, 10) || 1);
    const skip = (parsedPage - 1) * parsedLimit;
    const safeRegex = new RegExp(escapeRegex(searchQuery), 'i');

    const filter = {
      userId: req.user.id,
      $or: [
        { title: safeRegex },
        { 'messages.content': safeRegex },
      ],
    };

    const [conversations, total] = await Promise.all([
      Conversation.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      Conversation.countDocuments(filter),
    ]);

    res.json({
      results: conversations.map((conversation) => {
        const snippets = conversation.messages
          .filter((message) => safeRegex.test(message.content))
          .slice(0, 3)
          .map((message) => ({
            role: message.role,
            content: message.content.slice(0, 150),
            timestamp: message.timestamp,
          }));

        return {
          id: conversation._id.toString(),
          title: conversation.title,
          messageCount: conversation.messages.length,
          matchingSnippets: snippets,
          updatedAt: conversation.updatedAt,
        };
      }),
      total,
      page: parsedPage,
      totalPages: Math.ceil(total / parsedLimit),
    });
  } catch (err) {
    console.error('Conversation search error:', err);
    res.status(500).json({ error: 'Failed to search conversations' });
  }
});

module.exports = router;
