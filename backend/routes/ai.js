const express = require('express');
const authMiddleware = require('../middleware/auth');
const aiQuotaMiddleware = require('../middleware/aiQuota');
const { aiLimiter } = require('../middleware/rateLimit');
const User = require('../models/User');
const {
  MODEL_NAME,
  getAvailableModels,
  getJsonFromModel,
  resolveModel,
} = require('../services/gemini');
const { getPromptTemplate } = require('../services/promptCatalog');

const router = express.Router();

async function loadAiPreferences(userId) {
  return User.findById(userId)
    .select('settings.aiFeatures.smartReplies settings.aiFeatures.sentimentAnalysis settings.aiFeatures.grammarCheck')
    .lean();
}

router.get('/models', authMiddleware, async (req, res) => {
  try {
    const models = getAvailableModels().map((model) => ({
      id: model.id,
      label: model.label,
      provider: model.provider,
      supportsFiles: Boolean(model.supportsFiles),
    }));

    res.json({
      models,
      defaultModelId: resolveModel(MODEL_NAME).id,
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
    const suggestions = await getJsonFromModel([
      template?.content || 'Generate exactly 3 short quick replies in a JSON array. Keep them natural and useful.',
      `Context: ${context || 'General chat'}`,
      `Recent conversation:\n${recentMessages}`,
    ].join('\n\n'), ['Got it!', 'That makes sense', 'Tell me more?'], { modelId });

    const normalized = (Array.isArray(suggestions) ? suggestions : [])
      .map((item) => String(item).trim())
      .filter(Boolean)
      .slice(0, 3);

    while (normalized.length < 3) {
      normalized.push('Interesting!');
    }

    res.json({ suggestions: normalized, model: resolveModel(modelId || MODEL_NAME).id });
  } catch (err) {
    console.error('Smart replies error:', err);
    res.status(500).json({ error: 'Failed to generate suggestions' });
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
    const result = await getJsonFromModel([
      template?.content || 'Return only JSON with sentiment, confidence, and emoji.',
      'Allowed sentiments: positive, negative, neutral, excited, confused, angry.',
      `Message: "${text.slice(0, 500)}"`,
    ].join('\n\n'), { sentiment: 'neutral', confidence: 0.5, emoji: ':|' }, { modelId });

    res.json({
      sentiment: String(result.sentiment || 'neutral'),
      confidence: Number.isFinite(Number(result.confidence)) ? Number(result.confidence) : 0.5,
      emoji: String(result.emoji || ':|'),
      model: resolveModel(modelId || MODEL_NAME).id,
    });
  } catch (err) {
    console.error('Sentiment analysis error:', err);
    res.status(500).json({ error: 'Failed to analyze sentiment' });
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
    const result = await getJsonFromModel([
      template?.content || 'Return only JSON with corrected text and suggestions.',
      `Message: "${text.slice(0, 500)}"`,
    ].join('\n\n'), { corrected: null, suggestions: [] }, { modelId });

    res.json({
      corrected: result.corrected ? String(result.corrected) : null,
      suggestions: Array.isArray(result.suggestions)
        ? result.suggestions.map((item) => String(item)).filter(Boolean).slice(0, 4)
        : [],
      model: resolveModel(modelId || MODEL_NAME).id,
    });
  } catch (err) {
    console.error('Grammar check error:', err);
    res.status(500).json({ error: 'Failed to check grammar' });
  }
});

module.exports = router;
