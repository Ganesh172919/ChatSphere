const express = require('express');
const authMiddleware = require('../middleware/auth');
const aiQuotaMiddleware = require('../middleware/aiQuota');
const { sendMessage } = require('../services/gemini');
const { retrieveRelevantMemories, markMemoriesUsed, upsertMemoryEntries } = require('../services/memory');
const { getConversationInsight, refreshConversationInsight } = require('../services/conversationInsights');
const { validateAttachmentPayload } = require('../services/messageFormatting');
const Conversation = require('../models/Conversation');
const Project = require('../models/Project');
const logger = require('../helpers/logger');

const router = express.Router();

// POST /api/chat - Solo AI chat
router.post('/', authMiddleware, aiQuotaMiddleware, async (req, res) => {
  try {
    const { message, conversationId, history, modelId, attachment, projectId } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const attachmentError = validateAttachmentPayload(attachment || {});
    if (attachmentError) {
      return res.status(400).json({ error: attachmentError });
    }

    const chatHistory = Array.isArray(history) ? history : [];
    const memoryEntries = await retrieveRelevantMemories({
      userId: req.user.id,
      query: message.trim(),
      limit: 5,
    });
    const existingInsight = conversationId
      ? await getConversationInsight(req.user.id, conversationId)
      : null;

    let conversation = null;
    if (conversationId) {
      conversation = await Conversation.findOne({ _id: conversationId, userId: req.user.id });
    }

    const resolvedProjectId = projectId || conversation?.projectId || null;
    let project = null;
    if (resolvedProjectId) {
      project = await Project.findOne({
        _id: resolvedProjectId,
        userId: req.user.id,
      }).lean();

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
    }

    if (
      conversation
      && conversation.projectId
      && projectId
      && conversation.projectId.toString() !== String(projectId)
    ) {
      return res.status(400).json({ error: 'Conversation belongs to a different project' });
    }

    const response = await sendMessage(chatHistory, message.trim(), {
      memoryEntries,
      insight: existingInsight,
      modelId,
      attachment,
      project,
    });

    if (!conversation) {
      conversation = new Conversation({
        userId: req.user.id,
        title: message.trim().slice(0, 80) + (message.length > 80 ? '...' : ''),
        projectId: project?._id || null,
        projectName: project?.name || null,
        messages: [],
      });
    } else if (project && !conversation.projectId) {
      conversation.projectId = project._id;
      conversation.projectName = project.name;
    }

    const memoryRefs = memoryEntries.map((entry) => ({
      id: entry._id.toString(),
      summary: entry.summary,
      score: entry.score,
    }));

    conversation.messages.push({
      role: 'user',
      content: message.trim(),
      timestamp: new Date(),
      fileUrl: attachment?.fileUrl || null,
      fileName: attachment?.fileName || null,
      fileType: attachment?.fileType || null,
      fileSize: attachment?.fileSize || null,
    });

    conversation.messages.push({
      role: 'assistant',
      content: response.content,
      timestamp: new Date(),
      memoryRefs,
      modelId: response.model.id,
      provider: response.model.provider,
      requestedModelId: response.routing?.requestedModelId || modelId || null,
      processingMs: response.processingMs || null,
      promptTokens: response.usage?.promptTokens ?? null,
      completionTokens: response.usage?.completionTokens ?? null,
      totalTokens: response.usage?.totalTokens ?? null,
      autoMode: Boolean(response.routing?.autoMode),
      autoComplexity: response.routing?.complexity || null,
      fallbackUsed: Boolean(response.routing?.fallbackUsed),
    });

    await conversation.save();
    await Promise.all([
      upsertMemoryEntries({
        userId: req.user.id,
        text: message.trim(),
        sourceType: 'conversation',
        sourceConversationId: conversation._id,
      }),
      markMemoriesUsed(memoryEntries),
    ]);

    let insight = null;
    try {
      insight = await refreshConversationInsight(req.user.id, conversation._id);
    } catch (insightError) {
      logger.warn('CHAT_INSIGHT_REFRESH_FAILED', 'Chat response succeeded but insight refresh failed', {
        requestId: req.requestId,
        userId: req.user.id,
        conversationId: conversation._id.toString(),
        error: logger.serializeError(insightError),
      });
    }

    res.json({
      conversationId: conversation._id.toString(),
      role: 'model',
      content: response.content,
      timestamp: new Date().toISOString(),
      memoryRefs,
      insight,
      modelId: response.model.id,
      provider: response.model.provider,
      requestedModelId: response.routing?.requestedModelId || modelId || null,
      processingMs: response.processingMs || null,
      promptTokens: response.usage?.promptTokens ?? null,
      completionTokens: response.usage?.completionTokens ?? null,
      totalTokens: response.usage?.totalTokens ?? null,
      autoMode: Boolean(response.routing?.autoMode),
      autoComplexity: response.routing?.complexity || null,
      fallbackUsed: Boolean(response.routing?.fallbackUsed),
    });
  } catch (err) {
    logger.error('CHAT_REQUEST_FAILED', 'Failed to complete chat request', {
      requestId: req.requestId,
      userId: req.user?.id || null,
      conversationId: req.body?.conversationId || null,
      modelId: req.body?.modelId || null,
      error: logger.serializeError(err),
    });

    const statusCode = err?.statusCode === 429 ? 429 : String(err?.code || '').startsWith('AI_') ? 503 : 500;
    const errorMessage = statusCode === 429
      ? 'The selected AI provider is rate-limited right now. Please retry in a moment.'
      : statusCode === 503
        ? 'AI providers are temporarily unavailable. Please try again shortly or choose a different model.'
        : 'Failed to get AI response. Please try again.';

    res.status(statusCode).json({
      error: errorMessage,
      modelId: err?.model?.id || null,
      provider: err?.model?.provider || null,
      retryAfterMs: err?.retryAfterMs || null,
      requestId: req.requestId,
    });
  }
});

module.exports = router;
