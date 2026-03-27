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

// Return array of missing field names from an object
function requireFields(obj, fields) {
  return fields.filter(f => obj[f] === undefined || obj[f] === null || obj[f] === '');
}

// Check if user is a member of a room (returns the member entry or null)
function findRoomMember(room, userId) {
  if (!room || !room.members) return null;
  return room.members.find(m => m.userId.toString() === userId.toString()) || null;
}

// Check if userId is in the user's blocked list
function isBlockedBy(blockerUser, targetUserId) {
  if (!blockerUser || !blockerUser.blockedUsers) return false;
  return blockerUser.blockedUsers.some(id => id.toString() === targetUserId.toString());
}

module.exports = { isValidObjectId, sanitizeString, requireFields, findRoomMember, isBlockedBy };
