const express = require('express');
const authMiddleware = require('../middleware/auth');
const Message = require('../models/Message');
const Room = require('../models/Room');

const router = express.Router();

// GET /api/search/messages — Full-text search across messages
router.get('/messages', authMiddleware, async (req, res) => {
  try {
    const { q, roomId, userId, startDate, endDate, page = 1, limit = 20 } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const query = {};

    // Text search
    query.$text = { $search: q.trim() };

    // Optional filters
    if (roomId) {
      query.roomId = roomId;
    }

    if (userId) {
      query.userId = userId;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [messages, total] = await Promise.all([
      Message.find(query, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Message.countDocuments(query),
    ]);

    // Enrich messages with room names
    const roomIds = [...new Set(messages.map((m) => m.roomId?.toString()).filter(Boolean))];
    const rooms = await Room.find({ _id: { $in: roomIds } }).select('name').lean();
    const roomMap = {};
    rooms.forEach((r) => { roomMap[r._id.toString()] = r.name; });

    const results = messages.map((m) => ({
      id: m._id.toString(),
      content: m.content,
      username: m.username,
      userId: m.userId,
      roomId: m.roomId?.toString(),
      roomName: roomMap[m.roomId?.toString()] || null,
      isAI: m.isAI,
      timestamp: m.createdAt,
      score: m.score,
    }));

    res.json({
      results,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Failed to search messages' });
  }
});

module.exports = router;
