const fs = require('fs/promises');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { buildInitialRoomHistory, getPromptTemplate, interpolatePrompt } = require('./promptCatalog');
const { uploadDir } = require('../middleware/upload');
const logger = require('../helpers/logger');

require('dotenv').config();

const DEFAULT_OPENROUTER_MODELS = [
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o mini', supportsFiles: true },
  { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', supportsFiles: true },
  { id: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash', supportsFiles: true },
  { id: 'x-ai/grok-2-1212', label: 'Grok 2', supportsFiles: true },
];

const DEFAULT_HUGGINGFACE_MODEL = 'meta-llama/Llama-3.1-8B-Instruct:cerebras';
const DEFAULT_GROK_MODEL = 'grok-2-latest';
const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';
const GROK_API_KEY = process.env.GROK_API_KEY || process.env.XAI_API_KEY || '';
const GROK_MODEL_NAME = process.env.GROK_MODEL || process.env.XAI_MODEL || DEFAULT_GROK_MODEL;

const MODEL_NAME = process.env.DEFAULT_AI_MODEL
  || process.env.OPENROUTER_DEFAULT_MODEL
  || process.env.GEMINI_MODEL
  || DEFAULT_GEMINI_MODEL;

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

function extractStatusCode(error) {
  const candidates = [
    error?.statusCode,
    error?.status,
    error?.response?.status,
    error?.cause?.status,
  ];

  for (const candidate of candidates) {
    const value = Number(candidate);
    if (Number.isFinite(value) && value >= 100) {
      return value;
    }
  }

  const match = String(error?.message || '').match(/\[(\d{3}) [^\]]+\]/);
  return match ? Number(match[1]) : null;
}

function extractRetryAfterMs(error) {
  const message = String(error?.message || '');
  const retryDelayMatch = message.match(/retryDelay":"(\d+)s"/i);
  if (retryDelayMatch) {
    return Number(retryDelayMatch[1]) * 1000;
  }

  const retryInMatch = message.match(/retry in ([\d.]+)s/i);
  if (retryInMatch) {
    return Math.ceil(Number(retryInMatch[1]) * 1000);
  }

  return null;
}

function normalizeAiError(error, model) {
  const message = String(error?.message || 'AI request failed');
  const statusCode = extractStatusCode(error);
  const retryAfterMs = extractRetryAfterMs(error);
  const lowerMessage = message.toLowerCase();
  const isQuotaError = statusCode === 429
    || lowerMessage.includes('quota exceeded')
    || lowerMessage.includes('too many requests')
    || lowerMessage.includes('rate limit');
  const isRetryable = Boolean(
    isQuotaError
    || (statusCode && statusCode >= 500)
    || lowerMessage.includes('timed out')
    || lowerMessage.includes('network')
    || lowerMessage.includes('temporarily unavailable')
  );

  const wrappedError = new Error(message);
  wrappedError.name = error?.name || 'AiRequestError';
  wrappedError.code = isQuotaError ? 'AI_RATE_LIMITED' : 'AI_REQUEST_FAILED';
  wrappedError.statusCode = isQuotaError ? 429 : statusCode || 503;
  wrappedError.retryAfterMs = retryAfterMs;
  wrappedError.isQuotaError = isQuotaError;
  wrappedError.isRetryable = isRetryable;
  wrappedError.model = model;
  wrappedError.stack = error?.stack || wrappedError.stack;
  return wrappedError;
}

function buildOfflineFallbackResponse(operation) {
  if (operation === 'json') {
    return '{}';
  }

  return 'AI providers are temporarily unavailable right now. Please try again shortly or choose a different model.';
}

function buildFallbackModelChain(primaryModel) {
  const availableModels = getAvailableModels().filter((model) => model.provider !== 'fallback');
  const remainingModels = availableModels.filter((model) => model.id !== primaryModel.id);
  return [primaryModel, ...remainingModels];
}

function parseConfiguredModels(raw, provider) {
  return String(raw || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [idPart, labelPart] = entry.includes('=') ? entry.split('=') : [entry, ''];
      const id = String(idPart || '').trim();
      const label = String(labelPart || '').trim() || id.split('/').slice(-1)[0].replace(/[-_]/g, ' ');

      if (!id) {
        return null;
      }

      return {
        id,
        provider,
        label,
        supportsFiles: true,
      };
    })
    .filter(Boolean);
}

function dedupeModels(models) {
  const seen = new Set();
  return models.filter((model) => {
    if (!model?.id || seen.has(model.id)) {
      return false;
    }
    seen.add(model.id);
    return true;
  });
}

function prettyModelLabel(modelId) {
  return String(modelId || '')
    .split('/')
    .pop()
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getAvailableModels(options = {}) {
  const includeFallback = options.includeFallback !== false;
  const models = [];

  if (process.env.OPENROUTER_API_KEY) {
    const configured = parseConfiguredModels(process.env.OPENROUTER_MODELS, 'openrouter');
    const openrouterModels = configured.length > 0
      ? configured
      : DEFAULT_OPENROUTER_MODELS.map((model) => ({
          ...model,
          provider: 'openrouter',
        }));

    models.push(...openrouterModels);
  }

  if (process.env.GEMINI_API_KEY) {
    const configuredGeminiModels = parseConfiguredModels(process.env.GEMINI_MODELS, 'gemini');
    if (configuredGeminiModels.length > 0) {
      models.push(...configuredGeminiModels);
    } else {
      const geminiModelId = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
      models.push({
        id: geminiModelId,
        provider: 'gemini',
        label: `${prettyModelLabel(geminiModelId)} (Gemini Direct)`,
        supportsFiles: true,
      });
    }
  }

  if (GROK_API_KEY) {
    models.push({
      id: GROK_MODEL_NAME,
      provider: 'grok',
      label: `${prettyModelLabel(GROK_MODEL_NAME)} (Grok Direct)`,
      supportsFiles: true,
    });
  }

  if (process.env.HUGGINGFACE_API_KEY) {
    const huggingFaceModelId = process.env.HUGGINGFACE_MODEL || DEFAULT_HUGGINGFACE_MODEL;
    models.push({
      id: huggingFaceModelId,
      provider: 'huggingface',
      label: `${prettyModelLabel(huggingFaceModelId)} (Hugging Face)`,
      supportsFiles: true,
    });
  }

  if (models.length === 0 && includeFallback) {
    models.push({
      id: 'fallback/offline',
      provider: 'fallback',
      label: 'Offline fallback',
      supportsFiles: true,
    });
  }

  return dedupeModels(models);
}

function resolveModel(requestedModelId, options = {}) {
  const models = getAvailableModels(options);
  if (models.length === 0) {
    return null;
  }

  const requested = models.find((model) => model.id === requestedModelId);
  if (requested) {
    return requested;
  }

  const defaultModel = models.find((model) => model.id === MODEL_NAME);
  return defaultModel || models[0];
}

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

function normalizeHistoryEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  if (Array.isArray(entry.parts)) {
    return {
      role: entry.role === 'model' ? 'assistant' : 'user',
      content: entry.parts
        .map((part) => String(part?.text || '').trim())
        .filter(Boolean)
        .join('\n'),
    };
  }

  if (typeof entry.content === 'string' && entry.content.trim()) {
    return {
      role: entry.role === 'assistant' || entry.role === 'system' ? entry.role : 'user',
      content: entry.content.trim(),
    };
  }

  return null;
}

function serializeHistory(history = []) {
  const normalized = Array.isArray(history)
    ? history.map(normalizeHistoryEntry).filter(Boolean).slice(-20)
    : [];

  if (normalized.length === 0) {
    return '';
  }

  return [
    'Recent conversation context:',
    ...normalized.map((entry) => `${entry.role}: ${entry.content}`),
  ].join('\n');
}

async function safeReadFile(filePath, encoding = null) {
  try {
    return await fs.readFile(filePath, encoding ? { encoding } : undefined);
  } catch (error) {
    return null;
  }
}

function getAttachmentFilePath(attachment) {
  if (!attachment?.fileUrl || typeof attachment.fileUrl !== 'string') {
    return null;
  }

  const baseName = path.basename(attachment.fileUrl);
  if (!baseName || baseName === '.' || baseName === '..') {
    return null;
  }

  return path.join(uploadDir, baseName);
}

async function buildAttachmentPayload(attachment) {
  if (!attachment?.fileUrl) {
    return null;
  }

  const filePath = getAttachmentFilePath(attachment);
  const fileName = String(attachment.fileName || 'attachment').trim() || 'attachment';
  const fileType = String(attachment.fileType || '').trim();
  const fileSize = Number(attachment.fileSize || 0) || null;
  const payload = {
    fileName,
    fileType,
    fileSize,
    promptText: `Attachment included: ${fileName}${fileType ? ` (${fileType})` : ''}.`,
    imageDataUrl: null,
  };

  if (!filePath) {
    return payload;
  }

  if (fileType.startsWith('text/')
    || fileType === 'application/json'
    || fileType === 'application/xml'
    || fileType === 'text/markdown'
    || fileType === 'text/csv') {
    const text = await safeReadFile(filePath, 'utf8');
    if (typeof text === 'string' && text.trim()) {
      payload.promptText = [
        payload.promptText,
        'Extracted file content:',
        text.slice(0, 12000),
      ].join('\n');
    }
    return payload;
  }

  if (fileType.startsWith('image/') && fileSize && fileSize <= 3 * 1024 * 1024) {
    const buffer = await safeReadFile(filePath);
    if (buffer) {
      payload.imageDataUrl = `data:${fileType};base64,${buffer.toString('base64')}`;
      payload.promptText = [
        payload.promptText,
        'An image attachment is included with this request. Use it only if the selected model supports image understanding.',
      ].join('\n');
    }
    return payload;
  }

  if (fileType === 'application/pdf') {
    payload.promptText = [
      payload.promptText,
      'A PDF was attached. The file metadata is available, but PDF text extraction is not enabled in this build.',
    ].join('\n');
  }

  return payload;
}

function buildPrompt({
  history,
  userMessage,
  memoryEntries,
  insight,
  attachmentPayload,
  extraSections = [],
}) {
  return [
    serializeHistory(history),
    buildMemoryContext(memoryEntries),
    buildInsightContext(insight),
    attachmentPayload?.promptText || '',
    ...extraSections.filter(Boolean),
    `Current request:\n${userMessage}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  let payload = {};

  try {
    payload = await response.json();
  } catch (error) {
    payload = {};
  }

  if (!response.ok) {
    const message = payload?.error?.message || payload?.error || payload?.message || `AI request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

function extractTextFromOpenAiLikeResponse(payload) {
  const choice = payload?.choices?.[0]?.message;
  if (!choice) {
    return '';
  }

  if (typeof choice.content === 'string') {
    return choice.content.trim();
  }

  if (Array.isArray(choice.content)) {
    return choice.content
      .map((part) => {
        if (typeof part === 'string') {
          return part;
        }
        if (part?.type === 'text') {
          return part.text || '';
        }
        return '';
      })
      .join('\n')
      .trim();
  }

  return '';
}

function buildOpenAiMessages(systemPrompt, promptText, attachmentPayload) {
  const contentParts = [{ type: 'text', text: promptText }];

  if (attachmentPayload?.imageDataUrl) {
    contentParts.push({
      type: 'image_url',
      image_url: {
        url: attachmentPayload.imageDataUrl,
      },
    });
  }

  return [
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      content: contentParts.length === 1 ? promptText : contentParts,
    },
  ];
}

async function runOpenRouterRequest(model, systemPrompt, promptText, attachmentPayload) {
  const payload = await fetchJson('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:5173',
      'X-Title': 'ChatSphere',
    },
    body: JSON.stringify({
      model: model.id,
      temperature: 0.6,
      messages: buildOpenAiMessages(systemPrompt, promptText, attachmentPayload),
    }),
  });

  return extractTextFromOpenAiLikeResponse(payload);
}

