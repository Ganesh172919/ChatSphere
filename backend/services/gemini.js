const { GoogleGenerativeAI } = require('@google/generative-ai');
const { buildInitialRoomHistory, getPromptTemplate } = require('./promptCatalog');

require('dotenv').config();

const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

function buildMemoryContext(memoryEntries = []) {
  if (!Array.isArray(memoryEntries) || memoryEntries.length === 0) {
    return '';
  }

  return [
    'Relevant remembered context:',
    ...memoryEntries.map((entry, index) => `${index + 1}. ${entry.summary}`),
  ].join('\n');
}

function buildInsightContext(insight) {
  if (!insight) {
    return '';
  }

  const lines = [];
  if (insight.summary) lines.push(`Summary: ${insight.summary}`);
  if (insight.intent) lines.push(`Intent: ${insight.intent}`);
  if (Array.isArray(insight.topics) && insight.topics.length > 0) lines.push(`Topics: ${insight.topics.join(', ')}`);
  if (Array.isArray(insight.decisions) && insight.decisions.length > 0) lines.push(`Decisions: ${insight.decisions.join(' | ')}`);
  if (Array.isArray(insight.actionItems) && insight.actionItems.length > 0) {
    lines.push(`Action items: ${insight.actionItems.map((item) => item.text).join(' | ')}`);
  }

  return lines.length > 0 ? ['Conversation insight:', ...lines].join('\n') : '';
}

function parseJsonFromText(text, fallback) {
  const source = String(text || '').trim();
  const objectMatch = source.match(/\{[\s\S]*\}/);
  const arrayMatch = source.match(/\[[\s\S]*\]/);
  const candidate = objectMatch ? objectMatch[0] : arrayMatch ? arrayMatch[0] : source;

  try {
    return JSON.parse(candidate);
  } catch (error) {
    return fallback;
  }
}

async function runModel(prompt, fallbackText = '') {
  if (!genAI) {
    return fallbackText;
  }

  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

async function getJsonFromModel(prompt, fallback) {
  const text = await runModel(prompt, JSON.stringify(fallback));
  return parseJsonFromText(text, fallback);
}

async function sendMessage(history, userMessage, options = {}) {
  const promptTemplate = await getPromptTemplate('solo-chat');
  const memoryContext = buildMemoryContext(options.memoryEntries);
  const insightContext = buildInsightContext(options.insight);

  if (!genAI) {
    return `Memory-aware fallback response:\n\n${userMessage}`;
  }

  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  const seededHistory = history.length === 0
    ? [
        { role: 'user', parts: [{ text: promptTemplate.content }] },
        { role: 'model', parts: [{ text: 'Understood. I will be helpful, clear, and memory-aware when relevant.' }] },
      ]
    : [...history];

  const chat = model.startChat({ history: seededHistory });
  const promptParts = [userMessage, memoryContext, insightContext].filter(Boolean).join('\n\n');
  const result = await chat.sendMessage(promptParts);
  return result.response.text();
}

async function sendGroupMessage(roomHistory, userMessage, username, options = {}) {
  const promptTemplate = await getPromptTemplate('group-chat');
  const memoryContext = buildMemoryContext(options.memoryEntries);
  const insightContext = buildInsightContext(options.insight);

  if (!genAI) {
    return `@${username} ${userMessage}`;
  }

  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  const chatHistory = roomHistory.length > 0
    ? roomHistory
    : buildInitialRoomHistory(options.roomName);

  const chat = model.startChat({ history: chatHistory });
  const prompt = [
    `[${username} asks]: ${userMessage}`,
    memoryContext,
    insightContext,
  ].filter(Boolean).join('\n\n');

  const result = await chat.sendMessage(prompt);
  return result.response.text();
}

module.exports = {
  MODEL_NAME,
  getJsonFromModel,
  sendMessage,
  sendGroupMessage,
};
