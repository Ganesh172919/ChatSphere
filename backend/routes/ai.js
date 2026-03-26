const express = require('express');
const authMiddleware = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const router = express.Router();

// POST /api/ai/smart-replies — Generate 3 quick reply suggestions
router.post('/smart-replies', authMiddleware, async (req, res) => {
  try {
    const { messages, context } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Take last 6 messages max for context
    const recentMessages = messages.slice(-6).map(m =>
      `${m.username || m.role}: ${m.content}`
    ).join('\n');

    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash' });
    const prompt = `You are a smart reply generator for a chat application. Based on the recent conversation below, generate exactly 3 short, natural reply suggestions. Each reply should be 2-12 words max. Make them varied: one casual/friendly, one informative, one question/engagement.

Context: ${context || 'General chat'}

Recent conversation:
${recentMessages}

Return ONLY a JSON array of 3 strings, nothing else. Example: ["Sounds great!", "I agree with that approach", "What do you think about...?"]`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Parse the JSON array
    let suggestions;
    try {
      // Extract JSON array from response (handle markdown code blocks)
      const jsonMatch = text.match(/\[[\s\S]*?\]/);
      suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      // Fallback suggestions
      suggestions = ['Got it!', 'That makes sense', 'Tell me more?'];
    }

    // Ensure exactly 3 suggestions
    suggestions = suggestions.slice(0, 3);
    while (suggestions.length < 3) {
      suggestions.push('Interesting!');
    }

    res.json({ suggestions });
  } catch (err) {
    console.error('Smart replies error:', err);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

// POST /api/ai/sentiment — Analyze sentiment of a message
router.post('/sentiment', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash' });
    const prompt = `Analyze the sentiment of this chat message and respond with ONLY a JSON object (no markdown, no explanation):
{"sentiment": "positive"|"negative"|"neutral"|"excited"|"confused"|"angry", "confidence": 0.0-1.0, "emoji": "single_emoji"}

Message: "${text.slice(0, 500)}"`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    let analysis;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      analysis = null;
    }

    if (!analysis) {
      analysis = { sentiment: 'neutral', confidence: 0.5, emoji: '😐' };
    }

    res.json(analysis);
  } catch (err) {
    console.error('Sentiment analysis error:', err);
    res.status(500).json({ error: 'Failed to analyze sentiment' });
  }
});

// POST /api/ai/grammar — Grammar and spelling suggestions
router.post('/grammar', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string' || text.trim().length < 3) {
      return res.status(400).json({ error: 'Text must be at least 3 characters' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash' });
    const prompt = `Check this chat message for grammar & spelling errors. If correct, return {"corrected": null, "suggestions": []}. If errors found, return {"corrected":"fixed text", "suggestions":["brief explanation"]}. Respond with ONLY JSON, no markdown.

Message: "${text.slice(0, 500)}"`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    let grammarResult;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
      grammarResult = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      grammarResult = null;
    }

    if (!grammarResult) {
      grammarResult = { corrected: null, suggestions: [] };
    }

    res.json(grammarResult);
  } catch (err) {
    console.error('Grammar check error:', err);
    res.status(500).json({ error: 'Failed to check grammar' });
  }
});

module.exports = router;
