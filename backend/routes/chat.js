const express = require('express');
const authMiddleware = require('../middleware/auth');
const aiQuotaMiddleware = require('../middleware/aiQuota');
const { sendMessage } = require('../services/gemini');
const { retrieveRelevantMemories, markMemoriesUsed, upsertMemoryEntries } = require('../services/memory');
const { getConversationInsight, refreshConversationInsight } = require('../services/conversationInsights');
const { validateAttachmentPayload } = require('../services/messageFormatting');
const Conversation = require('../models/Conversation');

const router = express.Router();

// POST /api/chat - Solo AI chat
router.post('/', authMiddleware, aiQuotaMiddleware, async (req, res) => {
  try {
    const { message, conversationId, history, modelId, attachment } = req.body;

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

    const response = await sendMessage(chatHistory, message.trim(), {
      memoryEntries,
      insight: existingInsight,
      modelId,
      attachment,
    });

    let conversation = null;
    if (conversationId) {
      conversation = await Conversation.findOne({ _id: conversationId, userId: req.user.id });
    }

    if (!conversation) {
      conversation = new Conversation({
        userId: req.user.id,
        title: message.trim().slice(0, 80) + (message.length > 80 ? '...' : ''),
        messages: [],
      });
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

    const insight = await refreshConversationInsight(req.user.id, conversation._id);

    res.json({
      conversationId: conversation._id.toString(),
      role: 'model',
      content: response.content,
      timestamp: new Date().toISOString(),
      memoryRefs,
      insight,
      modelId: response.model.id,
      provider: response.model.provider,
    });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Failed to get AI response. Please try again.' });
  }
});

module.exports = router;
