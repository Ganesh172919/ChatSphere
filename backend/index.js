require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');
const passport = require('passport');

// Database
const connectDB = require('./config/db');

// Passport config
require('./config/passport');

// Routes
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const conversationRoutes = require('./routes/conversations');
const roomRoutes = require('./routes/rooms');
const dashboardRoutes = require('./routes/dashboard');
const userRoutes = require('./routes/users');
const searchRoutes = require('./routes/search');
const aiRoutes = require('./routes/ai');
const settingsRoutes = require('./routes/settings');
const pollRoutes = require('./routes/polls');
const groupRoutes = require('./routes/groups');
const moderationRoutes = require('./routes/moderation');
const exportRoutes = require('./routes/export');
const adminRoutes = require('./routes/admin');
const analyticsRoutes = require('./routes/analytics');
const uploadRoutes = require('./routes/uploads');

// Middleware
const socketAuthMiddleware = require('./middleware/socketAuth');
const { apiLimiter } = require('./middleware/rateLimit');

// Models
const Room = require('./models/Room');
const Message = require('./models/Message');
const User = require('./models/User');

// Helpers
const { isValidObjectId, findRoomMember } = require('./helpers/validate');

// Services
const { sendGroupMessage } = require('./services/gemini');

const app = express();
const server = http.createServer(app);

// CORS
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
}));

app.use(express.json({ limit: '5mb' }));
app.use(passport.initialize());

// Apply general rate limiter to all API routes
app.use('/api', apiLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/polls', pollRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/uploads', uploadRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), db: 'mongodb' });
});

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    credentials: true,
  },
});

// Socket.IO auth middleware
io.use(socketAuthMiddleware);

// -- In-memory state tracking --

// Track online users per room: Map<roomId, Map<socketId, {id, username}>>
const roomUsers = new Map();
// Track global online users: Map<userId, {socketId, username}>
const globalOnlineUsers = new Map();
// Track typing state: Map<roomId, Map<userId, {username, timeout}>>
const typingUsers = new Map();
// Socket flood control: Map<socketId, { count, resetTime }>
const socketFlood = new Map();

// -- Helper functions --

const FLOOD_MAX = 30;       // max events per window
const FLOOD_WINDOW = 10000; // 10 seconds

function checkFlood(socketId) {
  const now = Date.now();
  let entry = socketFlood.get(socketId);
  if (!entry || now > entry.resetTime) {
    entry = { count: 1, resetTime: now + FLOOD_WINDOW };
    socketFlood.set(socketId, entry);
    return false;
  }
  entry.count++;
  return entry.count > FLOOD_MAX;
}

function getRoomOnlineUsers(roomId) {
  const users = roomUsers.get(roomId);
  if (!users) return [];
  return Array.from(users.values());
}

function addUserToRoom(roomId, socketId, user) {
  if (!roomUsers.has(roomId)) {
    roomUsers.set(roomId, new Map());
  }
  roomUsers.get(roomId).set(socketId, { id: user.id, username: user.username });
}

function removeUserFromRoom(roomId, socketId) {
  const users = roomUsers.get(roomId);
  if (users) {
    const user = users.get(socketId);
    users.delete(socketId);
    if (users.size === 0) {
      roomUsers.delete(roomId);
    }
    return user;
  }
  return null;
}

function removeUserFromAllRooms(socketId) {
  const leftRooms = [];
  for (const [roomId, users] of roomUsers.entries()) {
    if (users.has(socketId)) {
      const user = users.get(socketId);
      users.delete(socketId);
      if (users.size === 0) {
        roomUsers.delete(roomId);
      }
      leftRooms.push({ roomId, user });
    }
  }
  return leftRooms;
}

// Clear typing state for a user in a room
function clearTyping(roomId, userId) {
  const roomTyping = typingUsers.get(roomId);
  if (roomTyping) {
    const typing = roomTyping.get(userId);
    if (typing) {
      clearTimeout(typing.timeout);
      roomTyping.delete(userId);
      if (roomTyping.size === 0) {
        typingUsers.delete(roomId);
      }
    }
  }
}

// Status order for preventing backward transitions
const STATUS_ORDER = { sent: 0, delivered: 1, read: 2 };

