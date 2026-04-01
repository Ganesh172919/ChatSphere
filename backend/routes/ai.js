const express = require('express');
const authMiddleware = require('../middleware/auth');
const aiQuotaMiddleware = require('../middleware/aiQuota');
const { aiLimiter } = require('../middleware/rateLimit');
const User = require('../models/User');
const {
  MODEL_NAME,
  getAvailableModels,
  getJsonFromModel,
  refreshModelCatalogs,
  resolveModel,
} = require('../services/gemini');
const { getPromptTemplate } = require('../services/promptCatalog');
const logger = require('../helpers/logger');

const router = express.Router();

async function loadAiPreferences(userId) {
  return User.findById(userId)
    .select('settings.aiFeatures.smartReplies settings.aiFeatures.sentimentAnalysis settings.aiFeatures.grammarCheck')
    .lean();
}

function buildSmartReplyFallback(messages) {
  const lastMessage = messages[messages.length - 1]?.content || '';
  if (/\?$/.test(lastMessage.trim())) {
    return ['Yes, that works for me.', 'Let me check and get back to you.', 'Can you share a bit more detail?'];
  }

  return ['Sounds good.', 'Thanks for the update.', 'Let\'s do that.'];
}

router.get('/models', authMiddleware, async (req, res) => {
  try {
    await refreshModelCatalogs();
    const providerModels = getAvailableModels({ includeFallback: false }).map((model) => ({
      id: model.id,
      label: model.label,
      provider: model.provider,
      supportsFiles: Boolean(model.supportsFiles),
    }));
    const models = [
      {
        id: 'auto',
        label: 'Auto Route (task-aware)',
        provider: 'system',
        supportsFiles: true,
      },
      ...providerModels,
    ];
    const defaultModel = resolveModel(MODEL_NAME, { includeFallback: false });

    res.json({
      models,
      defaultModelId: models.some((model) => model.id === 'auto') ? 'auto' : defaultModel?.id || '',
      hasConfiguredModels: models.length > 0,
      emptyStateMessage: models.length > 0 ? '' : 'No AI models are configured. Add provider API keys in backend/.env.',
    });
  } catch (err) {
    console.error('List AI models error:', err);
    res.status(500).json({ error: 'Failed to load AI models' });
  }
});

// POST /api/ai/smart-replies
router.post('/smart-replies', authMiddleware, aiLimiter, aiQuotaMiddleware, async (req, res) => {
  try {
    const user = await loadAiPreferences(req.user.id);
    if (user?.settings?.aiFeatures?.smartReplies === false) {
      return res.status(403).json({ error: 'Smart replies are disabled in your settings' });
    }

    const { messages, context, modelId } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const recentMessages = messages
      .slice(-6)
      .map((message) => `${message.username || message.role || 'user'}: ${message.content}`)
      .join('\n');

    const template = await getPromptTemplate('smart-replies');
    let suggestions = ['Got it!', 'That makes sense', 'Tell me more?'];
    try {
      suggestions = await getJsonFromModel([
        template?.content || 'Generate exactly 3 short quick replies in a JSON array. Keep them natural and useful.',
        `Context: ${context || 'General chat'}`,
        `Recent conversation:\n${recentMessages}`,
      ].join('\n\n'), buildSmartReplyFallback(messages), { modelId });
    } catch (error) {
      logger.warn('SMART_REPLIES_FALLBACK', 'Using deterministic smart replies fallback', {
        requestId: req.requestId,
        userId: req.user.id,
        modelId: modelId || MODEL_NAME,
        error: logger.serializeError(error),
      });
      suggestions = buildSmartReplyFallback(messages);
    }

    const normalized = (Array.isArray(suggestions) ? suggestions : [])
      .map((item) => String(item).trim())
      .filter(Boolean)
      .slice(0, 3);

    while (normalized.length < 3) {
      normalized.push('Interesting!');
    }

    res.json({ suggestions: normalized, model: resolveModel(modelId || MODEL_NAME).id });
  } catch (err) {
    logger.error('SMART_REPLIES_FAILED', 'Failed to generate smart replies', {
      requestId: req.requestId,
      userId: req.user?.id || null,
      error: logger.serializeError(err),
    });
    res.status(500).json({ error: 'Failed to generate suggestions', requestId: req.requestId });
  }
});

