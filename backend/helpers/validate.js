const mongoose = require('mongoose');

// Check if a string is a valid MongoDB ObjectId
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);
}

// Trim and cap a string's length
function sanitizeString(str, maxLen = 500) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLen);
}

function escapeRegex(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Return array of missing field names from an object
function requireFields(obj, fields) {
  return fields.filter(f => obj[f] === undefined || obj[f] === null || obj[f] === '');
}

// Check if user is a member of a room (returns the member entry or null)
function findRoomMember(room, userId) {
  if (!room || !room.members) return null;
  return room.members.find(m => m.userId.toString() === userId.toString()) || null;
}

function isRoomCreator(room, userId) {
  return Boolean(room?.creatorId && room.creatorId.toString() === userId.toString());
}

function getRoomMemberRole(room, userId) {
  if (isRoomCreator(room, userId)) {
    return 'creator';
  }

  const member = findRoomMember(room, userId);
  return member ? member.role : null;
}

function hasRoomRole(room, userId, roles = []) {
  if (isRoomCreator(room, userId)) {
    return true;
  }

  const member = findRoomMember(room, userId);
  return Boolean(member && roles.includes(member.role));
}

function canManageRoomMember(room, actorId, targetId) {
  if (!room || actorId.toString() === targetId.toString()) {
    return false;
  }

  if (isRoomCreator(room, targetId)) {
    return false;
  }

  if (isRoomCreator(room, actorId)) {
    return true;
  }

  const actorRole = getRoomMemberRole(room, actorId);
  const targetRole = getRoomMemberRole(room, targetId);

  if (actorRole === 'admin') {
    return targetRole === 'member' || targetRole === 'moderator';
  }

  if (actorRole === 'moderator') {
    return targetRole === 'member';
  }

  return false;
}

// Check if userId is in the user's blocked list
function isBlockedBy(blockerUser, targetUserId) {
  if (!blockerUser || !blockerUser.blockedUsers) return false;
  return blockerUser.blockedUsers.some(id => id.toString() === targetUserId.toString());
}

module.exports = {
  isValidObjectId,
  sanitizeString,
  escapeRegex,
  requireFields,
  findRoomMember,
  isRoomCreator,
  getRoomMemberRole,
  hasRoomRole,
  canManageRoomMember,
  isBlockedBy,
};
