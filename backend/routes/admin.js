const express = require('express');
const authMiddleware = require('../middleware/auth');
const adminCheck = require('../middleware/admin');
const User = require('../models/User');
const Room = require('../models/Room');
const Message = require('../models/Message');
const Report = require('../models/Report');
const { isValidObjectId } = require('../helpers/validate');
const { listPromptTemplates, upsertPromptTemplate } = require('../services/promptCatalog');

const router = express.Router();

// GET /api/admin/stats - Global platform stats
router.get('/stats', authMiddleware, adminCheck, async (req, res) => {
  try {
    const [totalUsers, totalRooms, totalMessages, pendingReports, onlineUsers, recentUsers] = await Promise.all([
      User.countDocuments(),
      Room.countDocuments(),
      Message.countDocuments(),
      Report.countDocuments({ status: 'pending' }),
      User.countDocuments({ onlineStatus: 'online' }),
      User.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('username displayName avatar createdAt')
        .lean(),
    ]);

    res.json({
      totalUsers,
      totalRooms,
      totalMessages,
      pendingReports,
      onlineUsers,
      recentUsers: recentUsers.map((user) => ({
        id: user._id.toString(),
        username: user.username,
        displayName: user.displayName || user.username,
        avatar: user.avatar || null,
        createdAt: user.createdAt,
      })),
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

// GET /api/admin/reports - List reports with pagination and reason filter
router.get('/reports', authMiddleware, adminCheck, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
    const status = req.query.status || 'pending';
    const reason = req.query.reason || null;

    const filter = {};
    if (status !== 'all') {
      filter.status = status;
    }
    if (reason && ['spam', 'harassment', 'hate_speech', 'inappropriate_content', 'impersonation', 'other'].includes(reason)) {
      filter.reason = reason;
    }

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('reporterId', 'username displayName avatar')
        .populate('reviewedBy', 'username displayName')
        .lean(),
      Report.countDocuments(filter),
    ]);

    res.json({
      reports: reports.map((report) => ({
        id: report._id.toString(),
        reporter: {
          id: report.reporterId?._id?.toString(),
          username: report.reporterId?.username || 'Unknown',
          displayName: report.reporterId?.displayName || report.reporterId?.username || 'Unknown',
          avatar: report.reporterId?.avatar || null,
        },
        targetType: report.targetType,
        targetId: report.targetId.toString(),
        roomId: report.roomId?.toString() || null,
        reason: report.reason,
        description: report.description,
        status: report.status,
        reviewNote: report.reviewNote || '',
        reviewedBy: report.reviewedBy ? {
          id: report.reviewedBy._id?.toString(),
          username: report.reviewedBy.username,
        } : null,
        reviewedAt: report.reviewedAt || null,
        createdAt: report.createdAt,
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

// PUT /api/admin/reports/:id - Review/resolve a report
router.put('/reports/:id', authMiddleware, adminCheck, async (req, res) => {
  try {
    const { status, reviewNote } = req.body;

    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid report ID' });
    }

    if (!status || !['reviewed', 'action_taken', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Valid status required' });
    }

    const report = await Report.findByIdAndUpdate(
      req.params.id,
      {
        status,
        reviewedBy: req.user.id,
        reviewNote: reviewNote || '',
        reviewedAt: new Date(),
      },
      { new: true }
    ).lean();

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({
      id: report._id.toString(),
      status: report.status,
      reviewedAt: report.reviewedAt,
      message: `Report ${status.replace('_', ' ')}`,
    });
  } catch (err) {
    console.error('Review report error:', err);
    res.status(500).json({ error: 'Failed to update report' });
  }
});

// GET /api/admin/users - List users with search
router.get('/users', authMiddleware, adminCheck, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
    const search = String(req.query.q || '');
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const filter = escapedSearch
      ? {
          $or: [
            { username: { $regex: escapedSearch, $options: 'i' } },
            { email: { $regex: escapedSearch, $options: 'i' } },
            { displayName: { $regex: escapedSearch, $options: 'i' } },
          ],
        }
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
      users: users.map((user) => ({
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        displayName: user.displayName || user.username,
        avatar: user.avatar || null,
        onlineStatus: user.onlineStatus,
        isAdmin: user.isAdmin || false,
        createdAt: user.createdAt,
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

// GET /api/admin/prompts - List prompt templates
router.get('/prompts', authMiddleware, adminCheck, async (req, res) => {
  try {
    const rows = await listPromptTemplates();
    res.json(rows);
  } catch (err) {
    console.error('List prompts error:', err);
    res.status(500).json({ error: 'Failed to load prompt templates' });
  }
});

// PUT /api/admin/prompts/:key - Update a prompt template
router.put('/prompts/:key', authMiddleware, adminCheck, async (req, res) => {
  try {
    const key = String(req.params.key || '').trim();
    const content = String(req.body.content || '').trim();
    if (!key || !content) {
      return res.status(400).json({ error: 'Prompt key and content are required' });
    }

    const updated = await upsertPromptTemplate(key, {
      content,
      version: req.body.version,
      description: req.body.description,
    });

    res.json(updated);
  } catch (err) {
    console.error('Update prompt error:', err);
    res.status(500).json({ error: 'Failed to update prompt template' });
  }
});

module.exports = router;