// Format a message document for client consumption
function formatMessage(msg) {
  return {
    id: msg._id.toString(),
    userId: msg.userId,
    username: msg.username,
    content: msg.isDeleted ? '🗑️ This message was deleted' : msg.content,
    timestamp: msg.createdAt,
    isAI: msg.isAI || false,
    triggeredBy: msg.triggeredBy || null,
    replyTo: msg.replyTo && msg.replyTo.id ? msg.replyTo : null,
    reactions: msg.reactions ? (msg.reactions instanceof Map ? Object.fromEntries(msg.reactions) : msg.reactions) : {},
    status: msg.status || 'sent',
    isPinned: msg.isPinned || false,
    isEdited: msg.isEdited || false,
    editedAt: msg.editedAt || null,
    isDeleted: msg.isDeleted || false,
    fileUrl: msg.fileUrl || null,
    fileName: msg.fileName || null,
    fileType: msg.fileType || null,
    fileSize: msg.fileSize || null,
  };
}

// -- Socket.IO connection handler --

io.on('connection', async (socket) => {
  console.log(`User connected: ${socket.user.username} (${socket.id})`);

  // Track global online status
  globalOnlineUsers.set(socket.user.id, { socketId: socket.id, username: socket.user.username });

  // Update user online status in DB
  try {
    await User.findByIdAndUpdate(socket.user.id, {
      onlineStatus: 'online',
      lastSeen: new Date(),
    });
  } catch (err) {
    console.error('Failed to update user status:', err.message);
  }

  // Broadcast presence
  io.emit('user_status_change', {
    userId: socket.user.id,
    username: socket.user.username,
    status: 'online',
  });

  // -- authenticate --
  socket.on('authenticate', (callback) => {
    if (typeof callback === 'function') {
      callback({ success: true, user: socket.user });
    }
  });

  // -- join_room (with membership enforcement) --
  socket.on('join_room', async (roomId, callback) => {
    if (checkFlood(socket.id)) return;
    const ack = typeof callback === 'function' ? callback : () => {};

    try {
      if (!isValidObjectId(roomId)) {
        socket.emit('error_message', { error: 'Invalid room ID' });
        return ack({ success: false, error: 'Invalid room ID' });
      }

      const room = await Room.findById(roomId);
      if (!room) {
        socket.emit('error_message', { error: 'Room not found' });
        return ack({ success: false, error: 'Room not found' });
      }

      // Auto-add user to room members if not already a member
      let member = findRoomMember(room, socket.user.id);
      if (!member) {
        // Check capacity
        if (room.members.length >= room.maxUsers) {
          socket.emit('error_message', { error: 'Room is full' });
          return ack({ success: false, error: 'Room is full' });
        }
        room.members.push({ userId: socket.user.id, role: 'member', joinedAt: new Date() });
        await room.save();
      }

      // Leave previous rooms
      const leftRooms = removeUserFromAllRooms(socket.id);
      leftRooms.forEach(({ roomId: leftRoomId, user }) => {
        socket.leave(leftRoomId);
        io.to(leftRoomId).emit('user_left', { username: user.username, userId: user.id });
        io.to(leftRoomId).emit('room_users', getRoomOnlineUsers(leftRoomId));
      });

      socket.join(roomId);
      addUserToRoom(roomId, socket.id, socket.user);

      io.to(roomId).emit('user_joined', { username: socket.user.username, userId: socket.user.id });
      io.to(roomId).emit('room_users', getRoomOnlineUsers(roomId));

      // Mark unread messages as delivered
      try {
        await Message.updateMany(
          { roomId, status: 'sent', userId: { $ne: socket.user.id } },
          { $set: { status: 'delivered' } }
        );
      } catch (err) {
        console.error('Mark delivered error:', err.message);
      }

      ack({ success: true });
    } catch (err) {
      console.error('Join room error:', err);
      socket.emit('error_message', { error: 'Failed to join room' });
      ack({ success: false, error: 'Failed to join room' });
    }
  });

  // -- leave_room --
  socket.on('leave_room', (roomId) => {
    if (checkFlood(socket.id)) return;
    const user = removeUserFromRoom(roomId, socket.id);
    socket.leave(roomId);
    if (user) {
      io.to(roomId).emit('user_left', { username: user.username, userId: user.id });
      io.to(roomId).emit('room_users', getRoomOnlineUsers(roomId));
    }
  });

  // -- typing_start --
  socket.on('typing_start', ({ roomId }) => {
    if (checkFlood(socket.id)) return;
    if (!roomId) return;

    clearTyping(roomId, socket.user.id);

    if (!typingUsers.has(roomId)) {
      typingUsers.set(roomId, new Map());
    }

    const timeout = setTimeout(() => {
      clearTyping(roomId, socket.user.id);
      socket.to(roomId).emit('typing_stop', {
        userId: socket.user.id,
        username: socket.user.username,
      });
    }, 3000);

    typingUsers.get(roomId).set(socket.user.id, {
      username: socket.user.username,
      timeout,
    });

    socket.to(roomId).emit('typing_start', {
      userId: socket.user.id,
      username: socket.user.username,
    });
  });

  // -- typing_stop --
  socket.on('typing_stop', ({ roomId }) => {
    if (checkFlood(socket.id)) return;
    if (!roomId) return;
    clearTyping(roomId, socket.user.id);
    socket.to(roomId).emit('typing_stop', {
      userId: socket.user.id,
      username: socket.user.username,
    });
  });

  // -- mark_read (with backward-transition guard) --
  socket.on('mark_read', async ({ roomId, messageIds }) => {
    if (checkFlood(socket.id)) return;
    if (!roomId || !messageIds || !Array.isArray(messageIds)) return;

    try {
      // Only update messages that are not already 'read' (prevents backward transition)
      await Message.updateMany(
        {
          _id: { $in: messageIds },
          userId: { $ne: socket.user.id },
          status: { $in: ['sent', 'delivered'] },
        },
        {
          $set: { status: 'read' },
          $addToSet: {
            readBy: { userId: socket.user.id, readAt: new Date() },
          },
        }
      );

      io.to(roomId).emit('message_read', {
        messageIds,
        readBy: socket.user.id,
        username: socket.user.username,
      });
    } catch (err) {
      console.error('Mark read error:', err.message);
    }
  });

  // -- send_message (with membership check) --
  socket.on('send_message', async ({ roomId, content, fileUrl, fileName, fileType, fileSize }, callback) => {
    if (checkFlood(socket.id)) return;
    const ack = typeof callback === 'function' ? callback : () => {};

    const hasContent = content && content.trim().length > 0;
    const hasFile = fileUrl && fileName;
    if (!hasContent && !hasFile) return ack({ success: false, error: 'Message content or file is required' });

    // Clear typing state
    clearTyping(roomId, socket.user.id);
    socket.to(roomId).emit('typing_stop', { userId: socket.user.id, username: socket.user.username });

    try {
      if (!isValidObjectId(roomId)) return ack({ success: false, error: 'Invalid room ID' });

      // Verify membership
      const room = await Room.findById(roomId).select('members').lean();
      if (!room) return ack({ success: false, error: 'Room not found' });

      const member = findRoomMember(room, socket.user.id);
      if (!member) return ack({ success: false, error: 'You are not a member of this room' });

      const msg = new Message({
        roomId,
        userId: socket.user.id,
        username: socket.user.username,
        content: hasContent ? content.trim() : (fileName || 'File'),
        isAI: false,
        status: 'sent',
        reactions: new Map(),
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileType: fileType || null,
        fileSize: fileSize || null,
      });
      await msg.save();

      const messageData = formatMessage(msg);
      io.to(roomId).emit('receive_message', messageData);

      // Mark as delivered if others are in the room
      const roomOnline = getRoomOnlineUsers(roomId);
      if (roomOnline.length > 1) {
        msg.status = 'delivered';
        await msg.save();
        io.to(roomId).emit('message_status_update', {
          messageId: msg._id.toString(),
          status: 'delivered',
        });
      }

      ack({ success: true, messageId: msg._id.toString() });
    } catch (err) {
      console.error('Send message error:', err);
      ack({ success: false, error: 'Failed to send message' });
    }
  });

  // -- reply_message (with membership check) --
  socket.on('reply_message', async ({ roomId, content, replyToId }, callback) => {
    if (checkFlood(socket.id)) return;
    const ack = typeof callback === 'function' ? callback : () => {};

    if (!content || content.trim().length === 0) return ack({ success: false, error: 'Content is required' });

    clearTyping(roomId, socket.user.id);

    try {
      if (!isValidObjectId(roomId)) return ack({ success: false, error: 'Invalid room ID' });

      // Verify membership
      const room = await Room.findById(roomId).select('members').lean();
      if (!room) return ack({ success: false, error: 'Room not found' });
      if (!findRoomMember(room, socket.user.id)) return ack({ success: false, error: 'Not a member' });

      let replyTo = null;
      if (replyToId && isValidObjectId(replyToId)) {
        const parentMsg = await Message.findById(replyToId).lean();
        if (parentMsg) {
          replyTo = {
            id: parentMsg._id.toString(),
            username: parentMsg.username,
            content: parentMsg.isDeleted ? '[deleted]' : parentMsg.content.substring(0, 100),
          };
        }
      }

      const msg = new Message({
        roomId,
        userId: socket.user.id,
        username: socket.user.username,
        content: content.trim(),
        isAI: false,
        replyTo,
        status: 'sent',
        reactions: new Map(),
      });
      await msg.save();

      io.to(roomId).emit('receive_message', formatMessage(msg));
      ack({ success: true, messageId: msg._id.toString() });
    } catch (err) {
      console.error('Reply message error:', err);
      ack({ success: false, error: 'Failed to send reply' });
    }
  });

  // -- add_reaction (with membership check) --
  socket.on('add_reaction', async ({ roomId, messageId, emoji }, callback) => {
    if (checkFlood(socket.id)) return;
    const ack = typeof callback === 'function' ? callback : () => {};

    try {
      if (!isValidObjectId(messageId)) return ack({ success: false, error: 'Invalid message ID' });

      const msg = await Message.findById(messageId);
      if (!msg) return ack({ success: false, error: 'Message not found' });
      if (msg.isDeleted) return ack({ success: false, error: 'Cannot react to a deleted message' });

      // Verify membership
      if (roomId && isValidObjectId(roomId)) {
        const room = await Room.findById(roomId).select('members').lean();
        if (room && !findRoomMember(room, socket.user.id)) {
          return ack({ success: false, error: 'Not a member' });
        }
      }

      const currentReactors = msg.reactions.get(emoji) || [];
      const idx = currentReactors.indexOf(socket.user.id);

      if (idx > -1) {
        currentReactors.splice(idx, 1);
        if (currentReactors.length === 0) {
          msg.reactions.delete(emoji);
        } else {
          msg.reactions.set(emoji, currentReactors);
        }
      } else {
        currentReactors.push(socket.user.id);
        msg.reactions.set(emoji, currentReactors);
      }

      await msg.save();

      const reactionsObj = Object.fromEntries(msg.reactions);
      io.to(roomId).emit('reaction_update', { messageId, reactions: reactionsObj });
      ack({ success: true });
    } catch (err) {
      console.error('Reaction error:', err);
      ack({ success: false, error: 'Failed to update reaction' });
    }
  });

  // -- trigger_ai (with membership check and throttle) --
  socket.on('trigger_ai', async ({ roomId, prompt }, callback) => {
    if (checkFlood(socket.id)) return;
    const ack = typeof callback === 'function' ? callback : () => {};

    if (!prompt || prompt.trim().length === 0) return ack({ success: false, error: 'Prompt is required' });

    io.to(roomId).emit('ai_thinking', { roomId, status: true });

    try {
      if (!isValidObjectId(roomId)) {
        io.to(roomId).emit('ai_thinking', { roomId, status: false });
        return ack({ success: false, error: 'Invalid room ID' });
      }

      const room = await Room.findById(roomId);
      if (!room) {
        io.to(roomId).emit('ai_thinking', { roomId, status: false });
        return ack({ success: false, error: 'Room not found' });
      }

      // Verify membership
      if (!findRoomMember(room, socket.user.id)) {
        io.to(roomId).emit('ai_thinking', { roomId, status: false });
        return ack({ success: false, error: 'Not a member' });
      }

      const responseText = await sendGroupMessage(room.aiHistory, prompt.trim(), socket.user.username);

      // Update AI history in room
      room.aiHistory.push({ role: 'user', parts: [{ text: `[${socket.user.username} asks]: ${prompt.trim()}` }] });
      room.aiHistory.push({ role: 'model', parts: [{ text: responseText }] });

      // Trim AI history to last 40 entries + system prompt
      if (room.aiHistory.length > 42) {
        room.aiHistory = [room.aiHistory[0], room.aiHistory[1], ...room.aiHistory.slice(-38)];
      }
      await room.save();

      // Persist AI message
      const aiMsg = new Message({
        roomId,
        userId: 'ai',
        username: 'GeminiX',
        content: responseText,
        isAI: true,
        triggeredBy: socket.user.username,
        status: 'delivered',
        reactions: new Map(),
      });
      await aiMsg.save();

      io.to(roomId).emit('ai_thinking', { roomId, status: false });
      io.to(roomId).emit('ai_response', formatMessage(aiMsg));
      ack({ success: true });
    } catch (err) {
      console.error('AI trigger error:', err);
      io.to(roomId).emit('ai_thinking', { roomId, status: false });

      const errorMsg = new Message({
        roomId,
        userId: 'ai',
        username: 'GeminiX',
        content: '⚠️ I encountered an error while processing your request. Please try again.',
        isAI: true,
        triggeredBy: socket.user.username,
        status: 'delivered',
        reactions: new Map(),
      });
      await errorMsg.save();
      io.to(roomId).emit('ai_response', formatMessage(errorMsg));
      ack({ success: false, error: 'AI request failed' });
    }
  });

  // -- edit_message (within 15-min window, owner only) --
  socket.on('edit_message', async ({ roomId, messageId, newContent }, callback) => {
    if (checkFlood(socket.id)) return;
    const ack = typeof callback === 'function' ? callback : () => {};

    if (!newContent || newContent.trim().length === 0) {
      return ack({ success: false, error: 'Content is required' });
    }

    try {
      if (!isValidObjectId(messageId)) return ack({ success: false, error: 'Invalid message ID' });

      const msg = await Message.findById(messageId);
      if (!msg) return ack({ success: false, error: 'Message not found' });
      if (msg.isDeleted) return ack({ success: false, error: 'Cannot edit a deleted message' });
      if (msg.isAI) return ack({ success: false, error: 'Cannot edit AI messages' });

      // Only the author can edit
      if (msg.userId !== socket.user.id) {
        return ack({ success: false, error: 'You can only edit your own messages' });
      }

      // 15-minute edit window
      const editWindow = 15 * 60 * 1000;
      if (Date.now() - msg.createdAt.getTime() > editWindow) {
        return ack({ success: false, error: 'Edit window has expired (15 minutes)' });
      }

      // Save original content on first edit
      if (!msg.originalContent) {
        msg.originalContent = msg.content;
      }

      msg.content = newContent.trim();
      msg.isEdited = true;
      msg.editedAt = new Date();
      await msg.save();

      io.to(roomId).emit('message_edited', {
        messageId: msg._id.toString(),
        content: msg.content,
        isEdited: true,
        editedAt: msg.editedAt,
      });

      ack({ success: true });
    } catch (err) {
      console.error('Edit message error:', err);
      ack({ success: false, error: 'Failed to edit message' });
    }
  });

  // -- delete_message (soft delete — owner or moderator/admin) --
  socket.on('delete_message', async ({ roomId, messageId }, callback) => {
    if (checkFlood(socket.id)) return;
    const ack = typeof callback === 'function' ? callback : () => {};

    try {
      if (!isValidObjectId(messageId)) return ack({ success: false, error: 'Invalid message ID' });
      if (!isValidObjectId(roomId)) return ack({ success: false, error: 'Invalid room ID' });

      const msg = await Message.findById(messageId);
      if (!msg) return ack({ success: false, error: 'Message not found' });
      if (msg.isDeleted) return ack({ success: false, error: 'Already deleted' });

      const isOwner = msg.userId === socket.user.id;

      // Check if user is a moderator/admin in the room
      let isModOrAdmin = false;
      const room = await Room.findById(roomId).select('members creatorId').lean();
      if (room) {
        const member = findRoomMember(room, socket.user.id);
        isModOrAdmin = member && ['admin', 'moderator'].includes(member.role);
        if (room.creatorId.toString() === socket.user.id) isModOrAdmin = true;
      }

      if (!isOwner && !isModOrAdmin) {
        return ack({ success: false, error: 'You can only delete your own messages' });
      }

      msg.isDeleted = true;
      msg.deletedAt = new Date();
      msg.deletedBy = socket.user.id;
      await msg.save();

      io.to(roomId).emit('message_deleted', {
        messageId: msg._id.toString(),
        deletedBy: socket.user.username,
      });

      ack({ success: true });
    } catch (err) {
      console.error('Delete message error:', err);
      ack({ success: false, error: 'Failed to delete message' });
    }
  });

  // -- pin_message (admin/moderator/creator only) --
  socket.on('pin_message', async ({ roomId, messageId }, callback) => {
    if (checkFlood(socket.id)) return;
    const ack = typeof callback === 'function' ? callback : () => {};

    try {
      if (!isValidObjectId(messageId) || !isValidObjectId(roomId)) {
        return ack({ success: false, error: 'Invalid ID' });
      }

      const room = await Room.findById(roomId);
      if (!room) return ack({ success: false, error: 'Room not found' });

      // Check permissions (any member can pin for now — simple approach)
      if (!findRoomMember(room, socket.user.id)) {
        return ack({ success: false, error: 'Not a member' });
      }

      const msg = await Message.findById(messageId);
      if (!msg || msg.roomId.toString() !== roomId) {
        return ack({ success: false, error: 'Message not found in this room' });
      }

      msg.isPinned = true;
      msg.pinnedBy = socket.user.username;
      msg.pinnedAt = new Date();
      await msg.save();

      await Room.findByIdAndUpdate(roomId, {
        $addToSet: { pinnedMessages: messageId },
      });

      io.to(roomId).emit('message_pinned', {
        messageId,
        pinnedBy: socket.user.username,
        message: {
          id: msg._id.toString(),
          content: msg.content,
          username: msg.username,
          timestamp: msg.createdAt,
          pinnedBy: socket.user.username,
          pinnedAt: msg.pinnedAt,
        },
      });

      ack({ success: true });
    } catch (err) {
      console.error('Pin message error:', err);
      ack({ success: false, error: 'Failed to pin' });
    }
  });

  // -- unpin_message --
  socket.on('unpin_message', async ({ roomId, messageId }, callback) => {
    if (checkFlood(socket.id)) return;
    const ack = typeof callback === 'function' ? callback : () => {};

    try {
      const msg = await Message.findById(messageId);
      if (msg) {
        msg.isPinned = false;
        msg.pinnedBy = null;
        msg.pinnedAt = null;
        await msg.save();
      }

      await Room.findByIdAndUpdate(roomId, {
        $pull: { pinnedMessages: messageId },
      });

      io.to(roomId).emit('message_unpinned', { messageId });
      ack({ success: true });
    } catch (err) {
      console.error('Unpin message error:', err);
      ack({ success: false, error: 'Failed to unpin' });
    }
  });

  // -- disconnect --
  socket.on('disconnect', async () => {
    console.log(`User disconnected: ${socket.user.username} (${socket.id})`);

    // Clean flood tracking
    socketFlood.delete(socket.id);

    // Remove from global online
    globalOnlineUsers.delete(socket.user.id);

    // Update DB status
    try {
      await User.findByIdAndUpdate(socket.user.id, {
        onlineStatus: 'offline',
        lastSeen: new Date(),
      });
    } catch (err) {
      console.error('Failed to update user status on disconnect:', err.message);
    }

    // Broadcast offline status
    io.emit('user_status_change', {
      userId: socket.user.id,
      username: socket.user.username,
      status: 'offline',
    });

    // Clean up room presence
    const leftRooms = removeUserFromAllRooms(socket.id);
    leftRooms.forEach(({ roomId, user }) => {
      clearTyping(roomId, user.id);
      io.to(roomId).emit('user_left', { username: user.username, userId: user.id });
      io.to(roomId).emit('room_users', getRoomOnlineUsers(roomId));
    });
  });
});

// Start server
const PORT = process.env.PORT || 3000;

async function startServer() {
  await connectDB();

  server.listen(PORT, () => {
    console.log(`\n✦ ChatSphere server running on port ${PORT}`);
    console.log(`  → API:      http://localhost:${PORT}/api`);
    console.log(`  → Socket:   ws://localhost:${PORT}`);
    console.log(`  → Client:   ${CLIENT_URL}`);
    console.log(`  → Database: MongoDB`);
    console.log();
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
