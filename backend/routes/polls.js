const express = require('express');
const authMiddleware = require('../middleware/auth');
const Poll = require('../models/Poll');
const Room = require('../models/Room');
const { isValidObjectId, findRoomMember } = require('../helpers/validate');

const router = express.Router();

// POST /api/polls — Create a new poll (room members only)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { roomId, question, options, allowMultipleVotes, isAnonymous, expiresInMinutes } = req.body;

    if (!roomId || !question || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: 'Room ID, question, and at least 2 options are required' });
    }

    if (options.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 options allowed' });
    }

    if (!isValidObjectId(roomId)) {
      return res.status(400).json({ error: 'Invalid room ID' });
    }

    // Verify room exists and user is a member
    const room = await Room.findById(roomId).lean();
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    if (!findRoomMember(room, req.user.id)) {
      return res.status(403).json({ error: 'You must be a room member to create polls' });
    }

    const poll = new Poll({
      roomId,
      creatorId: req.user.id,
      creatorUsername: req.user.username,
      question: question.trim(),
      options: options.map(opt => ({
        text: typeof opt === 'string' ? opt.trim() : opt.text?.trim(),
        votes: [],
      })),
      allowMultipleVotes: allowMultipleVotes || false,
      isAnonymous: isAnonymous || false,
      expiresAt: expiresInMinutes ? new Date(Date.now() + expiresInMinutes * 60000) : null,
    });

    await poll.save();

    res.status(201).json(formatPoll(poll, req.user.id));
  } catch (err) {
    console.error('Create poll error:', err);
    res.status(500).json({ error: 'Failed to create poll' });
  }
});

// GET /api/polls/room/:roomId — List polls for a room
router.get('/room/:roomId', authMiddleware, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.roomId)) {
      return res.status(400).json({ error: 'Invalid room ID' });
    }

    const polls = await Poll.find({ roomId: req.params.roomId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json(polls.map(p => formatPoll(p, req.user.id)));
  } catch (err) {
    console.error('List polls error:', err);
    res.status(500).json({ error: 'Failed to load polls' });
  }
});

// POST /api/polls/:id/vote — Vote on a poll (room members only)
router.post('/:id/vote', authMiddleware, async (req, res) => {
  try {
    const { optionIndex } = req.body;

    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid poll ID' });
    }

    const poll = await Poll.findById(req.params.id);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    // Check room membership
    const room = await Room.findById(poll.roomId).select('members').lean();
    if (room && !findRoomMember(room, req.user.id)) {
      return res.status(403).json({ error: 'You must be a room member to vote' });
    }

    if (poll.isClosed) {
      return res.status(400).json({ error: 'This poll is closed' });
    }

    // Auto-close if expired
    if (poll.expiresAt && new Date() > poll.expiresAt) {
      poll.isClosed = true;
      await poll.save();
      return res.status(400).json({ error: 'This poll has expired' });
    }

    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      return res.status(400).json({ error: 'Invalid option index' });
    }

    const userId = req.user.id;

    // Check if user already voted on this option
    const alreadyVotedThisOption = poll.options[optionIndex].votes
      .some(v => v.toString() === userId);

    if (alreadyVotedThisOption) {
      // Remove vote (toggle)
      poll.options[optionIndex].votes = poll.options[optionIndex].votes
        .filter(v => v.toString() !== userId);
    } else {
      // If not allowing multiple votes, remove previous votes
      if (!poll.allowMultipleVotes) {
        poll.options.forEach(opt => {
          opt.votes = opt.votes.filter(v => v.toString() !== userId);
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

// POST /api/polls/:id/close — Close a poll (creator or room admin/moderator)
router.post('/:id/close', authMiddleware, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid poll ID' });
    }

    const poll = await Poll.findById(req.params.id);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    const isCreator = poll.creatorId.toString() === req.user.id;

    // Also allow room admins/moderators to close
    let isModOrAdmin = false;
    const room = await Room.findById(poll.roomId).select('members creatorId').lean();
    if (room) {
      const member = findRoomMember(room, req.user.id);
      isModOrAdmin = member && ['admin', 'moderator'].includes(member.role);
      if (room.creatorId.toString() === req.user.id) isModOrAdmin = true;
    }

    if (!isCreator && !isModOrAdmin) {
      return res.status(403).json({ error: 'Only the poll creator or room moderators can close it' });
    }

    poll.isClosed = true;
    await poll.save();

    res.json(formatPoll(poll, req.user.id));
  } catch (err) {
    console.error('Close poll error:', err);
    res.status(500).json({ error: 'Failed to close poll' });
  }
});

// Helper: format poll for client
function formatPoll(poll, currentUserId) {
  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);

  return {
    id: poll._id.toString(),
    roomId: poll.roomId.toString(),
    creatorId: poll.creatorId.toString(),
    creatorUsername: poll.creatorUsername,
    question: poll.question,
    options: poll.options.map((opt, i) => ({
      index: i,
      text: opt.text,
      voteCount: opt.votes.length,
      percentage: totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0,
      hasVoted: opt.votes.some(v => v.toString() === currentUserId),
      voters: poll.isAnonymous ? [] : opt.votes.map(v => v.toString()),
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

module.exports = router;
