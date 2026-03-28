const express = require('express');
const authMiddleware = require('../middleware/auth');
const Message = require('../models/Message');
const Room = require('../models/Room');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const { getRoomMemberRole } = require('../helpers/validate');

const router = express.Router();

// GET /api/dashboard — Aggregated stats for the logged-in user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Run all queries in parallel for speed
    const [
      totalConversations,
      userRooms,
      totalMessagesSent,
      recentMessages,
      onlineUsersCount,
    ] = await Promise.all([
      Conversation.countDocuments({ userId }),
      // Only count rooms the user is a member of
      Room.find({ 'members.userId': userId })
        .select('name description tags createdAt members creatorId')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Message.countDocuments({ userId }),
      Message.find({ userId })
        .select('content roomId username createdAt isAI')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      User.countDocuments({ onlineStatus: 'online' }),
    ]);

    // Get today's message count
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const messagesToday = await Message.countDocuments({
      userId,
      createdAt: { $gte: todayStart },
    });

    // Batch-fetch room names for activity feed (avoid N+1)
    const roomIds = [...new Set(recentMessages.map(m => m.roomId?.toString()).filter(Boolean))];
    const rooms = await Room.find({ _id: { $in: roomIds } }).select('name').lean();
    const roomMap = {};
    rooms.forEach(r => { roomMap[r._id.toString()] = r.name; });

    const activity = recentMessages.map(msg => ({
      id: msg._id.toString(),
      type: msg.isAI ? 'ai_response' : 'message',
      content: msg.content.substring(0, 100),
      roomName: msg.roomId ? (roomMap[msg.roomId.toString()] || 'Unknown Room') : null,
      username: msg.username,
      timestamp: msg.createdAt,
    }));

    res.json({
      stats: {
        totalConversations,
        totalRooms: userRooms.length,
        totalMessagesSent,
        messagesToday,
        onlineUsers: onlineUsersCount,
      },
      recentRooms: userRooms.map(r => ({
        id: r._id.toString(),
        name: r.name,
        description: r.description,
        tags: r.tags,
        createdAt: r.createdAt,
        memberCount: Array.isArray(r.members) ? r.members.length : 0,
        currentUserRole: getRoomMemberRole(r, userId),
      })),
      activity,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

module.exports = router;
