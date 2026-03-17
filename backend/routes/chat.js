const express = require('express');
const authMiddleware = require('../middleware/auth');
const { sendMessage } = require('../services/gemini');
const Conversation = require('../models/Conversation');

const router = express.Router();

// POST /api/chat — Solo AI chat
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { message, conversationId, history } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const chatHistory = Array.isArray(history) ? history : [];

    // Get AI response
    const responseText = await sendMessage(chatHistory, message.trim());

    // Persist to MongoDB
    let conversation;
    if (conversationId) {
      conversation = await Conversation.findOne({ _id: conversationId, userId: req.user.id });
    }

    if (!conversation) {
      // Create new conversation
      conversation = new Conversation({
        userId: req.user.id,
        title: message.trim().slice(0, 80) + (message.length > 80 ? '...' : ''),
        messages: [],
      });
    }

    // Add user message + AI response
    conversation.messages.push({
      role: 'user',
      content: message.trim(),
      timestamp: new Date(),
    });

    conversation.messages.push({
      role: 'assistant',
      content: responseText,
      timestamp: new Date(),
    });

    await conversation.save();

    res.json({
      conversationId: conversation._id.toString(),
      role: 'model',
      content: responseText,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Chat error:', err);

    if (err.message && err.message.includes('API key')) {
      return res.status(500).json({ error: 'AI service configuration error. Please check the API key.' });
    }

    res.status(500).json({ error: 'Failed to get AI response. Please try again.' });
  }
});

module.exports = router;
