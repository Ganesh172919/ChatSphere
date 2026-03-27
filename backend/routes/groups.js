const express = require('express');
const authMiddleware = require('../middleware/auth');
const Room = require('../models/Room');
const User = require('../models/User');
const { isValidObjectId, findRoomMember } = require('../helpers/validate');

const router = express.Router();

// GET /api/groups/:roomId/members — Get members with roles
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

    // Get user details for each member
    const memberIds = room.members.map(m => m.userId);
    const users = await User.find({ _id: { $in: memberIds } })
      .select('username displayName avatar onlineStatus')
      .lean();

    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    const members = room.members.map(m => {
      const userData = userMap.get(m.userId.toString());
      return {
        userId: m.userId.toString(),
        username: userData?.username || 'Unknown',
        displayName: userData?.displayName || userData?.username || 'Unknown',
        avatar: userData?.avatar || null,
        onlineStatus: userData?.onlineStatus || 'offline',
        role: m.role,
        isCreator: m.userId.toString() === room.creatorId.toString(),
        joinedAt: m.joinedAt,
      };
    });

    res.json(members);
  } catch (err) {
    console.error('Get members error:', err);
    res.status(500).json({ error: 'Failed to load members' });
  }
});

// PUT /api/groups/:roomId/members/:userId/role — Update member role
router.put('/:roomId/members/:userId/role', authMiddleware, async (req, res) => {
  try {
    const { role } = req.body;
    const { roomId, userId } = req.params;

    if (!isValidObjectId(roomId) || !isValidObjectId(userId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    if (!role || !['admin', 'moderator', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Valid role required: admin, moderator, or member' });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Only creator or admin can change roles
    const currentUserMember = room.members.find(
      m => m.userId.toString() === req.user.id
    );
    const isCreator = room.creatorId.toString() === req.user.id;
    const isAdmin = currentUserMember?.role === 'admin';

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ error: 'Only the room creator or admins can change roles' });
    }

    // Cannot change creator's role
    if (userId === room.creatorId.toString()) {
      return res.status(403).json({ error: 'Cannot change the room creator\'s role' });
    }

    // Only creator can promote to admin
    if (!isCreator && role === 'admin') {
      return res.status(403).json({ error: 'Only the room creator can assign admin role' });
    }

    const memberIndex = room.members.findIndex(
      m => m.userId.toString() === userId
    );

    if (memberIndex === -1) {
      return res.status(404).json({ error: 'Member not found in this room' });
    }

    room.members[memberIndex].role = role;
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

// DELETE /api/groups/:roomId/members/:userId — Remove member (kick)
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

    // Only creator, admin, or moderator can kick
    const currentUserMember = room.members.find(
      m => m.userId.toString() === req.user.id
    );
    const isCreator = room.creatorId.toString() === req.user.id;
    const isAdminOrMod = ['admin', 'moderator'].includes(currentUserMember?.role || '');

    if (!isCreator && !isAdminOrMod) {
      return res.status(403).json({ error: 'Insufficient permissions to kick members' });
    }

    // Cannot kick the creator
    if (userId === room.creatorId.toString()) {
      return res.status(403).json({ error: 'Cannot kick the room creator' });
    }

    // Moderators can't kick admins
    const targetMember = room.members.find(m => m.userId.toString() === userId);
    if (!isCreator && targetMember?.role === 'admin') {
      return res.status(403).json({ error: 'Moderators cannot kick admins' });
    }

    room.members = room.members.filter(m => m.userId.toString() !== userId);
    await room.save();

    res.json({ message: 'Member removed successfully' });
  } catch (err) {
    console.error('Kick member error:', err);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

module.exports = router;
