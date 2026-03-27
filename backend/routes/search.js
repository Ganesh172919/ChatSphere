const express = require('express');
const authMiddleware = require('../middleware/auth');
const Message = require('../models/Message');
const Room = require('../models/Room');
const Conversation = require('../models/Conversation');

const router = express.Router();

// GET /api/search/messages — Full-text search across group messages
router.get('/messages', authMiddleware, async (req, res) => {
  try {
    const { q, roomId, userId, startDate, endDate, isAI, isPinned, hasFile, page = 1, limit = 20 } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Cap limit
    const parsedLimit = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const parsedPage = Math.max(1, parseInt(page) || 1);

    const query = {};

    // Text search
    query.$text = { $search: q.trim() };

    // Optional filters
    if (roomId) query.roomId = roomId;
    if (userId) query.userId = userId;
    if (isAI === 'true') query.isAI = true;
    if (isPinned === 'true') query.isPinned = true;
    if (hasFile === 'true') query.fileUrl = { $ne: null };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Exclude deleted messages from search
    query.isDeleted = { $ne: true };

    const skip = (parsedPage - 1) * parsedLimit;

    const [messages, total] = await Promise.all([
      Message.find(query, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      Message.countDocuments(query),
    ]);

    // Batch-fetch room names (avoid N+1)
    const roomIds = [...new Set(messages.map(m => m.roomId?.toString()).filter(Boolean))];
    const rooms = await Room.find({ _id: { $in: roomIds } }).select('name').lean();
    const roomMap = {};
    rooms.forEach(r => { roomMap[r._id.toString()] = r.name; });

    const results = messages.map(m => ({
      id: m._id.toString(),
      content: m.content,
      username: m.username,
      userId: m.userId,
      roomId: m.roomId?.toString(),
      roomName: roomMap[m.roomId?.toString()] || null,
      isAI: m.isAI,
      isPinned: m.isPinned || false,
      fileUrl: m.fileUrl || null,
      fileName: m.fileName || null,
      timestamp: m.createdAt,
      score: m.score,
    }));

    res.json({
      results,
      total,
      page: parsedPage,
      totalPages: Math.ceil(total / parsedLimit),
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Failed to search messages' });
  }
});

// GET /api/search/conversations — Search within solo conversations
router.get('/conversations', authMiddleware, async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const parsedLimit = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const parsedPage = Math.max(1, parseInt(page) || 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const searchTerm = q.trim();

    // Search in conversation titles and message content using regex
    // (Conversation model doesn't have a text index, so we search differently)
    const conversations = await Conversation.find({
      userId: req.user.id,
      $or: [
        { title: { $regex: searchTerm, $options: 'i' } },
        { 'messages.content': { $regex: searchTerm, $options: 'i' } },
      ],
    })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean();

    const total = await Conversation.countDocuments({
      userId: req.user.id,
      $or: [
        { title: { $regex: searchTerm, $options: 'i' } },
        { 'messages.content': { $regex: searchTerm, $options: 'i' } },
      ],
    });

    const results = conversations.map(c => {
      // Find matching messages within the conversation
      const matchingMessages = c.messages.filter(
        m => m.content.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 3);

      return {
        id: c._id.toString(),
        title: c.title,
        messageCount: c.messages.length,
        matchingSnippets: matchingMessages.map(m => ({
          role: m.role,
          content: m.content.substring(0, 150),
          timestamp: m.timestamp,
        })),
        updatedAt: c.updatedAt,
      };
    });

    res.json({
      results,
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
