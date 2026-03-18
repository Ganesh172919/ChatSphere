const express = require('express');
const authMiddleware = require('../middleware/auth');
const Message = require('../models/Message');
const Room = require('../models/Room');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

const router = express.Router();

// GET /api/dashboard — Aggregated stats for the logged-in user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Run all queries in parallel for speed
    const [
      totalConversations,
      totalRooms,
      totalMessagesSent,
      recentRooms,
      recentMessages,
      onlineUsersCount,
    ] = await Promise.all([
      // Solo conversations count
      Conversation.countDocuments({ userId }),
      // Rooms count
      Room.countDocuments(),
      // Messages sent by user
      Message.countDocuments({ userId }),
      // Recent rooms (last 5)
      Room.find()
        .select('name description tags createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      // Recent messages across rooms (last 10 activity items)
      Message.find({ userId })
        .select('content roomId username createdAt isAI')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      // Online users
      User.countDocuments({ onlineStatus: 'online' }),
    ]);

    // Get today's message count
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const messagesToday = await Message.countDocuments({
      userId,
      createdAt: { $gte: todayStart },
    });

    // Build activity feed from recent messages
    const activity = await Promise.all(
      recentMessages.map(async (msg) => {
        let roomName = null;
        if (msg.roomId) {
          const room = await Room.findById(msg.roomId).select('name').lean();
          roomName = room?.name || 'Unknown Room';
        }
        return {
          id: msg._id.toString(),
          type: msg.isAI ? 'ai_response' : 'message',
          content: msg.content.substring(0, 100),
          roomName,
          username: msg.username,
          timestamp: msg.createdAt,
        };
      })
    );

    res.json({
      stats: {
        totalConversations,
        totalRooms,
        totalMessagesSent,
        messagesToday,
        onlineUsers: onlineUsersCount,
      },
      recentRooms: recentRooms.map((r) => ({
        id: r._id.toString(),
        name: r.name,
        description: r.description,
        tags: r.tags,
        createdAt: r.createdAt,
      })),
      activity,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

module.exports = router;