async function runGrokRequest(model, systemPrompt, promptText, attachmentPayload) {
  const payload = await fetchJson('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model.id,
      temperature: 0.6,
      messages: buildOpenAiMessages(systemPrompt, promptText, attachmentPayload),
    }),
  });

  return extractTextFromOpenAiLikeResponse(payload);
}

async function runHuggingFaceRequest(model, systemPrompt, promptText, attachmentPayload) {
  const payload = await fetchJson('https://router.huggingface.co/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model.id,
      temperature: 0.6,
      messages: buildOpenAiMessages(systemPrompt, promptText, attachmentPayload),
    }),
  });

  return extractTextFromOpenAiLikeResponse(payload);
}

async function runGeminiRequest(model, systemPrompt, promptText, attachmentPayload) {
  if (!genAI) {
    return '';
  }

  const generativeModel = genAI.getGenerativeModel({
    model: model.id,
    systemInstruction: systemPrompt,
  });

  const parts = [{ text: promptText }];

  if (attachmentPayload?.imageDataUrl) {
    const [, mimeAndData = ''] = attachmentPayload.imageDataUrl.split('data:');
    const [mimePart = '', base64Data = ''] = mimeAndData.split(';base64,');
    if (mimePart && base64Data) {
      parts.push({
        inlineData: {
          mimeType: mimePart,
          data: base64Data,
        },
      });
    }
  }

  const result = await generativeModel.generateContent(parts);
  return result.response.text().trim();
}

