const crypto = require('crypto');
const Conversation = require('../models/Conversation');
const ConversationInsight = require('../models/ConversationInsight');
const ImportSession = require('../models/ImportSession');
const MemoryEntry = require('../models/MemoryEntry');
const { buildMemoryCandidates, upsertMemoryEntries } = require('./memory');
const { refreshConversationInsight } = require('./conversationInsights');

function hashContent(content) {
  return crypto.createHash('sha1').update(String(content || '')).digest('hex');
}

function toMessage(role, content, timestamp = null) {
  return {
    role: role === 'assistant' ? 'assistant' : 'user',
    content: String(content || '').trim(),
    timestamp: timestamp ? new Date(timestamp) : new Date(),
  };
}

function parseChatGptJson(raw) {
  const parsed = JSON.parse(raw);
  const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed.conversations) ? parsed.conversations : [];

  return rows
    .map((row, index) => {
      if (row.mapping && typeof row.mapping === 'object') {
        const nodes = Object.values(row.mapping)
          .map((node) => node.message)
          .filter(Boolean)
          .map((message) => {
            const role = message.author?.role === 'assistant' ? 'assistant' : 'user';
            const content = Array.isArray(message.content?.parts) ? message.content.parts.join('\n') : '';
            return toMessage(role, content, message.create_time ? message.create_time * 1000 : null);
          })
          .filter((message) => message.content);

        return {
          title: row.title || `Imported ChatGPT conversation ${index + 1}`,
          messages: nodes,
          sourceType: 'chatgpt',
        };
      }

      if (Array.isArray(row.messages)) {
        return {
          title: row.title || `Imported ChatGPT conversation ${index + 1}`,
          messages: row.messages.map((message) => toMessage(message.role, message.content, message.timestamp)),
          sourceType: 'chatgpt',
        };
      }

      return null;
    })
    .filter((entry) => entry && entry.messages.length > 0);
}

function parseClaudeSource(raw) {
  try {
    const parsed = JSON.parse(raw);
    const messages = Array.isArray(parsed.messages) ? parsed.messages : Array.isArray(parsed.chat_messages) ? parsed.chat_messages : null;
    if (!messages) {
      return [];
    }

    return [{
      title: parsed.title || 'Imported Claude conversation',
      messages: messages.map((message) => toMessage(message.role, message.content || message.text, message.timestamp)),
      sourceType: 'claude',
    }];
  } catch (error) {
    const sections = raw
      .split(/\n(?=Human:|Assistant:)/i)
      .map((chunk) => chunk.trim())
      .filter(Boolean);

    const messages = sections.map((section) => {
      if (/^assistant:/i.test(section)) {
        return toMessage('assistant', section.replace(/^assistant:/i, '').trim());
      }

      return toMessage('user', section.replace(/^human:/i, '').trim());
    });

    return messages.length > 0
      ? [{
          title: 'Imported Claude conversation',
          messages,
          sourceType: 'claude',
        }]
      : [];
  }
}

