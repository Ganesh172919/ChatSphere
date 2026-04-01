const express = require('express');
const authMiddleware = require('../middleware/auth');
const Room = require('../models/Room');
const User = require('../models/User');
const {
  isValidObjectId,
  findRoomMember,
  isRoomCreator,
  getRoomMemberRole,
  canManageRoomMember,
} = require('../helpers/validate');

const router = express.Router();

// GET /api/groups/:roomId/members
router.get('/:roomId/members', authMiddleware, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.roomId)) {
      return res.status(400).json({ error: 'Invalid room ID' });
    }

    const room = await Room.findById(req.params.roomId)
      .select('members creatorId')
      .lean();

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (!findRoomMember(room, req.user.id)) {
      return res.status(403).json({ error: 'Only room members can view the member list' });
    }

    const memberIds = room.members.map((member) => member.userId);
    const users = await User.find({ _id: { $in: memberIds } })
      .select('username displayName avatar onlineStatus')
      .lean();

    const userMap = new Map(users.map((user) => [user._id.toString(), user]));

    res.json(room.members.map((member) => {
      const user = userMap.get(member.userId.toString());
      return {
        userId: member.userId.toString(),
        username: user?.username || 'unknown',
        displayName: user?.displayName || user?.username || 'Unknown',
        avatar: user?.avatar || null,
        onlineStatus: user?.onlineStatus || 'offline',
        role: member.role,
        isCreator: member.userId.toString() === room.creatorId.toString(),
        joinedAt: member.joinedAt,
        canManage: canManageRoomMember(room, req.user.id, member.userId),
      };
    }));
  } catch (err) {
    console.error('Get members error:', err);
    res.status(500).json({ error: 'Failed to load members' });
  }
});

// PUT /api/groups/:roomId/members/:userId/role
router.put('/:roomId/members/:userId/role', authMiddleware, async (req, res) => {
  try {
    const { roomId, userId } = req.params;
    const role = typeof req.body.role === 'string' ? req.body.role : '';

    if (!isValidObjectId(roomId) || !isValidObjectId(userId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    if (!['admin', 'moderator', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Valid role required: admin, moderator, or member' });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (!findRoomMember(room, req.user.id)) {
      return res.status(403).json({ error: 'You must be a room member to manage roles' });
    }

    if (!canManageRoomMember(room, req.user.id, userId)) {
      return res.status(403).json({ error: 'You do not have permission to change this member\'s role' });
    }

    if (!isRoomCreator(room, req.user.id) && role === 'admin') {
      return res.status(403).json({ error: 'Only the room creator can assign admin role' });
    }

    const targetMember = room.members.find((member) => member.userId.toString() === userId);
    if (!targetMember) {
      return res.status(404).json({ error: 'Member not found in this room' });
    }

    targetMember.role = role;
    await room.save();

    res.json({
      userId,
      role,
      message: `Role updated to ${role}`,
    });
  } catch (err) {
    console.error('Update role error:', err);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// DELETE /api/groups/:roomId/members/:userId
router.delete('/:roomId/members/:userId', authMiddleware, async (req, res) => {
  try {
    const { roomId, userId } = req.params;

    if (!isValidObjectId(roomId) || !isValidObjectId(userId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (!findRoomMember(room, req.user.id)) {
      return res.status(403).json({ error: 'You must be a room member to remove someone' });
    }

    if (!canManageRoomMember(room, req.user.id, userId)) {
      return res.status(403).json({ error: 'You do not have permission to remove this member' });
    }

    room.members = room.members.filter((member) => member.userId.toString() !== userId);
    await room.save();

    res.json({ message: 'Member removed successfully' });
  } catch (err) {
    console.error('Kick member error:', err);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

module.exports = router;