async function runModelPrompt({ promptText, systemPrompt = '', modelId, attachment }) {
  const model = resolveModel(modelId);
  const attachmentPayload = await buildAttachmentPayload(attachment);

  if (model.provider === 'fallback') {
    return {
      content: `Fallback response:\n\n${promptText.slice(0, 2000)}`,
      model,
    };
  }

  let content = '';

  try {
    console.log(`→ [AI] Running model ${model.id} via ${model.provider}`);

    if (model.provider === 'openrouter') {
      content = await runOpenRouterRequest(model, systemPrompt, promptText, attachmentPayload);
    } else if (model.provider === 'grok') {
      content = await runGrokRequest(model, systemPrompt, promptText, attachmentPayload);
    } else if (model.provider === 'huggingface') {
      content = await runHuggingFaceRequest(model, systemPrompt, promptText, attachmentPayload);
    } else {
      content = await runGeminiRequest(model, systemPrompt, promptText, attachmentPayload);
    }
  } catch (error) {
    const wrappedError = new Error(error?.message || 'AI request failed');
    wrappedError.model = model;
    wrappedError.stack = error?.stack || wrappedError.stack;
    throw wrappedError;
  }

  return {
    content: content || 'I could not generate a response for that request.',
    model,
  };
}

async function executeModelRequest(model, systemPrompt, promptText, attachmentPayload) {
  if (model.provider === 'openrouter') {
    return runOpenRouterRequest(model, systemPrompt, promptText, attachmentPayload);
  }

  if (model.provider === 'grok') {
    return runGrokRequest(model, systemPrompt, promptText, attachmentPayload);
  }

  if (model.provider === 'huggingface') {
    return runHuggingFaceRequest(model, systemPrompt, promptText, attachmentPayload);
  }

  return runGeminiRequest(model, systemPrompt, promptText, attachmentPayload);
}

