const express = require('express');
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');
const Room = require('../models/Room');
const Message = require('../models/Message');
const Report = require('../models/Report');

const router = express.Router();

// Simple admin check middleware
const adminCheck = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('isAdmin').lean();
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch {
    return res.status(500).json({ error: 'Auth check failed' });
  }
};

// GET /api/admin/stats — Global platform stats
router.get('/stats', authMiddleware, adminCheck, async (req, res) => {
  try {
    const [totalUsers, totalRooms, totalMessages, pendingReports] = await Promise.all([
      User.countDocuments(),
      Room.countDocuments(),
      Message.countDocuments(),
      Report.countDocuments({ status: 'pending' }),
    ]);

    const onlineUsers = await User.countDocuments({ onlineStatus: 'online' });

    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('username displayName avatar createdAt')
      .lean();

    res.json({
      totalUsers,
      totalRooms,
      totalMessages,
      pendingReports,
      onlineUsers,
      recentUsers: recentUsers.map(u => ({
        id: u._id.toString(),
        username: u.username,
        displayName: u.displayName || u.username,
        avatar: u.avatar || null,
        createdAt: u.createdAt,
      })),
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

// GET /api/admin/reports — List reports with pagination
router.get('/reports', authMiddleware, adminCheck, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const status = req.query.status || 'pending';

    const filter = {};
    if (status !== 'all') {
      filter.status = status;
    }

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('reporterId', 'username displayName avatar')
        .lean(),
      Report.countDocuments(filter),
    ]);

    res.json({
      reports: reports.map(r => ({
        id: r._id.toString(),
        reporter: {
          id: r.reporterId?._id?.toString(),
          username: r.reporterId?.username || 'Unknown',
          displayName: r.reporterId?.displayName || r.reporterId?.username || 'Unknown',
          avatar: r.reporterId?.avatar || null,
        },
        targetType: r.targetType,
        targetId: r.targetId.toString(),
        roomId: r.roomId?.toString() || null,
        reason: r.reason,
        description: r.description,
        status: r.status,
        reviewNote: r.reviewNote || '',
        createdAt: r.createdAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('List reports error:', err);
    res.status(500).json({ error: 'Failed to load reports' });
  }
});

// PUT /api/admin/reports/:id — Review/resolve a report
router.put('/reports/:id', authMiddleware, adminCheck, async (req, res) => {
  try {
    const { status, reviewNote } = req.body;

    if (!status || !['reviewed', 'action_taken', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Valid status required' });
    }

    const report = await Report.findByIdAndUpdate(
      req.params.id,
      {
        status,
        reviewedBy: req.user.id,
        reviewNote: reviewNote || '',
      },
      { new: true }
    ).lean();

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({
      id: report._id.toString(),
      status: report.status,
      message: `Report ${status.replace('_', ' ')}`,
    });
  } catch (err) {
    console.error('Review report error:', err);
    res.status(500).json({ error: 'Failed to update report' });
  }
});

// GET /api/admin/users — List users with search
router.get('/users', authMiddleware, adminCheck, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const search = req.query.q || '';

    const filter = search
      ? { $or: [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { displayName: { $regex: search, $options: 'i' } },
        ]}
      : {};

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('username email displayName avatar onlineStatus isAdmin createdAt')
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({
      users: users.map(u => ({
        id: u._id.toString(),
        username: u.username,
        email: u.email,
        displayName: u.displayName || u.username,
        avatar: u.avatar || null,
        onlineStatus: u.onlineStatus,
        isAdmin: u.isAdmin || false,
        createdAt: u.createdAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

module.exports = router;
