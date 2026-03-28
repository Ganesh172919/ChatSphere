const crypto = require('crypto');

const SENSITIVE_KEY_PATTERN = /pass(word)?|access[-_]?token|refresh[-_]?token|api[-_]?key|client[-_]?secret|authorization|cookie|session|oauth[-_]?code|auth[-_]?code|secret/i;
const DEFAULT_MAX_STRING = 160;

function truncate(value, maxLength = DEFAULT_MAX_STRING) {
  const text = String(value ?? '');
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

function sanitizeValue(value, depth = 0) {
  if (value == null) {
    return value;
  }

  if (value instanceof Error) {
    return serializeError(value);
  }

  if (typeof value === 'string') {
    return truncate(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    if (depth >= 2) {
      return `[array:${value.length}]`;
    }

    return value.slice(0, 8).map((item) => sanitizeValue(item, depth + 1));
  }

  if (typeof value === 'object') {
    if (depth >= 2) {
      return '[object]';
    }

    return Object.entries(value).reduce((acc, [key, entryValue]) => {
      acc[key] = SENSITIVE_KEY_PATTERN.test(key) ? '[redacted]' : sanitizeValue(entryValue, depth + 1);
      return acc;
    }, {});
  }

  return truncate(value);
}

function serializeContext(context = {}) {
  const sanitized = sanitizeValue(context);
  const entries = Object.entries(sanitized || {}).filter(([, value]) => value !== undefined);

  if (entries.length === 0) {
    return '';
  }

  return entries
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join(' ');
}

function writeLog(level, event, message = '', context = {}) {
  const timestamp = new Date().toISOString();
  const contextString = serializeContext(context);
  const parts = [
    `[${timestamp}]`,
    `[${String(level || 'info').toUpperCase()}]`,
    `[${event}]`,
  ];

  if (message) {
    parts.push(message);
  }

  if (contextString) {
    parts.push(contextString);
  }

  const output = parts.join(' ');
  if (level === 'error') {
    console.error(output);
    return;
  }

  if (level === 'warn') {
    console.warn(output);
    return;
  }

  console.log(output);
}

function serializeError(error) {
  if (!error) {
    return null;
  }

  return {
    name: error.name || 'Error',
    message: truncate(error.message || 'Unknown error', 300),
    code: error.code || null,
    statusCode: error.statusCode || error.status || error.response?.status || null,
    retryAfterMs: error.retryAfterMs || null,
    modelId: error.model?.id || null,
    provider: error.model?.provider || null,
  };
}

function buildBodySummary(body) {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const summary = {
    keys: Object.keys(body).slice(0, 12),
  };

  if (typeof body.message === 'string') {
    summary.messageLength = body.message.trim().length;
  }

  if (typeof body.prompt === 'string') {
    summary.promptLength = body.prompt.trim().length;
  }

  if (typeof body.text === 'string') {
    summary.textLength = body.text.trim().length;
  }

  if (Array.isArray(body.history)) {
    summary.historyCount = body.history.length;
  }

  if (Array.isArray(body.messages)) {
    summary.messagesCount = body.messages.length;
  }

  if (body.modelId) {
    summary.modelId = body.modelId;
  }

  if (body.conversationId) {
    summary.conversationId = body.conversationId;
  }

  if (body.attachment || body.fileUrl) {
    summary.hasAttachment = true;
  }

  return summary;
}

function buildRequestSummary(req) {
  return {
    requestId: req.requestId || null,
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? buildBodySummary(req.body) : null,
  };
}

function createRequestId() {
  return crypto.randomUUID().slice(0, 8);
}

function child(baseContext = {}) {
  return {
    info(event, message, context = {}) {
      writeLog('info', event, message, { ...baseContext, ...context });
    },
    warn(event, message, context = {}) {
      writeLog('warn', event, message, { ...baseContext, ...context });
    },
    error(event, message, context = {}) {
      writeLog('error', event, message, { ...baseContext, ...context });
    },
  };
}

module.exports = {
  buildRequestSummary,
  child,
  createRequestId,
  error: (event, message, context = {}) => writeLog('error', event, message, context),
  info: (event, message, context = {}) => writeLog('info', event, message, context),
  sanitizeValue,
  serializeError,
  warn: (event, message, context = {}) => writeLog('warn', event, message, context),
};
