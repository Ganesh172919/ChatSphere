const AI_WINDOW_MS = 15 * 60 * 1000;
const AI_MAX_REQUESTS = 20;
const quotaMap = new Map();

function consumeAiQuota(key, maxRequests = AI_MAX_REQUESTS, windowMs = AI_WINDOW_MS) {
  const now = Date.now();
  const existing = quotaMap.get(key);

  if (!existing || existing.resetAt <= now) {
    quotaMap.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });

    return {
      allowed: true,
      remaining: maxRequests - 1,
      retryAfterMs: 0,
    };
  }

  if (existing.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, existing.resetAt - now),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - existing.count),
    retryAfterMs: 0,
  };
}

module.exports = {
  AI_WINDOW_MS,
  AI_MAX_REQUESTS,
  consumeAiQuota,
};