async function runModelPromptWithFallback({ promptText, systemPrompt = '', modelId, attachment, operation = 'prompt' }) {
  const model = resolveModel(modelId);
  const attachmentPayload = await buildAttachmentPayload(attachment);

  if (!model || model.provider === 'fallback') {
    return {
      content: buildOfflineFallbackResponse(operation),
      model: model || { id: 'fallback/offline', provider: 'fallback', label: 'Offline fallback', supportsFiles: true },
    };
  }

  const attemptChain = buildFallbackModelChain(model);
  let lastError = null;

  for (let attemptIndex = 0; attemptIndex < attemptChain.length; attemptIndex += 1) {
    const currentModel = attemptChain[attemptIndex];
    const isFallbackAttempt = attemptIndex > 0;

    logger.info('AI_ATTEMPT', 'Running model prompt', {
      operation,
      attempt: attemptIndex + 1,
      totalAttempts: attemptChain.length,
      modelId: currentModel.id,
      provider: currentModel.provider,
      requestedModelId: modelId || model.id,
      fallbackAttempt: isFallbackAttempt,
      promptLength: String(promptText || '').length,
      hasAttachment: Boolean(attachmentPayload),
    });

    try {
      const content = await executeModelRequest(currentModel, systemPrompt, promptText, attachmentPayload);

      logger.info('AI_SUCCESS', 'Model prompt completed', {
        operation,
        attempt: attemptIndex + 1,
        modelId: currentModel.id,
        provider: currentModel.provider,
        fallbackUsed: isFallbackAttempt,
        contentLength: String(content || '').length,
      });

      return {
        content: content || 'I could not generate a response for that request.',
        model: currentModel,
      };
    } catch (error) {
      const normalizedError = normalizeAiError(error, currentModel);
      lastError = normalizedError;

      logger.warn('AI_FAILURE', 'Model attempt failed', {
        operation,
        attempt: attemptIndex + 1,
        totalAttempts: attemptChain.length,
        modelId: currentModel.id,
        provider: currentModel.provider,
        fallbackAttempt: isFallbackAttempt,
        willRetryWithFallback: normalizedError.isRetryable && attemptIndex < attemptChain.length - 1,
        error: logger.serializeError(normalizedError),
      });

      if (!normalizedError.isRetryable || attemptIndex === attemptChain.length - 1) {
        throw normalizedError;
      }
    }
  }

  throw lastError || new Error('AI request failed');
}

