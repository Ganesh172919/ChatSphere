const fs = require('fs/promises');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { buildInitialRoomHistory, getPromptTemplate, interpolatePrompt } = require('./promptCatalog');
const { uploadDir } = require('../middleware/upload');
const logger = require('../helpers/logger');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DEFAULT_OPENROUTER_MODELS = [
  { id: 'openai/gpt-5.4-mini', label: 'GPT-5.4 Mini', supportsFiles: true },
  { id: 'openai/gpt-5.4', label: 'GPT-5.4', supportsFiles: true },
  { id: 'openai/gpt-5.2', label: 'GPT-5.2', supportsFiles: true },
  { id: 'openai/gpt-5.2-chat', label: 'GPT-5.2 Chat', supportsFiles: true },
  { id: 'anthropic/claude-opus-4.6', label: 'Claude Opus 4.6', supportsFiles: true },
  { id: 'anthropic/claude-sonnet-4.6', label: 'Claude Sonnet 4.6', supportsFiles: true },
  { id: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', supportsFiles: true },
  { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', supportsFiles: true },
  { id: 'google/gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro Preview', supportsFiles: true },
  { id: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash Preview', supportsFiles: true },
  { id: 'deepseek/deepseek-v3.2', label: 'DeepSeek V3.2', supportsFiles: true },
  { id: 'deepseek/deepseek-chat-v3.1', label: 'DeepSeek Chat V3.1', supportsFiles: true },
  { id: 'moonshotai/kimi-k2.5', label: 'Kimi K2.5', supportsFiles: true },
  { id: 'qwen/qwen3.5-27b', label: 'Qwen 3.5 27B', supportsFiles: true },
  { id: 'qwen/qwen3-coder', label: 'Qwen 3 Coder', supportsFiles: true },
  { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B Instruct', supportsFiles: true },
  { id: 'mistralai/mistral-large-2512', label: 'Mistral Large 2512', supportsFiles: true },
  { id: 'mistralai/mistral-small-3.2-24b-instruct', label: 'Mistral Small 3.2 24B', supportsFiles: true },
];

const DEFAULT_GEMINI_MODELS = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', supportsFiles: true },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', supportsFiles: true },
  { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', supportsFiles: true },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', supportsFiles: true },
  { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite', supportsFiles: true },
  { id: 'gemini-3-pro-preview', label: 'Gemini 3 Pro Preview', supportsFiles: true },
  { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro Preview', supportsFiles: true },
  { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview', supportsFiles: true },
  { id: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite Preview', supportsFiles: true },
  { id: 'gemini-flash-latest', label: 'Gemini Flash Latest', supportsFiles: true },
  { id: 'gemini-pro-latest', label: 'Gemini Pro Latest', supportsFiles: true },
];

const DEFAULT_TOGETHER_MODELS = [
  { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', label: 'Llama 3.3 70B Instruct Turbo', supportsFiles: true },
  { id: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', label: 'Meta Llama 3.1 70B Instruct Turbo', supportsFiles: true },
  { id: 'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8', label: 'Llama 4 Maverick 17B FP8', supportsFiles: true },
  { id: 'deepseek-ai/DeepSeek-V3.1', label: 'DeepSeek V3.1', supportsFiles: true },
  { id: 'deepseek-ai/DeepSeek-R1', label: 'DeepSeek R1', supportsFiles: true },
  { id: 'moonshotai/Kimi-K2.5', label: 'Kimi K2.5', supportsFiles: true },
  { id: 'Qwen/Qwen3.5-397B-A17B', label: 'Qwen 3.5 397B', supportsFiles: true },
  { id: 'Qwen/Qwen3-Coder-Next-FP8', label: 'Qwen 3 Coder Next FP8', supportsFiles: true },
  { id: 'Qwen/Qwen2.5-72B-Instruct-Turbo', label: 'Qwen 2.5 72B Instruct Turbo', supportsFiles: true },
  { id: 'mistralai/Mixtral-8x22B-Instruct-v0.1', label: 'Mixtral 8x22B Instruct v0.1', supportsFiles: true },
  { id: 'mistralai/Mixtral-8x7B-Instruct-v0.1', label: 'Mixtral 8x7B Instruct v0.1', supportsFiles: true },
  { id: 'google/gemma-3n-E4B-it', label: 'Gemma 3N E4B IT', supportsFiles: true },
];

const DEFAULT_GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile', supportsFiles: true },
  { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant', supportsFiles: true },
  { id: 'meta-llama/llama-4-scout-17b-16e-instruct', label: 'Llama 4 Scout 17B', supportsFiles: true },
  { id: 'qwen/qwen3-32b', label: 'Qwen 3 32B', supportsFiles: true },
  { id: 'moonshotai/kimi-k2-instruct', label: 'Kimi K2 Instruct', supportsFiles: true },
  { id: 'moonshotai/kimi-k2-instruct-0905', label: 'Kimi K2 Instruct 0905', supportsFiles: true },
  { id: 'groq/compound', label: 'Groq Compound', supportsFiles: true },
  { id: 'groq/compound-mini', label: 'Groq Compound Mini', supportsFiles: true },
  { id: 'openai/gpt-oss-120b', label: 'GPT OSS 120B', supportsFiles: true },
  { id: 'openai/gpt-oss-20b', label: 'GPT OSS 20B', supportsFiles: true },
];

const DEFAULT_HUGGINGFACE_MODEL = 'meta-llama/Llama-3.1-8B-Instruct:cerebras';
const DEFAULT_GROK_MODEL = 'grok-2-latest';
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const GROK_API_KEY = process.env.GROK_API_KEY || process.env.XAI_API_KEY || '';
const GROK_MODEL_NAME = process.env.GROK_MODEL || process.env.XAI_MODEL || DEFAULT_GROK_MODEL;
const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const DEFAULT_TOGETHER_MODEL = DEFAULT_TOGETHER_MODELS[0].id;
const DEFAULT_GROQ_MODEL = DEFAULT_GROQ_MODELS[0].id;
const MODEL_CATALOG_TTL_MS = Math.max(5 * 60 * 1000, Number(process.env.MODEL_CATALOG_TTL_MS || 30 * 60 * 1000));

const MODEL_NAME = process.env.DEFAULT_AI_MODEL
  || process.env.OPENROUTER_DEFAULT_MODEL
  || process.env.TOGETHER_MODEL
  || process.env.GROQ_MODEL
  || process.env.GEMINI_MODEL
  || DEFAULT_GEMINI_MODEL;

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const runtimeModelCatalog = {
  openrouter: null,
  gemini: null,
  grok: null,
  together: null,
  groq: null,
  lastRefreshedAt: 0,
  refreshPromise: null,
};

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
  const isModelUnavailable = lowerMessage.includes('not a valid model')
    || lowerMessage.includes('invalid model')
    || lowerMessage.includes('unable to access model')
    || lowerMessage.includes('no longer supported')
    || lowerMessage.includes('decommissioned')
    || lowerMessage.includes('deprecated')
    || lowerMessage.includes('unsupported model')
    || lowerMessage.includes('model not found');
  const isProviderCreditIssue = statusCode === 402
    || lowerMessage.includes('credit limit exceeded')
    || lowerMessage.includes('add credits')
    || lowerMessage.includes('payment required')
    || lowerMessage.includes('billing');
  const isQuotaError = statusCode === 429
    || lowerMessage.includes('quota exceeded')
    || lowerMessage.includes('too many requests')
    || lowerMessage.includes('rate limit');
  const isRetryable = Boolean(
    isQuotaError
    || isModelUnavailable
    || isProviderCreditIssue
    || (statusCode && statusCode >= 500)
    || lowerMessage.includes('timed out')
    || lowerMessage.includes('network')
    || lowerMessage.includes('temporarily unavailable')
  );

  const wrappedError = new Error(message);
  wrappedError.name = error?.name || 'AiRequestError';
  wrappedError.code = isQuotaError
    ? 'AI_RATE_LIMITED'
    : isModelUnavailable
      ? 'AI_MODEL_UNAVAILABLE'
      : isProviderCreditIssue
        ? 'AI_PROVIDER_CREDIT_EXHAUSTED'
      : 'AI_REQUEST_FAILED';
  wrappedError.statusCode = isQuotaError
    ? 429
    : isModelUnavailable || isProviderCreditIssue
      ? 503
      : statusCode || 503;
  wrappedError.retryAfterMs = retryAfterMs;
  wrappedError.isQuotaError = isQuotaError;
  wrappedError.isModelUnavailable = isModelUnavailable;
  wrappedError.isProviderCreditIssue = isProviderCreditIssue;
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
  const maxAttempts = Math.max(1, Number(process.env.AI_FALLBACK_MODEL_LIMIT || 6));
  const providerPriority = ['openrouter', 'gemini', 'grok', 'groq', 'together', 'huggingface'];
  const availableModels = getAvailableModels().filter((model) => model.provider !== 'fallback');
  const remainingModels = availableModels.filter((model) => model.id !== primaryModel.id);
  const groupedByProvider = new Map();

  for (const candidate of remainingModels) {
    if (!groupedByProvider.has(candidate.provider)) {
      groupedByProvider.set(candidate.provider, []);
    }
    groupedByProvider.get(candidate.provider).push(candidate);
  }

  const diversified = [];
  for (const provider of providerPriority) {
    const providerModels = groupedByProvider.get(provider) || [];
    if (providerModels.length > 0) {
      diversified.push(providerModels.shift());
    }
  }

  const overflow = providerPriority.flatMap((provider) => groupedByProvider.get(provider) || []);

  return [primaryModel, ...diversified, ...overflow].slice(0, maxAttempts);
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

function withProviderMetadata(models, provider, labelSuffix = '') {
  return models.map((model) => ({
    ...model,
    provider,
    label: labelSuffix && !String(model.label || '').includes(labelSuffix)
      ? `${model.label} ${labelSuffix}`
      : model.label,
  }));
}

function getConfiguredProviderModels(provider, envValue, defaults, labelSuffix = '') {
  const configured = parseConfiguredModels(envValue, provider);
  if (configured.length > 0) {
    return withProviderMetadata(configured, provider, labelSuffix);
  }

  return withProviderMetadata(defaults, provider, labelSuffix);
}

function normalizeCatalogModels(models, provider, labelSuffix = '') {
  return withProviderMetadata(
    models
      .filter((model) => model?.id)
      .map((model) => ({
        id: model.id,
        label: model.label || prettyModelLabel(model.id),
        supportsFiles: Boolean(model.supportsFiles),
      })),
    provider,
    labelSuffix
  );
}

async function fetchProviderJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error?.message || payload?.error || payload?.message || `Failed to load model catalog (${response.status})`);
    error.statusCode = response.status;
    throw error;
  }
  return payload;
}

function isSupportedOpenRouterModel(model) {
  const outputModalities = model?.architecture?.output_modalities || [];
  return Boolean(
    model?.id
    && outputModalities.includes('text')
  );
}

function isSupportedTogetherModel(modelId, model) {
  const lowerId = String(modelId || '').toLowerCase();
  return model?.type === 'chat'
    && !lowerId.includes('whisper')
    && !lowerId.includes('image')
    && !lowerId.includes('video')
    && !lowerId.includes('flux')
    && !lowerId.includes('sora')
    && !lowerId.includes('veo')
    && !lowerId.includes('imagen');
}

function isSupportedGroqModel(modelId) {
  const lowerId = String(modelId || '').toLowerCase();
  return !lowerId.includes('whisper')
    && !lowerId.includes('prompt-guard')
    && !lowerId.includes('safeguard')
    && !lowerId.includes('orpheus')
    && !lowerId.includes('allam');
}

function isSupportedGeminiModel(name, model) {
  const lowerName = String(name || '').toLowerCase();
  const methods = model?.supportedGenerationMethods || [];
  return methods.includes('generateContent')
    && !lowerName.includes('embedding')
    && !lowerName.includes('imagen')
    && !lowerName.includes('veo')
    && !lowerName.includes('lyria')
    && !lowerName.includes('aqa')
    && !lowerName.includes('robotics')
    && !lowerName.includes('deep-research')
    && !lowerName.includes('computer-use')
    && !lowerName.includes('tts')
    && !lowerName.includes('audio')
    && !lowerName.includes('live');
}

async function fetchOpenRouterCatalog() {
  const payload = await fetchProviderJson('https://openrouter.ai/api/v1/models');
  return normalizeCatalogModels(
    (payload?.data || [])
      .filter(isSupportedOpenRouterModel)
      .map((model) => ({
        id: model.id,
        label: model.name || prettyModelLabel(model.id),
        supportsFiles: Array.isArray(model?.architecture?.input_modalities)
          ? model.architecture.input_modalities.includes('file') || model.architecture.input_modalities.includes('image')
          : false,
      })),
    'openrouter'
  );
}

async function fetchTogetherCatalog() {
  const payload = await fetchProviderJson('https://api.together.xyz/v1/models', {
    headers: { Authorization: `Bearer ${TOGETHER_API_KEY}` },
  });
  const models = Array.isArray(payload) ? payload : payload?.data || [];
  return normalizeCatalogModels(
    models
      .map((model) => ({
        rawId: model.id || model.name,
        label: model.display_name || model.name || prettyModelLabel(model.id || model.name),
        supportsFiles: /vl|vision|image|gemma-3n/i.test(String(model.id || model.name || '')),
        type: model.type,
      }))
      .filter((model) => isSupportedTogetherModel(model.rawId, { type: model.type }))
      .map((model) => ({
        id: model.rawId,
        label: model.label,
        supportsFiles: model.supportsFiles,
      })),
    'together',
    '(Together AI)'
  );
}

async function fetchGroqCatalog() {
  const payload = await fetchProviderJson('https://api.groq.com/openai/v1/models', {
    headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
  });
  return normalizeCatalogModels(
    (payload?.data || [])
      .filter((model) => model?.active !== false && isSupportedGroqModel(model.id))
      .map((model) => ({
        id: model.id,
        label: prettyModelLabel(model.id),
        supportsFiles: false,
      })),
    'groq',
    '(Groq)'
  );
}

async function fetchGrokCatalog() {
  const payload = await fetchProviderJson('https://api.x.ai/v1/models', {
    headers: { Authorization: `Bearer ${GROK_API_KEY}` },
  });
  return normalizeCatalogModels(
    (payload?.data || [])
      .filter((model) => model?.id && !String(model.id).toLowerCase().includes('vision'))
      .map((model) => ({
        id: model.id,
        label: prettyModelLabel(model.id),
        supportsFiles: true,
      })),
    'grok',
    '(Grok Direct)'
  );
}

async function fetchGeminiCatalog() {
  const payload = await fetchProviderJson(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(process.env.GEMINI_API_KEY || '')}`);
  return normalizeCatalogModels(
    (payload?.models || [])
      .filter((model) => isSupportedGeminiModel(model.name, model))
      .map((model) => {
        const id = String(model.name || '').replace(/^models\//, '');
        return {
          id,
          label: model.displayName || prettyModelLabel(id),
          supportsFiles: /gemini|gemma-3n/i.test(id),
        };
      }),
    'gemini',
    '(Gemini Direct)'
  );
}

async function refreshModelCatalogs(options = {}) {
  const force = options.force === true;
  const isFresh = !force && runtimeModelCatalog.lastRefreshedAt > 0
    && (Date.now() - runtimeModelCatalog.lastRefreshedAt) < MODEL_CATALOG_TTL_MS;

  if (isFresh) {
    return getAvailableModels({ includeFallback: false });
  }

  if (runtimeModelCatalog.refreshPromise) {
    return runtimeModelCatalog.refreshPromise;
  }

  runtimeModelCatalog.refreshPromise = (async () => {
    const tasks = [];

    if (process.env.OPENROUTER_API_KEY) {
      tasks.push(fetchOpenRouterCatalog().then((models) => { runtimeModelCatalog.openrouter = models; }).catch(() => {}));
    }
    if (process.env.GEMINI_API_KEY) {
      tasks.push(fetchGeminiCatalog().then((models) => { runtimeModelCatalog.gemini = models; }).catch(() => {}));
    }
    if (GROK_API_KEY) {
      tasks.push(fetchGrokCatalog().then((models) => { runtimeModelCatalog.grok = models; }).catch(() => {}));
    }
    if (TOGETHER_API_KEY) {
      tasks.push(fetchTogetherCatalog().then((models) => { runtimeModelCatalog.together = models; }).catch(() => {}));
    }
    if (GROQ_API_KEY) {
      tasks.push(fetchGroqCatalog().then((models) => { runtimeModelCatalog.groq = models; }).catch(() => {}));
    }

    await Promise.all(tasks);
    runtimeModelCatalog.lastRefreshedAt = Date.now();
    return getAvailableModels({ includeFallback: false });
  })()
    .finally(() => {
      runtimeModelCatalog.refreshPromise = null;
    });

  return runtimeModelCatalog.refreshPromise;
}

function getAvailableModels(options = {}) {
  const includeFallback = options.includeFallback !== false;
  const models = [];

  if (process.env.OPENROUTER_API_KEY) {
    models.push(
      ...(runtimeModelCatalog.openrouter
        || getConfiguredProviderModels('openrouter', process.env.OPENROUTER_MODELS, DEFAULT_OPENROUTER_MODELS))
    );
  }

  if (process.env.GEMINI_API_KEY) {
    models.push(
      ...(runtimeModelCatalog.gemini
        || getConfiguredProviderModels('gemini', process.env.GEMINI_MODELS, DEFAULT_GEMINI_MODELS, '(Gemini Direct)'))
    );
  }

  if (GROK_API_KEY) {
    models.push(
      ...(runtimeModelCatalog.grok || [{
        id: GROK_MODEL_NAME,
        provider: 'grok',
        label: `${prettyModelLabel(GROK_MODEL_NAME)} (Grok Direct)`,
        supportsFiles: true,
      }])
    );
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

  if (TOGETHER_API_KEY) {
    models.push(
      ...(runtimeModelCatalog.together
        || getConfiguredProviderModels('together', process.env.TOGETHER_MODELS, DEFAULT_TOGETHER_MODELS, '(Together AI)'))
    );
  }

  if (GROQ_API_KEY) {
    models.push(
      ...(runtimeModelCatalog.groq
        || getConfiguredProviderModels('groq', process.env.GROQ_MODELS, DEFAULT_GROQ_MODELS, '(Groq)'))
    );
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

function estimatePromptComplexity(promptText, attachmentPayload, operation) {
  const promptLength = String(promptText || '').length;
  if (attachmentPayload || operation === 'group-chat' || promptLength > 2800) {
    return 'high';
  }
  if (operation === 'json' || promptLength > 1200) {
    return 'medium';
  }
  return 'low';
}

function findFirstModelByPatterns(models, patterns) {
  for (const pattern of patterns) {
    const match = models.find((model) => model.id.toLowerCase().includes(pattern.toLowerCase()));
    if (match) {
      return match;
    }
  }
  return null;
}

function rankModelsForTask(models, context = {}) {
  const complexity = context.complexity || 'medium';
  const operation = context.operation || 'chat';
  const hasAttachment = Boolean(context.attachmentPayload);

  const preferences = operation === 'json'
    ? {
        low: ['gpt-5.4-mini', 'gemini-2.5-flash', 'llama-3.1-8b-instant', 'qwen3-32b', 'compound-mini'],
        medium: ['gpt-5.4-mini', 'gemini-2.5-flash', 'claude-sonnet-4.6', 'qwen3-32b', 'llama-3.3-70b-versatile'],
        high: ['gpt-5.4', 'claude-sonnet-4.6', 'gemini-2.5-pro', 'claude-opus-4.6', 'llama-3.3-70b-versatile'],
      }
    : {
        low: ['gpt-5.4-mini', 'gemini-2.5-flash', 'llama-3.1-8b-instant', 'qwen3-32b', 'compound-mini'],
        medium: ['gpt-5.4-mini', 'claude-sonnet-4.6', 'gemini-2.5-flash', 'qwen3-32b', 'llama-3.3-70b-versatile'],
        high: ['gpt-5.4', 'claude-opus-4.6', 'claude-sonnet-4.6', 'gemini-2.5-pro', 'llama-3.3-70b-versatile'],
      };

  const preferredPatterns = [...(preferences[complexity] || preferences.medium)];
  if (hasAttachment) {
    preferredPatterns.unshift('gemini-2.5-flash', 'gemini-2.5-pro', 'gpt-5.4-mini');
  }

  const prioritized = [];
  const remaining = [...models];

  preferredPatterns.forEach((pattern) => {
    const match = findFirstModelByPatterns(remaining, [pattern]);
    if (!match) {
      return;
    }
    prioritized.push(match);
    const index = remaining.findIndex((model) => model.id === match.id);
    if (index !== -1) {
      remaining.splice(index, 1);
    }
  });

  return [...prioritized, ...remaining];
}

function resolveTaskModel(requestedModelId, context = {}) {
  const availableModels = getAvailableModels({ includeFallback: false }).filter((model) => model.provider !== 'fallback');
  if (availableModels.length === 0) {
    return { model: resolveModel(requestedModelId), routing: { requestedModelId: requestedModelId || null, autoMode: false, complexity: null } };
  }

  if (requestedModelId && requestedModelId !== 'auto') {
    const resolved = resolveModel(requestedModelId, { includeFallback: false });
    return {
      model: resolved,
      routing: {
        requestedModelId,
        selectedModelId: resolved?.id || null,
        autoMode: false,
        complexity: context.complexity || null,
      },
    };
  }

  const rankedModels = rankModelsForTask(availableModels, context);
  const selectedModel = rankedModels[0] || availableModels[0];
  return {
    model: selectedModel,
    routing: {
      requestedModelId: requestedModelId || 'auto',
      selectedModelId: selectedModel?.id || null,
      autoMode: true,
      complexity: context.complexity || null,
    },
  };
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

async function buildProjectContext(project) {
  if (!project) {
    return '';
  }

  const sections = [];

  if (project.name) {
    sections.push(`Project: ${project.name}`);
  }

  if (project.description) {
    sections.push(`Project description:\n${project.description}`);
  }

  if (project.instructions) {
    sections.push(`Project instructions:\n${project.instructions}`);
  }

  if (project.context) {
    sections.push(`Project context:\n${project.context}`);
  }

  if (Array.isArray(project.tags) && project.tags.length > 0) {
    sections.push(`Project tags: ${project.tags.join(', ')}`);
  }

  if (Array.isArray(project.files) && project.files.length > 0) {
    const fileSections = [];

    for (const file of project.files.slice(0, 6)) {
      const payload = await buildAttachmentPayload(file);
      if (!payload?.promptText) {
        continue;
      }

      fileSections.push([
        `Project file: ${file.fileName}`,
        file.note ? `File note: ${file.note}` : '',
        payload.promptText.slice(0, 4000),
      ].filter(Boolean).join('\n'));
    }

    if (fileSections.length > 0) {
      sections.push(['Project files:', ...fileSections].join('\n\n'));
    }
  }

  if (Array.isArray(project.suggestedPrompts) && project.suggestedPrompts.length > 0) {
    sections.push(`Suggested project tasks: ${project.suggestedPrompts.join(' | ')}`);
  }

  return sections.join('\n\n');
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
    const error = new Error(message);
    error.statusCode = response.status;
    throw error;
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

function extractUsageFromOpenAiLikeResponse(payload) {
  const usage = payload?.usage || {};
  return {
    promptTokens: Number.isFinite(Number(usage.prompt_tokens)) ? Number(usage.prompt_tokens) : null,
    completionTokens: Number.isFinite(Number(usage.completion_tokens)) ? Number(usage.completion_tokens) : null,
    totalTokens: Number.isFinite(Number(usage.total_tokens)) ? Number(usage.total_tokens) : null,
  };
}

function extractUsageFromGeminiResponse(result) {
  const usage = result?.response?.usageMetadata || {};
  return {
    promptTokens: Number.isFinite(Number(usage.promptTokenCount)) ? Number(usage.promptTokenCount) : null,
    completionTokens: Number.isFinite(Number(usage.candidatesTokenCount)) ? Number(usage.candidatesTokenCount) : null,
    totalTokens: Number.isFinite(Number(usage.totalTokenCount)) ? Number(usage.totalTokenCount) : null,
  };
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

function getMaxTokensForOperation(operation) {
  if (operation === 'json') {
    return Math.max(128, Number(process.env.AI_JSON_MAX_COMPLETION_TOKENS || 400));
  }

  if (operation === 'chat' || operation === 'group-chat') {
    return Math.max(256, Number(process.env.AI_CHAT_MAX_COMPLETION_TOKENS || 1200));
  }

  return Math.max(256, Number(process.env.AI_MAX_COMPLETION_TOKENS || 800));
}

async function runOpenRouterRequest(model, systemPrompt, promptText, attachmentPayload, maxTokens) {
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
      max_tokens: maxTokens,
      messages: buildOpenAiMessages(systemPrompt, promptText, attachmentPayload),
    }),
  });

  return {
    content: extractTextFromOpenAiLikeResponse(payload),
    usage: extractUsageFromOpenAiLikeResponse(payload),
  };
}

async function runGrokRequest(model, systemPrompt, promptText, attachmentPayload, maxTokens) {
  const payload = await fetchJson('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model.id,
      temperature: 0.6,
      max_tokens: maxTokens,
      messages: buildOpenAiMessages(systemPrompt, promptText, attachmentPayload),
    }),
  });

  return {
    content: extractTextFromOpenAiLikeResponse(payload),
    usage: extractUsageFromOpenAiLikeResponse(payload),
  };
}

async function runHuggingFaceRequest(model, systemPrompt, promptText, attachmentPayload, maxTokens) {
  const payload = await fetchJson('https://router.huggingface.co/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model.id,
      temperature: 0.6,
      max_tokens: maxTokens,
      messages: buildOpenAiMessages(systemPrompt, promptText, attachmentPayload),
    }),
  });

  return {
    content: extractTextFromOpenAiLikeResponse(payload),
    usage: extractUsageFromOpenAiLikeResponse(payload),
  };
}

async function runTogetherRequest(model, systemPrompt, promptText, attachmentPayload, maxTokens) {
  const payload = await fetchJson('https://api.together.xyz/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOGETHER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model.id,
      temperature: 0.6,
      max_tokens: maxTokens,
      messages: buildOpenAiMessages(systemPrompt, promptText, attachmentPayload),
    }),
  });

  return {
    content: extractTextFromOpenAiLikeResponse(payload),
    usage: extractUsageFromOpenAiLikeResponse(payload),
  };
}

async function runGroqDirectRequest(model, systemPrompt, promptText, attachmentPayload, maxTokens) {
  const payload = await fetchJson('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model.id,
      temperature: 0.6,
      max_tokens: maxTokens,
      messages: buildOpenAiMessages(systemPrompt, promptText, attachmentPayload),
    }),
  });

  return {
    content: extractTextFromOpenAiLikeResponse(payload),
    usage: extractUsageFromOpenAiLikeResponse(payload),
  };
}

async function runGeminiRequest(model, systemPrompt, promptText, attachmentPayload, maxTokens) {
  if (!genAI) {
    return { content: '', usage: { promptTokens: null, completionTokens: null, totalTokens: null } };
  }

  const generativeModel = genAI.getGenerativeModel({
    model: model.id,
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: maxTokens,
    },
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
  return {
    content: result.response.text().trim(),
    usage: extractUsageFromGeminiResponse(result),
  };
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
      content = (await runOpenRouterRequest(model, systemPrompt, promptText, attachmentPayload, getMaxTokensForOperation('prompt'))).content;
    } else if (model.provider === 'grok') {
      content = (await runGrokRequest(model, systemPrompt, promptText, attachmentPayload, getMaxTokensForOperation('prompt'))).content;
    } else if (model.provider === 'huggingface') {
      content = (await runHuggingFaceRequest(model, systemPrompt, promptText, attachmentPayload, getMaxTokensForOperation('prompt'))).content;
    } else {
      content = (await runGeminiRequest(model, systemPrompt, promptText, attachmentPayload, getMaxTokensForOperation('prompt'))).content;
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

async function executeModelRequest(model, systemPrompt, promptText, attachmentPayload, operation) {
  const maxTokens = getMaxTokensForOperation(operation);

  if (model.provider === 'openrouter') {
    return runOpenRouterRequest(model, systemPrompt, promptText, attachmentPayload, maxTokens);
  }

  if (model.provider === 'grok') {
    return runGrokRequest(model, systemPrompt, promptText, attachmentPayload, maxTokens);
  }

  if (model.provider === 'groq') {
    return runGroqDirectRequest(model, systemPrompt, promptText, attachmentPayload, maxTokens);
  }

  if (model.provider === 'together') {
    return runTogetherRequest(model, systemPrompt, promptText, attachmentPayload, maxTokens);
  }

  if (model.provider === 'huggingface') {
    return runHuggingFaceRequest(model, systemPrompt, promptText, attachmentPayload, maxTokens);
  }

  return runGeminiRequest(model, systemPrompt, promptText, attachmentPayload, maxTokens);
}

async function runModelPromptWithFallback({ promptText, systemPrompt = '', modelId, attachment, operation = 'prompt' }) {
  const attachmentPayload = await buildAttachmentPayload(attachment);
  const complexity = estimatePromptComplexity(promptText, attachmentPayload, operation);
  const { model, routing } = resolveTaskModel(modelId, {
    operation,
    promptText,
    attachmentPayload,
    complexity,
  });

  if (!model || model.provider === 'fallback') {
    return {
      content: buildOfflineFallbackResponse(operation),
      model: model || { id: 'fallback/offline', provider: 'fallback', label: 'Offline fallback', supportsFiles: true },
      usage: { promptTokens: null, completionTokens: null, totalTokens: null },
      processingMs: 0,
      routing,
    };
  }

  const rankedModels = rankModelsForTask(
    getAvailableModels({ includeFallback: false }).filter((entry) => entry.provider !== 'fallback'),
    { operation, promptText, attachmentPayload, complexity }
  );
  const attemptChain = [model, ...rankedModels.filter((entry) => entry.id !== model.id)]
    .slice(0, Math.max(1, Number(process.env.AI_FALLBACK_MODEL_LIMIT || 6)));
  let lastError = null;

  for (let attemptIndex = 0; attemptIndex < attemptChain.length; attemptIndex += 1) {
    const currentModel = attemptChain[attemptIndex];
    const isFallbackAttempt = attemptIndex > 0;
    const startedAt = Date.now();

    logger.info('AI_ATTEMPT', 'Running model prompt', {
      operation,
      attempt: attemptIndex + 1,
      totalAttempts: attemptChain.length,
      modelId: currentModel.id,
      provider: currentModel.provider,
      requestedModelId: modelId || routing?.requestedModelId || model.id,
      fallbackAttempt: isFallbackAttempt,
      promptLength: String(promptText || '').length,
      hasAttachment: Boolean(attachmentPayload),
      autoMode: Boolean(routing?.autoMode),
      complexity,
    });

    try {
      const result = await executeModelRequest(currentModel, systemPrompt, promptText, attachmentPayload, operation);
      const processingMs = Date.now() - startedAt;
      const usage = result?.usage || { promptTokens: null, completionTokens: null, totalTokens: null };

      logger.info('AI_SUCCESS', 'Model prompt completed', {
        operation,
        attempt: attemptIndex + 1,
        modelId: currentModel.id,
        provider: currentModel.provider,
        fallbackUsed: isFallbackAttempt,
        autoMode: Boolean(routing?.autoMode),
        complexity,
        processingMs,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
        contentLength: String(result?.content || '').length,
      });

      return {
        content: result?.content || 'I could not generate a response for that request.',
        model: currentModel,
        usage,
        processingMs,
        routing: {
          ...routing,
          selectedModelId: currentModel.id,
          fallbackUsed: isFallbackAttempt,
        },
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
    extraSections: [await buildProjectContext(options.project)],
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

if (process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY || GROK_API_KEY || TOGETHER_API_KEY || GROQ_API_KEY) {
  void refreshModelCatalogs().catch(() => {});
}

module.exports = {
  MODEL_NAME,
  buildInitialRoomHistory,
  getAvailableModels,
  refreshModelCatalogs,
  getJsonFromModel,
  resolveModel,
  sendMessage,
  sendGroupMessage,
};