function parseGenericMarkdown(raw) {
  const blocks = raw
    .split(/\n(?=#|\bUser:|\bAssistant:)/)
    .map((block) => block.trim())
    .filter(Boolean);

  const messages = [];
  blocks.forEach((block) => {
    if (/^assistant:/i.test(block)) {
      messages.push(toMessage('assistant', block.replace(/^assistant:/i, '').trim()));
      return;
    }

    if (/^user:/i.test(block)) {
      messages.push(toMessage('user', block.replace(/^user:/i, '').trim()));
    }
  });

  if (messages.length > 0) {
    return [{
      title: 'Imported markdown conversation',
      messages,
      sourceType: 'markdown',
    }];
  }

  return [{
    title: 'Imported text conversation',
    messages: raw
      .split(/\n{2,}/)
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .map((chunk, index) => toMessage(index % 2 === 0 ? 'user' : 'assistant', chunk)),
    sourceType: 'text',
  }].filter((entry) => entry.messages.length > 0);
}

function detectAndParseImport(content, filename = '') {
  const safeName = String(filename || '').toLowerCase();
  const errors = [];
  let conversations = [];
  let sourceType = 'text';

  try {
    if (safeName.includes('chatgpt') || safeName.endsWith('.json')) {
      conversations = parseChatGptJson(content);
      sourceType = conversations[0]?.sourceType || 'json';
    }
  } catch (error) {
    errors.push('Could not parse as ChatGPT JSON.');
  }

  if (conversations.length === 0) {
    conversations = parseClaudeSource(content);
    if (conversations.length > 0) {
      sourceType = 'claude';
    }
  }

  if (conversations.length === 0) {
    conversations = parseGenericMarkdown(content);
    sourceType = conversations[0]?.sourceType || 'text';
  }

  return {
    sourceType,
    conversations,
    errors,
  };
}

async function previewImport(content, filename) {
  const parsed = detectAndParseImport(content, filename);
  const candidateMemories = [];

  for (const conversation of parsed.conversations) {
    const userText = conversation.messages
      .filter((message) => message.role === 'user')
      .map((message) => message.content)
      .join('\n');

    const memories = await buildMemoryCandidates(userText);
    candidateMemories.push(...memories);
  }

  return {
    sourceType: parsed.sourceType,
    conversations: parsed.conversations.map((conversation) => ({
      title: conversation.title,
      messageCount: conversation.messages.length,
      preview: conversation.messages.slice(0, 4),
    })),
    candidateMemories: candidateMemories.slice(0, 8),
    errors: parsed.errors,
  };
}

async function importConversationBundle({ userId, content, filename }) {
  const fingerprint = hashContent(content);
  const existingSession = await ImportSession.findOne({
    userId,
    fingerprint,
    status: 'imported',
  }).lean();

  if (existingSession) {
    return {
      reused: true,
      importSessionId: existingSession._id.toString(),
      importedConversationIds: existingSession.importedConversationIds.map((id) => id.toString()),
      importedMemoryIds: existingSession.importedMemoryIds.map((id) => id.toString()),
    };
  }

  const parsed = detectAndParseImport(content, filename);
  const session = await ImportSession.findOneAndUpdate(
    { userId, fingerprint },
    {
      $set: {
        userId,
        fingerprint,
        sourceType: parsed.sourceType,
        sourceName: filename || 'Imported history',
        status: 'previewed',
        preview: {
          conversationCount: parsed.conversations.length,
          memoryCount: 0,
          duplicateCount: 0,
          errors: parsed.errors,
        },
      },
    },
    { new: true, upsert: true }
  );

  const importedConversationIds = [];
  const importedMemoryIds = [];
  let duplicateCount = 0;

  for (const conversation of parsed.conversations) {
    const conversationFingerprint = hashContent(JSON.stringify(conversation.messages));
    const existingConversation = await Conversation.findOne({
      userId,
      importFingerprint: conversationFingerprint,
    }).select('_id');

    if (existingConversation) {
      duplicateCount += 1;
      importedConversationIds.push(existingConversation._id);
      continue;
    }

    const created = await Conversation.create({
      userId,
      title: conversation.title,
      messages: conversation.messages,
      sourceType: conversation.sourceType,
      sourceLabel: filename || 'Imported history',
      importFingerprint: conversationFingerprint,
      importSessionId: session._id,
    });

    importedConversationIds.push(created._id);

    const userText = conversation.messages
      .filter((message) => message.role === 'user')
      .map((message) => message.content)
      .join('\n');

    const memories = await upsertMemoryEntries({
      userId,
      text: userText,
      sourceType: 'import',
      sourceConversationId: created._id,
      sourceImportSessionId: session._id,
    });

    memories.forEach((memory) => importedMemoryIds.push(memory._id));
    await refreshConversationInsight(userId, created._id);
  }

  await ImportSession.findByIdAndUpdate(session._id, {
    $set: {
      status: 'imported',
      preview: {
        conversationCount: parsed.conversations.length,
        memoryCount: importedMemoryIds.length,
        duplicateCount,
        errors: parsed.errors,
      },
      importedConversationIds,
      importedMemoryIds,
    },
  });

  return {
    reused: false,
    importSessionId: session._id.toString(),
    importedConversationIds: importedConversationIds.map((id) => id.toString()),
    importedMemoryIds: importedMemoryIds.map((id) => id.toString()),
  };
}

function buildMarkdownExport({ conversations, insights, memories }) {
  const lines = ['# ChatSphere Export', '', '## Memories', ''];
  memories.forEach((memory) => {
    lines.push(`- ${memory.summary}`);
  });

  lines.push('', '## Conversations', '');
  conversations.forEach((conversation) => {
    lines.push(`### ${conversation.title}`);
    const insight = insights.find((row) => String(row.conversationId || '') === String(conversation._id));
    if (insight?.summary) {
      lines.push('', `Summary: ${insight.summary}`, '');
    }

    conversation.messages.forEach((message) => {
      lines.push(`**${message.role}**: ${message.content}`);
    });
    lines.push('');
  });

  return lines.join('\n');
}

function buildAdapterExport({ conversations, insights, memories }) {
  return {
    provider: 'generic-llm-adapter',
    exportedAt: new Date().toISOString(),
    memories: memories.map((memory) => ({
      summary: memory.summary,
      tags: memory.tags,
    })),
    conversations: conversations.map((conversation) => ({
      title: conversation.title,
      insight: insights.find((row) => String(row.conversationId || '') === String(conversation._id)) || null,
      messages: conversation.messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    })),
  };
}

async function exportUserBundle({ userId, format = 'normalized' }) {
  const [conversations, insights, memories] = await Promise.all([
    Conversation.find({ userId }).sort({ updatedAt: -1 }).lean(),
    ConversationInsight.find({
      $or: [{ userId }, { scopeType: 'room' }],
    }).lean(),
    MemoryEntry.find({ userId }).sort({ pinned: -1, updatedAt: -1 }).lean(),
  ]);

  if (format === 'markdown') {
    return buildMarkdownExport({ conversations, insights, memories });
  }

  if (format === 'adapter') {
    return buildAdapterExport({ conversations, insights, memories });
  }

  return {
    exportedAt: new Date().toISOString(),
    format: 'normalized',
    conversations,
    insights,
    memories,
  };
}

module.exports = {
  previewImport,
  importConversationBundle,
  exportUserBundle,
};