async function getJsonFromModel(prompt, fallback, options = {}) {
  const result = await runModelPromptWithFallback({
    promptText: String(prompt || ''),
    modelId: options.modelId,
    operation: 'json',
  });
  return parseJsonFromText(result.content, fallback);
}

async function sendMessage(history, userMessage, options = {}) {
  const promptTemplate = await getPromptTemplate('solo-chat');
  const promptText = buildPrompt({
    history,
    userMessage,
    memoryEntries: options.memoryEntries,
    insight: options.insight,
    attachmentPayload: await buildAttachmentPayload(options.attachment),
  });

  const result = await runModelPromptWithFallback({
    systemPrompt: promptTemplate?.content || 'You are ChatSphere\'s AI collaborator.',
    promptText,
    modelId: options.modelId,
    attachment: options.attachment,
    operation: 'chat',
  });

  return result;
}

async function sendGroupMessage(roomHistory, userMessage, username, options = {}) {
  const promptTemplate = await getPromptTemplate('group-chat');
  const systemPrompt = interpolatePrompt(
    promptTemplate?.content || 'You are ChatSphere\'s room assistant.',
    { roomName: options.roomName || 'ChatSphere room' }
  );

  const promptText = buildPrompt({
    history: roomHistory,
    userMessage,
    memoryEntries: options.memoryEntries,
    insight: options.insight,
    attachmentPayload: await buildAttachmentPayload(options.attachment),
    extraSections: [`Triggered by: ${username}`],
  });

  const result = await runModelPromptWithFallback({
    systemPrompt,
    promptText,
    modelId: options.modelId,
    attachment: options.attachment,
    operation: 'group-chat',
  });

  return result;
}

module.exports = {
  MODEL_NAME,
  buildInitialRoomHistory,
  getAvailableModels,
  getJsonFromModel,
  resolveModel,
  sendMessage,
  sendGroupMessage,
};
