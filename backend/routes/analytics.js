const express = require('express');
const authMiddleware = require('../middleware/auth');
const adminCheck = require('../middleware/admin');
const Message = require('../models/Message');
const Room = require('../models/Room');

const router = express.Router();

// GET /api/analytics/messages - Messages per day (last 30 days)
router.get('/messages', authMiddleware, adminCheck, async (req, res) => {
  try {
    const days = Math.min(90, parseInt(req.query.days, 10) || 30);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const results = await Message.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    const data = [];
    const current = new Date(startDate);
    const today = new Date();

    while (current <= today) {
      const y = current.getFullYear();
      const m = current.getMonth() + 1;
      const d = current.getDate();
      const match = results.find((row) => row._id.year === y && row._id.month === m && row._id.day === d);
      data.push({
        date: current.toISOString().split('T')[0],
        count: match ? match.count : 0,
      });
      current.setDate(current.getDate() + 1);
    }

    res.json({ data, total: data.reduce((sum, row) => sum + row.count, 0) });
  } catch (err) {
    console.error('Analytics messages error:', err);
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

// GET /api/analytics/users - Active users per day (last 30 days)
router.get('/users', authMiddleware, adminCheck, async (req, res) => {
  try {
    const days = Math.min(90, parseInt(req.query.days, 10) || 30);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const results = await Message.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
            userId: '$userId',
          },
        },
      },
      {
        $group: {
          _id: {
            year: '$_id.year',
            month: '$_id.month',
            day: '$_id.day',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    const data = [];
    const current = new Date(startDate);
    const today = new Date();

    while (current <= today) {
      const y = current.getFullYear();
      const m = current.getMonth() + 1;
      const d = current.getDate();
      const match = results.find((row) => row._id.year === y && row._id.month === m && row._id.day === d);
      data.push({
        date: current.toISOString().split('T')[0],
        count: match ? match.count : 0,
      });
      current.setDate(current.getDate() + 1);
    }

    res.json({ data });
  } catch (err) {
    console.error('Analytics users error:', err);
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

// GET /api/analytics/rooms - Top rooms by message count
router.get('/rooms', authMiddleware, adminCheck, async (req, res) => {
  try {
    const limit = Math.min(20, parseInt(req.query.limit, 10) || 10);
    const results = await Message.aggregate([
      {
        $group: {
          _id: '$roomId',
          messageCount: { $sum: 1 },
          lastActivity: { $max: '$createdAt' },
        },
      },
      { $sort: { messageCount: -1 } },
      { $limit: limit },
    ]);

    const roomIds = results.map((row) => row._id).filter(Boolean);
    const rooms = await Room.find({ _id: { $in: roomIds } })
      .select('name description')
      .lean();
    const roomMap = new Map(rooms.map((room) => [room._id.toString(), room]));

    res.json({
      data: results
        .filter((row) => row._id)
        .map((row) => {
          const room = roomMap.get(row._id.toString());
          return {
            roomId: row._id.toString(),
            name: room?.name || 'Deleted Room',
            description: room?.description || '',
            messageCount: row.messageCount,
            lastActivity: row.lastActivity,
          };
        }),
    });
  } catch (err) {
    console.error('Analytics rooms error:', err);
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

module.exports = router;
