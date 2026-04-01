const express = require('express');
const authMiddleware = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const { getConversationInsight, refreshConversationInsight } = require('../services/conversationInsights');

const router = express.Router();

// GET /api/conversations - List user's conversations
router.get('/', authMiddleware, async (req, res) => {
  try {
    const filters = { userId: req.user.id };
    if (req.query.projectId) {
      filters.projectId = req.query.projectId === 'none' ? null : req.query.projectId;
    }

    const conversations = await Conversation.find(filters)
      .select('title messages createdAt updatedAt sourceType sourceLabel projectId projectName')
      .populate('projectId', 'name description')
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    res.json(conversations.map((conversation) => ({
      id: conversation._id.toString(),
      title: conversation.title,
      project: conversation.projectId ? {
        id: conversation.projectId._id.toString(),
        name: conversation.projectId.name,
        description: conversation.projectId.description || '',
      } : conversation.projectName ? {
        id: '',
        name: conversation.projectName,
        description: '',
      } : null,
      sourceType: conversation.sourceType || 'native',
      sourceLabel: conversation.sourceLabel || 'ChatSphere',
      messageCount: conversation.messages.length,
      lastMessage: conversation.messages.length > 0 ? conversation.messages[conversation.messages.length - 1].content.slice(0, 100) : '',
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    })));
  } catch (err) {
    console.error('List conversations error:', err);
    res.status(500).json({ error: 'Failed to load conversations' });
  }
});

// GET /api/conversations/:id - Get full conversation
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user.id,
    })
      .populate('projectId', 'name description')
      .lean();

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({
      id: conversation._id.toString(),
      title: conversation.title,
      project: conversation.projectId ? {
        id: conversation.projectId._id.toString(),
        name: conversation.projectId.name,
        description: conversation.projectId.description || '',
      } : conversation.projectName ? {
        id: '',
        name: conversation.projectName,
        description: '',
      } : null,
      sourceType: conversation.sourceType || 'native',
      sourceLabel: conversation.sourceLabel || 'ChatSphere',
      messages: conversation.messages.map((message) => ({
        role: message.role,
        content: message.content,
        timestamp: message.timestamp,
        memoryRefs: message.memoryRefs || [],
        fileUrl: message.fileUrl || null,
        fileName: message.fileName || null,
        fileType: message.fileType || null,
        fileSize: message.fileSize || null,
        modelId: message.modelId || null,
        provider: message.provider || null,
        requestedModelId: message.requestedModelId || null,
        processingMs: message.processingMs ?? null,
        promptTokens: message.promptTokens ?? null,
        completionTokens: message.completionTokens ?? null,
        totalTokens: message.totalTokens ?? null,
        autoMode: Boolean(message.autoMode),
        autoComplexity: message.autoComplexity || null,
        fallbackUsed: Boolean(message.fallbackUsed),
      })),
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    });
  } catch (err) {
    console.error('Get conversation error:', err);
    res.status(500).json({ error: 'Failed to load conversation' });
  }
});

// GET /api/conversations/:id/insights
router.get('/:id/insights', authMiddleware, async (req, res) => {
  try {
    const insight = await getConversationInsight(req.user.id, req.params.id, req.query.modelId || null);
    res.json(insight || null);
  } catch (err) {
    console.error('Get conversation insight error:', err);
    res.status(500).json({ error: 'Failed to load conversation insight' });
  }
});

// POST /api/conversations/:id/actions/:action
router.post('/:id/actions/:action', authMiddleware, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user.id,
    }).select('_id').lean();

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const insight = await refreshConversationInsight(req.user.id, conversation._id, req.body?.modelId || null);
    if (!insight) {
      return res.json({ insight: null, summary: '', decisions: [], actionItems: [] });
    }

    const action = req.params.action;
    if (action === 'summarize') {
      return res.json({ summary: insight.summary, insight });
    }

    if (action === 'extract-tasks') {
      return res.json({ actionItems: insight.actionItems || [], insight });
    }

    if (action === 'extract-decisions') {
      return res.json({ decisions: insight.decisions || [], insight });
    }

    return res.status(400).json({ error: 'Unsupported action' });
  } catch (err) {
    console.error('Conversation action error:', err);
    res.status(500).json({ error: 'Failed to run conversation action' });
  }
});

// DELETE /api/conversations/:id - Delete conversation
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await Conversation.deleteOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ message: 'Conversation deleted' });
  } catch (err) {
    console.error('Delete conversation error:', err);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

module.exports = router;
