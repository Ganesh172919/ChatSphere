const express = require('express');
const authMiddleware = require('../middleware/auth');
const Project = require('../models/Project');
const Conversation = require('../models/Conversation');
const { validateAttachmentPayload } = require('../services/messageFormatting');

const router = express.Router();

function normalizeString(value, maxLength = 1000) {
  return String(value || '')
    .trim()
    .slice(0, maxLength);
}

function normalizeStringArray(values, maxItems, maxLength) {
  if (!Array.isArray(values)) {
    return [];
  }

  return Array.from(new Set(
    values
      .map((value) => normalizeString(value, maxLength))
      .filter(Boolean)
  )).slice(0, maxItems);
}

function normalizeFiles(files) {
  if (!Array.isArray(files)) {
    return [];
  }

  return files
    .slice(0, 12)
    .map((file) => ({
      fileUrl: file?.fileUrl,
      fileName: normalizeString(file?.fileName, 160),
      fileType: normalizeString(file?.fileType, 120),
      fileSize: Number(file?.fileSize || 0),
      note: normalizeString(file?.note, 240),
    }))
    .filter((file) => !validateAttachmentPayload(file));
}

function formatProject(project, stats = {}) {
  return {
    id: project._id.toString(),
    name: project.name,
    description: project.description || '',
    instructions: project.instructions || '',
    context: project.context || '',
    tags: Array.isArray(project.tags) ? project.tags : [],
    suggestedPrompts: Array.isArray(project.suggestedPrompts) ? project.suggestedPrompts : [],
    files: Array.isArray(project.files)
      ? project.files.map((file) => ({
          id: file._id?.toString?.() || '',
          fileUrl: file.fileUrl,
          fileName: file.fileName,
          fileType: file.fileType,
          fileSize: file.fileSize,
          note: file.note || '',
          addedAt: file.addedAt,
        }))
      : [],
    conversationCount: stats.conversationCount || 0,
    lastConversationAt: stats.lastConversationAt || null,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

async function loadProjectStats(userId, projectIds) {
  if (!Array.isArray(projectIds) || projectIds.length === 0) {
    return new Map();
  }

  const stats = await Conversation.aggregate([
    {
      $match: {
        userId,
        projectId: { $in: projectIds },
      },
    },
    {
      $group: {
        _id: '$projectId',
        conversationCount: { $sum: 1 },
        lastConversationAt: { $max: '$updatedAt' },
      },
    },
  ]);

  return new Map(stats.map((item) => [item._id.toString(), item]));
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    const projects = await Project.find({ userId: req.user.id })
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    const statsByProjectId = await loadProjectStats(
      req.user.id,
      projects.map((project) => project._id)
    );

    res.json(projects.map((project) => formatProject(
      project,
      statsByProjectId.get(project._id.toString()) || {}
    )));
  } catch (err) {
    console.error('List projects error:', err);
    res.status(500).json({ error: 'Failed to load projects' });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      userId: req.user.id,
    }).lean();

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const [statsByProjectId, recentConversations] = await Promise.all([
      loadProjectStats(req.user.id, [project._id]),
      Conversation.find({ userId: req.user.id, projectId: project._id })
        .select('title createdAt updatedAt messages')
        .sort({ updatedAt: -1 })
        .limit(8)
        .lean(),
    ]);

    res.json({
      ...formatProject(project, statsByProjectId.get(project._id.toString()) || {}),
      recentConversations: recentConversations.map((conversation) => ({
        id: conversation._id.toString(),
        title: conversation.title,
        messageCount: Array.isArray(conversation.messages) ? conversation.messages.length : 0,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      })),
    });
  } catch (err) {
    console.error('Get project error:', err);
    res.status(500).json({ error: 'Failed to load project' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const name = normalizeString(req.body?.name, 80);
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const project = new Project({
      userId: req.user.id,
      name,
      description: normalizeString(req.body?.description, 280),
      instructions: normalizeString(req.body?.instructions, 5000),
      context: normalizeString(req.body?.context, 8000),
      tags: normalizeStringArray(req.body?.tags, 8, 32),
      suggestedPrompts: normalizeStringArray(req.body?.suggestedPrompts, 6, 200),
      files: normalizeFiles(req.body?.files),
    });

    await project.save();

    res.status(201).json(formatProject(project.toObject(), {}));
  } catch (err) {
    console.error('Create project error:', err);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const name = normalizeString(req.body?.name ?? project.name, 80);
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    project.name = name;
    project.description = normalizeString(req.body?.description ?? project.description, 280);
    project.instructions = normalizeString(req.body?.instructions ?? project.instructions, 5000);
    project.context = normalizeString(req.body?.context ?? project.context, 8000);
    project.tags = normalizeStringArray(req.body?.tags ?? project.tags, 8, 32);
    project.suggestedPrompts = normalizeStringArray(req.body?.suggestedPrompts ?? project.suggestedPrompts, 6, 200);
    project.files = normalizeFiles(req.body?.files ?? project.files);

    await project.save();

    const statsByProjectId = await loadProjectStats(req.user.id, [project._id]);
    res.json(formatProject(project.toObject(), statsByProjectId.get(project._id.toString()) || {}));
  } catch (err) {
    console.error('Update project error:', err);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      userId: req.user.id,
    }).select('_id');

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await Promise.all([
      Conversation.updateMany(
        { userId: req.user.id, projectId: project._id },
        {
          $set: {
            projectId: null,
            projectName: null,
          },
        }
      ),
      Project.deleteOne({ _id: project._id, userId: req.user.id }),
    ]);

    res.json({ message: 'Project deleted' });
  } catch (err) {
    console.error('Delete project error:', err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

module.exports = router;
