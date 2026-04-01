const { consumeAiQuota } = require('../services/aiQuota');

function aiQuotaMiddleware(req, res, next) {
  const key = req.user?.id ? `user:${req.user.id}` : `ip:${req.ip}`;
  const result = consumeAiQuota(key);

  if (!result.allowed) {
    return res.status(429).json({
      error: 'AI request limit reached. Please wait a few minutes.',
      retryAfterMs: result.retryAfterMs,
    });
  }

  res.locals.aiQuota = result;
  return next();
}

module.exports = aiQuotaMiddleware;