// POST /api/ai/sentiment
router.post('/sentiment', authMiddleware, aiLimiter, aiQuotaMiddleware, async (req, res) => {
  try {
    const user = await loadAiPreferences(req.user.id);
    if (user?.settings?.aiFeatures?.sentimentAnalysis === false) {
      return res.status(403).json({ error: 'Sentiment analysis is disabled in your settings' });
    }

    const { text, modelId } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    const template = await getPromptTemplate('sentiment');
    let result = { sentiment: 'neutral', confidence: 0.5, emoji: ':|' };
    try {
      result = await getJsonFromModel([
        template?.content || 'Return only JSON with sentiment, confidence, and emoji.',
        'Allowed sentiments: positive, negative, neutral, excited, confused, angry.',
        `Message: "${text.slice(0, 500)}"`,
      ].join('\n\n'), { sentiment: 'neutral', confidence: 0.5, emoji: ':|' }, { modelId });
    } catch (error) {
      logger.warn('SENTIMENT_FALLBACK', 'Using neutral sentiment fallback', {
        requestId: req.requestId,
        userId: req.user.id,
        modelId: modelId || MODEL_NAME,
        error: logger.serializeError(error),
      });
    }

    res.json({
      sentiment: String(result.sentiment || 'neutral'),
      confidence: Number.isFinite(Number(result.confidence)) ? Number(result.confidence) : 0.5,
      emoji: String(result.emoji || ':|'),
      model: resolveModel(modelId || MODEL_NAME).id,
    });
  } catch (err) {
    logger.error('SENTIMENT_FAILED', 'Failed to analyze sentiment', {
      requestId: req.requestId,
      userId: req.user?.id || null,
      error: logger.serializeError(err),
    });
    res.status(500).json({ error: 'Failed to analyze sentiment', requestId: req.requestId });
  }
});

// POST /api/ai/grammar
router.post('/grammar', authMiddleware, aiLimiter, aiQuotaMiddleware, async (req, res) => {
  try {
    const user = await loadAiPreferences(req.user.id);
    if (user?.settings?.aiFeatures?.grammarCheck === false) {
      return res.status(403).json({ error: 'Grammar check is disabled in your settings' });
    }

    const { text, modelId } = req.body;
    if (!text || typeof text !== 'string' || text.trim().length < 3) {
      return res.status(400).json({ error: 'Text must be at least 3 characters' });
    }

    const template = await getPromptTemplate('grammar');
    let result = { corrected: null, suggestions: [] };
    try {
      result = await getJsonFromModel([
        template?.content || 'Return only JSON with corrected text and suggestions.',
        `Message: "${text.slice(0, 500)}"`,
      ].join('\n\n'), { corrected: null, suggestions: [] }, { modelId });
    } catch (error) {
      logger.warn('GRAMMAR_FALLBACK', 'Using grammar fallback response', {
        requestId: req.requestId,
        userId: req.user.id,
        modelId: modelId || MODEL_NAME,
        error: logger.serializeError(error),
      });
      result = { corrected: text, suggestions: [] };
    }

    res.json({
      corrected: result.corrected ? String(result.corrected) : null,
      suggestions: Array.isArray(result.suggestions)
        ? result.suggestions.map((item) => String(item)).filter(Boolean).slice(0, 4)
        : [],
      model: resolveModel(modelId || MODEL_NAME).id,
    });
  } catch (err) {
    logger.error('GRAMMAR_FAILED', 'Failed to check grammar', {
      requestId: req.requestId,
      userId: req.user?.id || null,
      error: logger.serializeError(err),
    });
    res.status(500).json({ error: 'Failed to check grammar', requestId: req.requestId });
  }
});

module.exports = router;
