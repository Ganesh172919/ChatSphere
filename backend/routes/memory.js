const express = require('express');
const authMiddleware = require('../middleware/auth');
const MemoryEntry = require('../models/MemoryEntry');
const { previewImport, importConversationBundle, exportUserBundle } = require('../services/importExport');

const router = express.Router();

// GET /api/memory
router.get('/', authMiddleware, async (req, res) => {
  try {
    const search = String(req.query.q || '').trim().toLowerCase();
    const pinned = req.query.pinned === 'true';
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 50);
    const filter = { userId: req.user.id };

    if (pinned) {
      filter.pinned = true;
    }

    const rows = await MemoryEntry.find(filter)
      .sort({ pinned: -1, updatedAt: -1 })
      .limit(limit)
      .lean();

    const result = rows.filter((row) => {
      if (!search) {
        return true;
      }

      const haystack = [row.summary, row.details, ...(row.tags || [])].join(' ').toLowerCase();
      return haystack.includes(search);
    });

    res.json(result.map((row) => ({
      id: row._id.toString(),
      summary: row.summary,
      details: row.details,
      tags: row.tags || [],
      pinned: row.pinned,
      confidenceScore: row.confidenceScore,
      importanceScore: row.importanceScore,
      recencyScore: row.recencyScore,
      sourceType: row.sourceType,
      sourceConversationId: row.sourceConversationId?.toString() || null,
      sourceRoomId: row.sourceRoomId?.toString() || null,
      updatedAt: row.updatedAt,
      usageCount: row.usageCount,
    })));
  } catch (err) {
    console.error('List memory error:', err);
    res.status(500).json({ error: 'Failed to load memory' });
  }
});

// PUT /api/memory/:id
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const update = {};
    if (typeof req.body.summary === 'string') {
      update.summary = req.body.summary.trim().slice(0, 280);
    }
    if (typeof req.body.details === 'string') {
      update.details = req.body.details.trim().slice(0, 1200);
    }
    if (Array.isArray(req.body.tags)) {
      update.tags = [...new Set(req.body.tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))].slice(0, 10);
    }
    if (typeof req.body.pinned === 'boolean') {
      update.pinned = req.body.pinned;
    }
    if (typeof req.body.confidenceScore === 'number') {
      update.confidenceScore = Math.max(0, Math.min(1, req.body.confidenceScore));
    }
    if (typeof req.body.importanceScore === 'number') {
      update.importanceScore = Math.max(0, Math.min(1, req.body.importanceScore));
    }

    const row = await MemoryEntry.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: update },
      { new: true }
    ).lean();

    if (!row) {
      return res.status(404).json({ error: 'Memory entry not found' });
    }

    res.json(row);
  } catch (err) {
    console.error('Update memory error:', err);
    res.status(500).json({ error: 'Failed to update memory entry' });
  }
});

// DELETE /api/memory/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const deleted = await MemoryEntry.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    }).lean();

    if (!deleted) {
      return res.status(404).json({ error: 'Memory entry not found' });
    }

    res.json({ message: 'Memory entry deleted' });
  } catch (err) {
    console.error('Delete memory error:', err);
    res.status(500).json({ error: 'Failed to delete memory entry' });
  }
});

// POST /api/memory/import
router.post('/import', authMiddleware, async (req, res) => {
  try {
    const content = typeof req.body.content === 'string' ? req.body.content : '';
    const filename = typeof req.body.filename === 'string' ? req.body.filename : 'import.txt';
    const mode = req.body.mode === 'import' ? 'import' : 'preview';

    if (!content.trim()) {
      return res.status(400).json({ error: 'Import content is required' });
    }

    if (mode === 'preview') {
      const preview = await previewImport(content, filename);
      return res.json(preview);
    }

    const result = await importConversationBundle({
      userId: req.user.id,
      content,
      filename,
    });

    return res.json(result);
  } catch (err) {
    console.error('Memory import error:', err);
    res.status(500).json({ error: 'Failed to import content' });
  }
});

// GET /api/memory/export
router.get('/export', authMiddleware, async (req, res) => {
  try {
    const format = ['normalized', 'markdown', 'adapter'].includes(req.query.format)
      ? req.query.format
      : 'normalized';
    const payload = await exportUserBundle({ userId: req.user.id, format });

    if (format === 'markdown') {
      res.type('text/markdown');
      return res.send(payload);
    }

    return res.json(payload);
  } catch (err) {
    console.error('Memory export error:', err);
    res.status(500).json({ error: 'Failed to export memory' });
  }
});

module.exports = router;
