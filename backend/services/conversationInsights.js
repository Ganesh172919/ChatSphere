const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const ConversationInsight = require('../models/ConversationInsight');
const { getJsonFromModel } = require('./gemini');
const { normalizeText } = require('./memory');
const logger = require('../helpers/logger');

function buildScopeKey(scopeType, scopeId, userId = null) {
  return `${scopeType}:${scopeId}:${userId ? String(userId) : 'global'}`;
}

function buildFallbackInsight(messages, fallbackTitle = 'Untitled conversation') {
  const text = messages.map((message) => message.content).join(' ');
  const words = text.split(/\s+/).filter(Boolean);
  const topics = [...new Set(words
    .map((word) => normalizeText(word))
    .filter((word) => word.length > 4)
    .slice(0, 6))];

  return {
    title: fallbackTitle,
    summary: text.slice(0, 320),
    intent: text.includes('?') ? 'question-answering' : 'discussion',
    topics,
    decisions: [],
    actionItems: [],
  };
}

async function generateInsightPayload(messages, fallbackTitle, modelId = null) {
  const conversationText = messages
    .slice(-20)
    .map((message) => `${message.role || message.username || 'speaker'}: ${message.content}`)
    .join('\n');

  const prompt = [
    'Return JSON only.',
    'Summarize this conversation with the schema:',
    '{"title":"","summary":"","intent":"","topics":[""],"decisions":[""],"actionItems":[{"text":"","owner":"","done":false}]}',
    'Keep topics short. Keep decisions and action items concise.',
    `Fallback title: ${fallbackTitle}`,
    `Conversation:\n${conversationText}`,
  ].join('\n\n');

  const fallback = buildFallbackInsight(messages, fallbackTitle);
  let result = fallback;

  try {
    result = await getJsonFromModel(prompt, fallback, { modelId });
  } catch (error) {
    logger.warn('INSIGHT_FALLBACK', 'Using deterministic insight fallback', {
      fallbackTitle,
      messageCount: messages.length,
      error: logger.serializeError(error),
    });
  }

  return {
    title: String(result.title || fallback.title).slice(0, 120),
    summary: String(result.summary || fallback.summary).slice(0, 2400),
    intent: String(result.intent || fallback.intent).slice(0, 80),
    topics: Array.isArray(result.topics)
      ? result.topics.map((topic) => normalizeText(topic)).filter(Boolean).slice(0, 8)
      : fallback.topics,
    decisions: Array.isArray(result.decisions)
      ? result.decisions.map((item) => String(item).trim()).filter(Boolean).slice(0, 6)
      : [],
    actionItems: Array.isArray(result.actionItems)
      ? result.actionItems
          .map((item) => ({
            text: String(item.text || '').trim(),
            owner: item.owner ? String(item.owner).trim() : null,
            done: Boolean(item.done),
          }))
          .filter((item) => item.text)
          .slice(0, 8)
      : [],
  };
}

async function saveInsight({ scopeType, scopeId, userId = null, conversationId = null, roomId = null, messages, fallbackTitle, modelId = null }) {
  const payload = await generateInsightPayload(messages, fallbackTitle, modelId);

  logger.info('INSIGHT_SAVE', 'Persisting conversation insight', {
    scopeType,
    scopeId: String(scopeId),
    userId: userId ? String(userId) : null,
    conversationId: conversationId ? String(conversationId) : null,
    roomId: roomId ? String(roomId) : null,
    messageCount: messages.length,
    topicsCount: payload.topics.length,
    actionItemsCount: payload.actionItems.length,
  });

  return ConversationInsight.findOneAndUpdate(
    { scopeKey: buildScopeKey(scopeType, scopeId, userId) },
    {
      $set: {
        scopeKey: buildScopeKey(scopeType, scopeId, userId),
        scopeType,
        scopeId: String(scopeId),
        userId,
        conversationId,
        roomId,
        title: payload.title,
        summary: payload.summary,
        intent: payload.intent,
        topics: payload.topics,
        decisions: payload.decisions,
        actionItems: payload.actionItems,
        messageCount: messages.length,
        lastGeneratedAt: new Date(),
      },
    },
    { new: true, upsert: true }
  ).lean();
}

async function refreshConversationInsight(userId, conversationId, modelId = null) {
  const conversation = await Conversation.findOne({ _id: conversationId, userId }).lean();
  if (!conversation) {
    return null;
  }

  return saveInsight({
    scopeType: 'conversation',
    scopeId: conversation._id.toString(),
    userId,
    conversationId: conversation._id,
    messages: conversation.messages,
    fallbackTitle: conversation.title || 'Untitled conversation',
    modelId,
  });
}

async function refreshRoomInsight(roomId, modelId = null) {
  const messages = await Message.find({ roomId })
    .sort({ createdAt: -1 })
    .limit(40)
    .lean();

  if (messages.length === 0) {
    return null;
  }

  const serialized = messages
    .reverse()
    .map((message) => ({
      role: message.isAI ? 'assistant' : message.username,
      content: message.content,
    }));

  return saveInsight({
    scopeType: 'room',
    scopeId: roomId,
    roomId,
    messages: serialized,
    fallbackTitle: 'Room insight',
    modelId,
  });
}

async function getConversationInsight(userId, conversationId, modelId = null) {
  const existing = await ConversationInsight.findOne({
    scopeKey: buildScopeKey('conversation', conversationId, userId),
  }).lean();

  if (existing) {
    return existing;
  }

  return refreshConversationInsight(userId, conversationId, modelId);
}

async function getRoomInsight(roomId, modelId = null) {
  const existing = await ConversationInsight.findOne({
    scopeKey: buildScopeKey('room', roomId),
  }).lean();

  if (existing) {
    return existing;
  }

  return refreshRoomInsight(roomId, modelId);
}

module.exports = {
  getConversationInsight,
  getRoomInsight,
  refreshConversationInsight,
  refreshRoomInsight,
};
