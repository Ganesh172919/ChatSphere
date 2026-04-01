const crypto = require('crypto');
const MemoryEntry = require('../models/MemoryEntry');
const { getJsonFromModel } = require('./gemini');

function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text) {
  return normalizeText(text)
    .split(' ')
    .filter((token) => token.length > 2);
}

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean))];
}

function clampScore(value, fallback) {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) {
    return Math.max(0, Math.min(1, parsed));
  }
  return fallback;
}

function buildFingerprint(summary) {
  return crypto.createHash('sha1').update(normalizeText(summary)).digest('hex');
}

function extractDeterministicMemories(text) {
  const rawText = String(text || '').trim();
  if (!rawText) {
    return [];
  }

  const definitions = [
    {
      regex: /\bmy name is ([a-z][a-z\s'-]{1,40})/i,
      build: (match) => ({
        summary: `The user says their name is ${match[1].trim()}.`,
        details: rawText,
        tags: ['identity', 'name'],
        confidenceScore: 0.95,
        importanceScore: 0.9,
      }),
    },
    {
      regex: /\bi live in ([a-z0-9,\s'-]{2,60})/i,
      build: (match) => ({
        summary: `The user lives in ${match[1].trim()}.`,
        details: rawText,
        tags: ['location', 'personal'],
        confidenceScore: 0.8,
        importanceScore: 0.7,
      }),
    },
    {
      regex: /\bi work (?:at|for) ([a-z0-9,\s&.'-]{2,80})/i,
      build: (match) => ({
        summary: `The user works at ${match[1].trim()}.`,
        details: rawText,
        tags: ['work', 'personal'],
        confidenceScore: 0.82,
        importanceScore: 0.8,
      }),
    },
    {
      regex: /\bmy favorite ([a-z\s]+) is ([a-z0-9,\s&.'-]{2,80})/i,
      build: (match) => ({
        summary: `The user's favorite ${match[1].trim()} is ${match[2].trim()}.`,
        details: rawText,
        tags: ['preference'],
        confidenceScore: 0.78,
        importanceScore: 0.65,
      }),
    },
    {
      regex: /\bi (?:like|love|prefer) ([a-z0-9,\s&.'-]{3,80})/i,
      build: (match) => ({
        summary: `The user likes ${match[1].trim()}.`,
        details: rawText,
        tags: ['preference'],
        confidenceScore: 0.65,
        importanceScore: 0.55,
      }),
    },
  ];

  return definitions
    .map((definition) => {
      const match = rawText.match(definition.regex);
      return match ? definition.build(match) : null;
    })
    .filter(Boolean);
}

async function extractAiMemories(text) {
  const prompt = [
    'Return JSON only.',
    'Extract up to 5 stable user memories from this text.',
    'Use the schema {"items":[{"summary":"","details":"","confidenceScore":0.0,"importanceScore":0.0,"tags":[""]}]}',
    'Ignore temporary requests and generic chit-chat.',
    `Text:\n${text}`,
  ].join('\n\n');

  const result = await getJsonFromModel(prompt, { items: [] });
  return Array.isArray(result.items) ? result.items : [];
}

async function buildMemoryCandidates(text) {
  const deterministic = extractDeterministicMemories(text);
  let aiCandidates = [];

  try {
    aiCandidates = await extractAiMemories(text);
  } catch (error) {
    aiCandidates = [];
  }

  return [...deterministic, ...aiCandidates]
    .map((item) => ({
      summary: String(item.summary || '').trim(),
      details: String(item.details || '').trim(),
      tags: uniqueStrings((item.tags || []).map((tag) => normalizeText(tag))),
      confidenceScore: clampScore(item.confidenceScore, 0.6),
      importanceScore: clampScore(item.importanceScore, 0.5),
    }))
    .filter((item) => item.summary.length >= 6);
}

function computeRecencyScore(dateValue) {
  const observed = new Date(dateValue || Date.now());
  const ageDays = Math.max(0, (Date.now() - observed.getTime()) / (1000 * 60 * 60 * 24));
  if (ageDays <= 1) return 1;
  if (ageDays <= 7) return 0.85;
  if (ageDays <= 30) return 0.65;
  if (ageDays <= 90) return 0.45;
  return 0.25;
}

async function upsertMemoryEntries({
  userId,
  text,
  sourceType,
  sourceConversationId = null,
  sourceRoomId = null,
  sourceMessageId = null,
  sourceImportSessionId = null,
}) {
  const candidates = await buildMemoryCandidates(text);
  if (candidates.length === 0) {
    return [];
  }

  const savedEntries = [];

  for (const candidate of candidates) {
    const fingerprint = buildFingerprint(candidate.summary);
    const existing = await MemoryEntry.findOne({ userId, fingerprint });

    if (existing) {
      existing.summary = candidate.summary;
      existing.details = candidate.details || existing.details;
      existing.tags = uniqueStrings([...(existing.tags || []), ...candidate.tags]);
      existing.confidenceScore = Math.max(existing.confidenceScore, candidate.confidenceScore);
      existing.importanceScore = Math.max(existing.importanceScore, candidate.importanceScore);
      existing.recencyScore = 1;
      existing.lastObservedAt = new Date();
      existing.sourceConversationId = sourceConversationId || existing.sourceConversationId;
      existing.sourceRoomId = sourceRoomId || existing.sourceRoomId;
      existing.sourceMessageId = sourceMessageId || existing.sourceMessageId;
      existing.sourceImportSessionId = sourceImportSessionId || existing.sourceImportSessionId;
      await existing.save();
      savedEntries.push(existing);
      continue;
    }

    const entry = await MemoryEntry.create({
      userId,
      summary: candidate.summary,
      details: candidate.details,
      tags: candidate.tags,
      fingerprint,
      sourceType,
      sourceConversationId,
      sourceRoomId,
      sourceMessageId,
      sourceImportSessionId,
      confidenceScore: candidate.confidenceScore,
      importanceScore: candidate.importanceScore,
      recencyScore: 1,
      lastObservedAt: new Date(),
    });

    savedEntries.push(entry);
  }

  return savedEntries;
}

function scoreMemory(entry, queryTokens) {
  const entryTokens = tokenize([entry.summary, entry.details, ...(entry.tags || [])].join(' '));
  const overlap = entryTokens.filter((token) => queryTokens.has(token)).length;
  const textScore = queryTokens.size > 0 ? overlap / queryTokens.size : 0;
  const recency = computeRecencyScore(entry.lastObservedAt || entry.updatedAt);
  const pinnedBonus = entry.pinned ? 0.15 : 0;

  return (
    textScore * 0.45 +
    entry.importanceScore * 0.2 +
    entry.confidenceScore * 0.15 +
    recency * 0.1 +
    Math.min(0.1, entry.usageCount * 0.01) +
    pinnedBonus
  );
}

async function retrieveRelevantMemories({ userId, query, limit = 5 }) {
  const entries = await MemoryEntry.find({ userId })
    .sort({ pinned: -1, updatedAt: -1 })
    .limit(100)
    .lean();

  const queryTokens = new Set(tokenize(query));
  return entries
    .map((entry) => ({
      ...entry,
      score: scoreMemory(entry, queryTokens),
    }))
    .filter((entry) => entry.score > 0.08 || entry.pinned)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

async function markMemoriesUsed(memoryEntries = []) {
  const ids = memoryEntries.map((entry) => entry._id || entry.id).filter(Boolean);
  if (ids.length === 0) {
    return;
  }

  await MemoryEntry.updateMany(
    { _id: { $in: ids } },
    {
      $inc: { usageCount: 1 },
      $set: { lastUsedAt: new Date() },
    }
  );
}

module.exports = {
  buildFingerprint,
  buildMemoryCandidates,
  normalizeText,
  retrieveRelevantMemories,
  upsertMemoryEntries,
  markMemoriesUsed,
};
