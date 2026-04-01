const { ALLOWED_TYPES, MAX_FILE_SIZE } = require('../middleware/upload');

function formatMemoryRefs(memoryRefs = []) {
  return memoryRefs.map((entry) => ({
    id: String(entry.id),
    summary: entry.summary,
    score: typeof entry.score === 'number' ? entry.score : null,
  }));
}

function formatMessage(message) {
  return {
    id: message._id.toString(),
    userId: message.userId,
    username: message.username,
    content: message.isDeleted ? 'This message was deleted' : message.content,
    timestamp: message.createdAt,
    isAI: message.isAI || false,
    triggeredBy: message.triggeredBy || null,
    replyTo: message.replyTo && message.replyTo.id ? message.replyTo : null,
    reactions: message.reactions ? (message.reactions instanceof Map ? Object.fromEntries(message.reactions) : message.reactions) : {},
    status: message.status || 'sent',
    isPinned: message.isPinned || false,
    isEdited: message.isEdited || false,
    editedAt: message.editedAt || null,
    isDeleted: message.isDeleted || false,
    fileUrl: message.fileUrl || null,
    fileName: message.fileName || null,
    fileType: message.fileType || null,
    fileSize: message.fileSize || null,
    memoryRefs: formatMemoryRefs(message.memoryRefs || []),
    modelId: message.modelId || null,
    provider: message.provider || null,
  };
}

function validateAttachmentPayload({ fileUrl, fileName, fileType, fileSize }) {
  const hasAnyFileField = fileUrl || fileName || fileType || fileSize;
  if (!hasAnyFileField) {
    return null;
  }

  if (!fileUrl || !fileName || !fileType || typeof fileSize !== 'number') {
    return 'Incomplete file attachment data';
  }

  if (!fileUrl.startsWith('/api/uploads/')) {
    return 'Invalid file URL';
  }

  if (!ALLOWED_TYPES[fileType]) {
    return 'Unsupported file type';
  }

  if (fileSize <= 0 || fileSize > MAX_FILE_SIZE) {
    return `Files must be smaller than ${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB`;
  }

  return null;
}

module.exports = {
  formatMessage,
  formatMemoryRefs,
  validateAttachmentPayload,
};
