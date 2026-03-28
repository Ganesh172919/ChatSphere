const express = require('express');
const authMiddleware = require('../middleware/auth');
const Poll = require('../models/Poll');
const Room = require('../models/Room');
const {
  isValidObjectId,
  findRoomMember,
  hasRoomRole,
} = require('../helpers/validate');

const router = express.Router();

function formatPoll(poll, currentUserId) {
  const totalVotes = poll.options.reduce((sum, option) => sum + option.votes.length, 0);

  return {
    id: poll._id.toString(),
    roomId: poll.roomId.toString(),
    creatorId: poll.creatorId.toString(),
    creatorUsername: poll.creatorUsername,
    question: poll.question,
    options: poll.options.map((option, index) => ({
      index,
      text: option.text,
      voteCount: option.votes.length,
      percentage: totalVotes > 0 ? Math.round((option.votes.length / totalVotes) * 100) : 0,
      hasVoted: option.votes.some((vote) => vote.toString() === currentUserId),
      voters: poll.isAnonymous ? [] : option.votes.map((vote) => vote.toString()),
    })),
    totalVotes,
    allowMultipleVotes: poll.allowMultipleVotes,
    isAnonymous: poll.isAnonymous,
    isClosed: poll.isClosed,
    isExpired: poll.expiresAt ? new Date() > poll.expiresAt : false,
    expiresAt: poll.expiresAt ? poll.expiresAt.toISOString() : null,
    createdAt: poll.createdAt.toISOString(),
  };
}

async function loadMemberRoom(roomId, userId) {
  const room = await Room.findById(roomId).select('members creatorId').lean();
  if (!room) {
    return { room: null, error: { status: 404, message: 'Room not found' } };
  }

  if (!findRoomMember(room, userId)) {
    return { room: null, error: { status: 403, message: 'You must be a room member to do that' } };
  }

  return { room, error: null };
}

// POST /api/polls
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { roomId, question, options, allowMultipleVotes, isAnonymous, expiresInMinutes } = req.body;

    if (!roomId || !isValidObjectId(roomId)) {
      return res.status(400).json({ error: 'Valid room ID is required' });
    }

    if (!question || typeof question !== 'string' || question.trim().length < 3) {
      return res.status(400).json({ error: 'Question must be at least 3 characters' });
    }

    if (!Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: 'At least 2 options are required' });
    }

    const cleanOptions = options
      .map((option) => (typeof option === 'string' ? option : option?.text || ''))
      .map((option) => option.trim())
      .filter(Boolean)
      .slice(0, 10);

    if (cleanOptions.length < 2) {
      return res.status(400).json({ error: 'At least 2 valid options are required' });
    }

    if (new Set(cleanOptions.map((option) => option.toLowerCase())).size !== cleanOptions.length) {
      return res.status(400).json({ error: 'Poll options must be unique' });
    }

    const { error } = await loadMemberRoom(roomId, req.user.id);
    if (error) {
      return res.status(error.status).json({ error: error.message });
    }

    const expiresMinutes = Number.isFinite(Number(expiresInMinutes)) ? Number(expiresInMinutes) : null;
    const poll = new Poll({
      roomId,
      creatorId: req.user.id,
      creatorUsername: req.user.username,
      question: question.trim().slice(0, 500),
      options: cleanOptions.map((option) => ({ text: option, votes: [] })),
      allowMultipleVotes: Boolean(allowMultipleVotes),
      isAnonymous: Boolean(isAnonymous),
      expiresAt: expiresMinutes && expiresMinutes > 0 ? new Date(Date.now() + expiresMinutes * 60000) : null,
    });

    await poll.save();
    res.status(201).json(formatPoll(poll, req.user.id));
  } catch (err) {
    console.error('Create poll error:', err);
    res.status(500).json({ error: 'Failed to create poll' });
  }
});

// GET /api/polls/room/:roomId
router.get('/room/:roomId', authMiddleware, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.roomId)) {
      return res.status(400).json({ error: 'Invalid room ID' });
    }

    const { error } = await loadMemberRoom(req.params.roomId, req.user.id);
    if (error) {
      return res.status(error.status).json({ error: error.message });
    }

    const polls = await Poll.find({ roomId: req.params.roomId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json(polls.map((poll) => formatPoll(poll, req.user.id)));
  } catch (err) {
    console.error('List polls error:', err);
    res.status(500).json({ error: 'Failed to load polls' });
  }
});

// POST /api/polls/:id/vote
router.post('/:id/vote', authMiddleware, async (req, res) => {
  try {
    const optionIndex = Number(req.body.optionIndex);

    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid poll ID' });
    }

    if (!Number.isInteger(optionIndex)) {
      return res.status(400).json({ error: 'Option index must be an integer' });
    }

    const poll = await Poll.findById(req.params.id);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    const { error } = await loadMemberRoom(poll.roomId, req.user.id);
    if (error) {
      return res.status(error.status).json({ error: error.message });
    }

    if (poll.isClosed) {
      return res.status(400).json({ error: 'This poll is closed' });
    }

    if (poll.expiresAt && new Date() > poll.expiresAt) {
      poll.isClosed = true;
      await poll.save();
      return res.status(400).json({ error: 'This poll has expired' });
    }

    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      return res.status(400).json({ error: 'Invalid option index' });
    }

    const userId = req.user.id;
    const hasVoteOnOption = poll.options[optionIndex].votes.some((vote) => vote.toString() === userId);

    if (hasVoteOnOption) {
      poll.options[optionIndex].votes = poll.options[optionIndex].votes.filter((vote) => vote.toString() !== userId);
    } else {
      if (!poll.allowMultipleVotes) {
        poll.options.forEach((option) => {
          option.votes = option.votes.filter((vote) => vote.toString() !== userId);
        });
      }

      poll.options[optionIndex].votes.push(userId);
    }

    await poll.save();
    res.json(formatPoll(poll, userId));
  } catch (err) {
    console.error('Vote error:', err);
    res.status(500).json({ error: 'Failed to vote' });
  }
});

// POST /api/polls/:id/close
router.post('/:id/close', authMiddleware, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid poll ID' });
    }

    const poll = await Poll.findById(req.params.id);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    const room = await Room.findById(poll.roomId).select('members creatorId').lean();
    if (!room || !findRoomMember(room, req.user.id)) {
      return res.status(403).json({ error: 'You must be a room member to close this poll' });
    }

    const isCreator = poll.creatorId.toString() === req.user.id;
    const canModerate = hasRoomRole(room, req.user.id, ['admin', 'moderator']);

    if (!isCreator && !canModerate) {
      return res.status(403).json({ error: 'Only the poll creator or room moderators can close it' });
    }

    if (poll.isClosed) {
      return res.json(formatPoll(poll, req.user.id));
    }

    poll.isClosed = true;
    await poll.save();

    res.json(formatPoll(poll, req.user.id));
  } catch (err) {
    console.error('Close poll error:', err);
    res.status(500).json({ error: 'Failed to close poll' });
  }
});

module.exports = router;
