const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `You are an advanced reasoning engine — not a simple assistant.
You think deeply, challenge assumptions, and provide structured, insightful responses.
When answering: break down complex problems step by step, provide multiple angles,
use analogies when helpful, cite reasoning behind conclusions, and never give
shallow one-liner answers unless explicitly asked. You are direct, intellectually
honest, and occasionally witty. Format responses using markdown — headers, bullets,
code blocks, and bold text where appropriate. Think before you speak.`;

/**
 * Send a message in a solo chat context.
 * @param {Array} history - Gemini-format history [{role, parts: [{text}]}]
 * @param {string} userMessage - The new user message
 * @returns {Promise<string>} - The model's response text
 */
async function sendMessage(history, userMessage) {
  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash' });

  const chatHistory = history.length === 0
    ? [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
        { role: 'model', parts: [{ text: 'Understood. I will provide deep, structured, multi-angle reasoning in my responses. I am ready.' }] }
      ]
    : [...history];

  const chat = model.startChat({ history: chatHistory });
  const result = await chat.sendMessage(userMessage);
  const response = await result.response;
  return response.text();
}

/**
 * Send a message in a group chat context using room-specific AI history.
 * @param {Array} roomHistory - The room's AI conversation history
 * @param {string} userMessage - The @ai prompt
 * @param {string} username - The user who triggered the AI
 * @returns {Promise<string>} - The model's response text
 */
async function sendGroupMessage(roomHistory, userMessage, username) {
  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash' });

  const chat = model.startChat({ history: roomHistory });
  const prompt = `[${username} asks]: ${userMessage}`;
  const result = await chat.sendMessage(prompt);
  const response = await result.response;
  return response.text();
}

module.exports = { sendMessage, sendGroupMessage, SYSTEM_PROMPT };
