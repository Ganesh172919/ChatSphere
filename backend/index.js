const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Server } = require('socket.io');
const passport = require('passport');
const logger = require('./helpers/logger');

// Database
const connectDB = require('./config/db');

// Passport config
require('./config/passport');

// Routes
const authRoutes = require('./routes/auth.routes');
const chatRoutes = require('./routes/chat');
const conversationRoutes = require('./routes/conversations');
const roomRoutes = require('./routes/rooms');
const dashboardRoutes = require('./routes/dashboard');
const userRoutes = require('./routes/users');
const searchRoutes = require('./routes/search');
const aiRoutes = require('./routes/ai');
const projectRoutes = require('./routes/projects');
const settingsRoutes = require('./routes/settings');
const pollRoutes = require('./routes/polls');
const groupRoutes = require('./routes/groups');
const moderationRoutes = require('./routes/moderation');
const exportRoutes = require('./routes/export');
const adminRoutes = require('./routes/admin');
const analyticsRoutes = require('./routes/analytics');
const uploadRoutes = require('./routes/uploads');
const memoryRoutes = require('./routes/memory');

// Middleware
const socketAuthMiddleware = require('./middleware/socketAuth');
const { apiLimiter } = require('./middleware/rateLimit');

// Models
const Room = require('./models/Room');
const Message = require('./models/Message');
const User = require('./models/User');

// Helpers
const { isValidObjectId, findRoomMember, hasRoomRole } = require('./helpers/validate');

// Services
const { sendGroupMessage, getAvailableModels, refreshModelCatalogs, resolveModel } = require('./services/gemini');
const { consumeAiQuota } = require('./services/aiQuota');
const { getRoomInsight, refreshRoomInsight } = require('./services/conversationInsights');
const { formatMessage: sharedFormatMessage, validateAttachmentPayload: sharedValidateAttachmentPayload } = require('./services/messageFormatting');
const { markMemoriesUsed, retrieveRelevantMemories, upsertMemoryEntries } = require('./services/memory');

const app = express();
const server = http.createServer(app);

// CORS
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const EDIT_WINDOW_MS = (parseInt(process.env.MESSAGE_EDIT_WINDOW_MINUTES, 10) || 15) * 60 * 1000;
const AI_USERNAME = process.env.GEMINI_GROUP_BOT_NAME || 'Gemini';
const ALLOWED_REACTIONS = new Set(['👍', '🔥', '🤯', '💡']);
app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
}));

app.use(express.json({ limit: '5mb' }));
app.use(passport.initialize());

app.use((req, res, next) => {
  const startTime = Date.now();
  const requestId = logger.createRequestId();
  req.requestId = requestId;
  res.locals.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  logger.info('API_REQUEST_START', 'Incoming request', logger.buildRequestSummary(req));

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const userLabel = req.user?.username || req.user?.email || 'guest';
    logger.info('API_REQUEST_END', 'Completed request', {
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: duration,
      user: userLabel,
    });
    console.log(`→ [API] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms — ${userLabel}`);
  });

  next();
});

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
app.use('/api/projects', projectRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/polls', pollRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/memory', memoryRoutes);

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

function getAck(callback) {
  return typeof callback === 'function' ? callback : () => {};
}

function emitSocketError(socket, ack, error, details = {}) {
  const payload = { success: false, error, ...details };
  socket.emit('error_message', payload);
  ack(payload);
}

function isFlooded(socket, ack) {
  if (!checkFlood(socket.id)) return false;
  emitSocketError(socket, ack, 'Too many actions in a short time. Please slow down.');
  return true;
}

function getRoomOnlineUsers(roomId) {
  const users = roomUsers.get(roomId);
  if (!users) return [];
  return Array.from(users.values());
}

function isSocketInRoom(roomId, socketId) {
  return Boolean(roomUsers.get(roomId)?.has(socketId));
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
    memoryRefs: msg.memoryRefs || [],
    modelId: msg.modelId || null,
    provider: msg.provider || null,
  };
}

async function loadRoomForMember(roomId, userId, projection = 'members creatorId maxUsers aiHistory name') {
  if (!isValidObjectId(roomId)) {
    return { room: null, error: 'Invalid room ID' };
  }

  const room = await Room.findById(roomId).select(projection);
  if (!room) {
    return { room: null, error: 'Room not found' };
  }

  if (!findRoomMember(room, userId)) {
    return { room: null, error: 'Join this room before using chat actions' };
  }

  return { room, error: null };
}

function validateAttachmentPayload({ fileUrl, fileName, fileType, fileSize }) {
  return sharedValidateAttachmentPayload({ fileUrl, fileName, fileType, fileSize });
}

async function hasBlockingRelationship(userId, otherUserId) {
  if (!isValidObjectId(userId) || !isValidObjectId(otherUserId)) {
    return false;
  }

  const [user, otherUser] = await Promise.all([
    User.findById(userId).select('blockedUsers').lean(),
    User.findById(otherUserId).select('blockedUsers').lean(),
  ]);

  const userBlocked = (user?.blockedUsers || []).some((blockedId) => blockedId.toString() === otherUserId.toString());
  const otherUserBlocked = (otherUser?.blockedUsers || []).some((blockedId) => blockedId.toString() === userId.toString());

  return userBlocked || otherUserBlocked;
}

async function maybeMarkMessageDelivered(message, roomId) {
  const otherUsersOnline = getRoomOnlineUsers(roomId).some((user) => user.id !== message.userId);
  if (!otherUsersOnline || message.status !== 'sent') {
    return;
  }

  message.status = 'delivered';
  await message.save();

  io.to(roomId).emit('message_status_update', {
    messageId: message._id.toString(),
    status: 'delivered',
  });
}

// -- Socket.IO connection handler --

io.on('connection', async (socket) => {
  console.log(`✦ [SOCKET] User connected: ${socket.user.username} (${socket.id})`);

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

  // -- join_room (with auto-membership) --
  socket.on('join_room', async (roomId, callback) => {
    const ack = getAck(callback);
    if (isFlooded(socket, ack)) return;

    try {
      console.log(`→ [ROOM] ${socket.user.username} requested join_room for ${roomId}`);

      if (!isValidObjectId(roomId)) {
        return emitSocketError(socket, ack, 'Invalid room ID');
      }

      let room = await Room.findById(roomId).select('members maxUsers');
      if (!room) {
        return emitSocketError(socket, ack, 'Room not found');
      }

      // Auto-add user to room if not already a member
      if (!findRoomMember(room, socket.user.id)) {
        if (room.members.length >= room.maxUsers) {
          console.warn(`⚠ [ROOM] join_room denied for ${socket.user.username}: Room is full`);
          return emitSocketError(socket, ack, 'This room is already full');
        }

        room.members.push({
          userId: socket.user.id,
          role: 'member',
          joinedAt: new Date(),
        });
        await room.save();
        console.log(`✦ [ROOM] ${socket.user.username} auto-joined room ${roomId} via socket`);
      }

      if (isSocketInRoom(roomId, socket.id)) {
        io.to(roomId).emit('room_users', getRoomOnlineUsers(roomId));
        return ack({ success: true, roomId });
      }

      // Leave previous rooms
      const leftRooms = removeUserFromAllRooms(socket.id);
      leftRooms.forEach(({ roomId: leftRoomId, user }) => {
        clearTyping(leftRoomId, user.id);
        socket.leave(leftRoomId);
        io.to(leftRoomId).emit('user_left', { username: user.username, userId: user.id });
        io.to(leftRoomId).emit('room_users', getRoomOnlineUsers(leftRoomId));
      });

      socket.join(roomId);
      addUserToRoom(roomId, socket.id, socket.user);

      io.to(roomId).emit('user_joined', { username: socket.user.username, userId: socket.user.id });
      io.to(roomId).emit('room_users', getRoomOnlineUsers(roomId));

      // Mark unread messages as delivered
      if (room) {
        await Message.updateMany(
          { roomId, status: 'sent', userId: { $ne: socket.user.id } },
          { $set: { status: 'delivered' } }
        );
      }

      console.log(`✦ [ROOM] ${socket.user.username} joined room ${roomId}`);
      ack({ success: true, roomId });
    } catch (err) {
      console.error(`✗ [ROOM] join_room failed for ${socket.user.username}:`, err.stack || err.message);
      emitSocketError(socket, ack, 'Failed to join room');
    }
  });

  // -- leave_room --
  socket.on('leave_room', (roomId, callback) => {
    const ack = getAck(callback);
    if (isFlooded(socket, ack)) return;
    if (!roomId || !isSocketInRoom(roomId, socket.id)) {
      return emitSocketError(socket, ack, 'You are not connected to that room');
    }

    clearTyping(roomId, socket.user.id);
    const user = removeUserFromRoom(roomId, socket.id);
    socket.leave(roomId);
    if (user) {
      io.to(roomId).emit('user_left', { username: user.username, userId: user.id });
      io.to(roomId).emit('room_users', getRoomOnlineUsers(roomId));
    }
    ack({ success: true, roomId });
  });

  // -- typing_start --
  socket.on('typing_start', ({ roomId } = {}, callback) => {
    const ack = getAck(callback);
    if (isFlooded(socket, ack)) return;
    if (!roomId || !isSocketInRoom(roomId, socket.id)) {
      return emitSocketError(socket, ack, 'Join the room before sending typing updates');
    }

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

    ack({ success: true });
  });

  // -- typing_stop --
  socket.on('typing_stop', ({ roomId } = {}, callback) => {
    const ack = getAck(callback);
    if (isFlooded(socket, ack)) return;
    if (!roomId || !isSocketInRoom(roomId, socket.id)) {
      return emitSocketError(socket, ack, 'Join the room before sending typing updates');
    }
    clearTyping(roomId, socket.user.id);
    socket.to(roomId).emit('typing_stop', {
      userId: socket.user.id,
      username: socket.user.username,
    });
    ack({ success: true });
  });

  // -- mark_read (with backward-transition guard) --
  socket.on('mark_read', async ({ roomId, messageIds } = {}, callback) => {
    const ack = getAck(callback);
    if (isFlooded(socket, ack)) return;
    if (!roomId || !Array.isArray(messageIds) || messageIds.length === 0) {
      return emitSocketError(socket, ack, 'Room ID and message IDs are required');
    }

    if (!isSocketInRoom(roomId, socket.id)) {
      return emitSocketError(socket, ack, 'Join the room before marking messages as read');
    }

    const validMessageIds = messageIds.filter((messageId) => isValidObjectId(messageId));
    if (validMessageIds.length === 0) {
      return emitSocketError(socket, ack, 'No valid message IDs were provided');
    }

    try {
      // Only update messages that are not already 'read' (prevents backward transition)
      const result = await Message.updateMany(
        {
          _id: { $in: validMessageIds },
          roomId,
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
        messageIds: validMessageIds,
        readBy: socket.user.id,
        username: socket.user.username,
      });

      ack({ success: true, updatedCount: result.modifiedCount || 0 });
    } catch (err) {
      console.error('Mark read error:', err.message);
      emitSocketError(socket, ack, 'Failed to mark messages as read');
    }
  });

  // -- send_message (with membership check) --
  socket.on('send_message', async ({ roomId, content, fileUrl, fileName, fileType, fileSize }, callback) => {
    const ack = getAck(callback);
    if (isFlooded(socket, ack)) return;

    const textContent = typeof content === 'string' ? content.trim() : '';
    const hasFile = Boolean(fileUrl || fileName || fileType || fileSize);
    const attachmentError = validateAttachmentPayload({ fileUrl, fileName, fileType, fileSize });
    if (!textContent && !hasFile) {
      return emitSocketError(socket, ack, 'Message content or a file is required');
    }
    if (textContent.length > 4000) {
      return emitSocketError(socket, ack, 'Messages must be under 4000 characters');
    }
    if (attachmentError) {
      return emitSocketError(socket, ack, attachmentError);
    }

    try {
      const { room, error } = await loadRoomForMember(roomId, socket.user.id, 'members');
      if (error) {
        return emitSocketError(socket, ack, error);
      }

      if (!isSocketInRoom(roomId, socket.id)) {
        return emitSocketError(socket, ack, 'Join the room before sending messages');
      }

      clearTyping(roomId, socket.user.id);
      socket.to(roomId).emit('typing_stop', { userId: socket.user.id, username: socket.user.username });

      const msg = new Message({
        roomId,
        userId: socket.user.id,
        username: socket.user.username,
        content: textContent || fileName,
        isAI: false,
        status: 'sent',
        reactions: new Map(),
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileType: fileType || null,
        fileSize: fileSize || null,
      });
      await msg.save();

      // Memory extraction is only performed when @ai is triggered via room_ai_chat

      await maybeMarkMessageDelivered(msg, roomId);
      await refreshRoomInsight(roomId);
      const messageData = formatMessage(msg);
      io.to(roomId).emit('receive_message', messageData);

      ack({ success: true, messageId: msg._id.toString(), message: messageData, roomMemberCount: room.members.length });
    } catch (err) {
      console.error('Send message error:', err);
      emitSocketError(socket, ack, 'Failed to send message');
    }
  });

  // -- reply_message (with membership check) --
  socket.on('reply_message', async ({ roomId, content, replyToId }, callback) => {
    const ack = getAck(callback);
    if (isFlooded(socket, ack)) return;

    const textContent = typeof content === 'string' ? content.trim() : '';
    if (!textContent) return emitSocketError(socket, ack, 'Content is required');
    if (textContent.length > 4000) return emitSocketError(socket, ack, 'Replies must be under 4000 characters');

    try {
      const { error } = await loadRoomForMember(roomId, socket.user.id, 'members');
      if (error) return emitSocketError(socket, ack, error);
      if (!isSocketInRoom(roomId, socket.id)) {
        return emitSocketError(socket, ack, 'Join the room before replying');
      }

      clearTyping(roomId, socket.user.id);

      let replyTo = null;
      if (replyToId) {
        if (!isValidObjectId(replyToId)) {
          return emitSocketError(socket, ack, 'Invalid reply target');
        }

        const parentMsg = await Message.findById(replyToId).lean();
        if (!parentMsg || parentMsg.roomId.toString() !== roomId.toString()) {
          return emitSocketError(socket, ack, 'Reply target was not found in this room');
        }

        if (await hasBlockingRelationship(socket.user.id, parentMsg.userId)) {
          return emitSocketError(socket, ack, 'You cannot reply because one of you has blocked the other');
        }

        replyTo = {
          id: parentMsg._id.toString(),
          username: parentMsg.username,
          content: parentMsg.isDeleted ? '[deleted]' : parentMsg.content.substring(0, 100),
        };
      }

      const msg = new Message({
        roomId,
        userId: socket.user.id,
        username: socket.user.username,
        content: textContent,
        isAI: false,
        replyTo,
        status: 'sent',
        reactions: new Map(),
      });
      await msg.save();

      // Memory extraction is only performed when @ai is triggered via room_ai_chat

      await maybeMarkMessageDelivered(msg, roomId);
      await refreshRoomInsight(roomId);
      const messageData = formatMessage(msg);
      io.to(roomId).emit('receive_message', messageData);
      ack({ success: true, messageId: msg._id.toString(), message: messageData });
    } catch (err) {
      console.error('Reply message error:', err);
      emitSocketError(socket, ack, 'Failed to send reply');
    }
  });

  // -- add_reaction (with membership check) --
  socket.on('add_reaction', async ({ roomId, messageId, emoji }, callback) => {
    const ack = getAck(callback);
    if (isFlooded(socket, ack)) return;

    try {
      if (!isValidObjectId(roomId) || !isValidObjectId(messageId)) {
        return emitSocketError(socket, ack, 'Invalid room or message ID');
      }

      if (!ALLOWED_REACTIONS.has(emoji)) {
        return emitSocketError(socket, ack, 'Unsupported reaction');
      }

      const { error } = await loadRoomForMember(roomId, socket.user.id, 'members');
      if (error) {
        return emitSocketError(socket, ack, error);
      }

      const msg = await Message.findById(messageId);
      if (!msg || msg.roomId.toString() !== roomId.toString()) {
        return emitSocketError(socket, ack, 'Message not found in this room');
      }
      if (msg.isDeleted) return emitSocketError(socket, ack, 'Cannot react to a deleted message');

      if (await hasBlockingRelationship(socket.user.id, msg.userId)) {
        return emitSocketError(socket, ack, 'You cannot react because one of you has blocked the other');
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
      ack({ success: true, messageId, reactions: reactionsObj });
    } catch (err) {
      console.error('Reaction error:', err);
      emitSocketError(socket, ack, 'Failed to update reaction');
    }
  });

  // -- trigger_ai (with membership check and throttle) --
  socket.on('trigger_ai', async ({ roomId, prompt, modelId, attachment }, callback) => {
    const ack = getAck(callback);
    if (isFlooded(socket, ack)) return;
    const requestedModel = resolveModel(modelId);

    if (!prompt || prompt.trim().length === 0) return emitSocketError(socket, ack, 'Prompt is required');
    if (prompt.trim().length > 4000) return emitSocketError(socket, ack, 'Prompt must be under 4000 characters');
    const attachmentError = validateAttachmentPayload(attachment || {});
    if (attachmentError) return emitSocketError(socket, ack, attachmentError);

    io.to(roomId).emit('ai_thinking', { roomId, status: true });

    try {
      const quota = consumeAiQuota(`user:${socket.user.id}`);
      if (!quota.allowed) {
        io.to(roomId).emit('ai_thinking', { roomId, status: false });
        return emitSocketError(socket, ack, 'AI request limit reached. Please wait a few minutes.');
      }

      const { room, error } = await loadRoomForMember(roomId, socket.user.id, 'members creatorId maxUsers aiHistory name');
      if (error) {
        io.to(roomId).emit('ai_thinking', { roomId, status: false });
        return emitSocketError(socket, ack, error);
      }

      if (!isSocketInRoom(roomId, socket.id)) {
        io.to(roomId).emit('ai_thinking', { roomId, status: false });
        return emitSocketError(socket, ack, 'Join the room before using AI');
      }

      const [memoryEntries, insight] = await Promise.all([
        retrieveRelevantMemories({
          userId: socket.user.id,
          query: prompt.trim(),
          limit: 5,
        }),
        getRoomInsight(roomId),
      ]);

      await upsertMemoryEntries({
        userId: socket.user.id,
        text: prompt.trim(),
        sourceType: 'room',
        sourceRoomId: roomId,
      });

      console.log(`→ [AI] Trigger from ${socket.user.username} in room ${room.name} using ${requestedModel?.id || 'fallback/offline'} via ${requestedModel?.provider || 'fallback'}`);

      const response = await sendGroupMessage(room.aiHistory, prompt.trim(), socket.user.username, {
        memoryEntries,
        insight,
        roomName: room.name,
        modelId,
        attachment,
      });

      // Update AI history in room
      room.aiHistory.push({ role: 'user', parts: [{ text: `[${socket.user.username} asks]: ${prompt.trim()}` }] });
      room.aiHistory.push({ role: 'model', parts: [{ text: response.content }] });

      // Trim AI history to last 40 entries + system prompt
      if (room.aiHistory.length > 42) {
        room.aiHistory = [room.aiHistory[0], room.aiHistory[1], ...room.aiHistory.slice(-38)];
      }
      await room.save();

      // Persist AI message
      const aiMsg = new Message({
        roomId,
        userId: 'ai',
        username: AI_USERNAME,
        content: response.content,
        isAI: true,
        triggeredBy: socket.user.username,
        status: 'delivered',
        reactions: new Map(),
        modelId: response.model.id,
        provider: response.model.provider,
        memoryRefs: memoryEntries.slice(0, 5).map((entry) => ({
          id: entry._id.toString(),
          summary: entry.summary,
          score: entry.score,
        })),
      });
      await aiMsg.save();
      await markMemoriesUsed(memoryEntries);
      await refreshRoomInsight(roomId);

      console.log(`✦ [AI] Room response ready from ${response.model.id} via ${response.model.provider} (${response.content.length} chars)`);
      io.to(roomId).emit('ai_thinking', { roomId, status: false });
      const aiMessage = formatMessage(aiMsg);
      io.to(roomId).emit('ai_response', aiMessage);
      ack({ success: true, message: aiMessage });
    } catch (err) {
      const failedModel = err?.model || requestedModel;
      console.error(`✗ [AI] trigger_ai failed for ${socket.user.username} with ${failedModel?.id || 'fallback/offline'} via ${failedModel?.provider || 'fallback'}:`, err.stack || err.message);
      io.to(roomId).emit('ai_thinking', { roomId, status: false });

      const errorMsg = new Message({
        roomId,
        userId: 'ai',
        username: AI_USERNAME,
        content: 'I ran into an error while processing that request. Please try again.',
        isAI: true,
        triggeredBy: socket.user.username,
        status: 'delivered',
        reactions: new Map(),
      });
      await errorMsg.save();
      io.to(roomId).emit('ai_response', formatMessage(errorMsg));
      emitSocketError(socket, ack, 'AI request failed', {
        modelId: failedModel?.id || null,
        provider: failedModel?.provider || null,
      });
    }
  });

  // -- edit_message (within 15-min window, owner only) --
  socket.on('edit_message', async ({ roomId, messageId, newContent }, callback) => {
    const ack = getAck(callback);
    if (isFlooded(socket, ack)) return;

    if (!newContent || newContent.trim().length === 0) {
      return emitSocketError(socket, ack, 'Content is required');
    }

    if (newContent.trim().length > 4000) {
      return emitSocketError(socket, ack, 'Messages must be under 4000 characters');
    }

    try {
      const { error } = await loadRoomForMember(roomId, socket.user.id, 'members');
      if (error) return emitSocketError(socket, ack, error);
      if (!isValidObjectId(messageId)) return emitSocketError(socket, ack, 'Invalid message ID');

      const msg = await Message.findById(messageId);
      if (!msg || msg.roomId.toString() !== roomId.toString()) return emitSocketError(socket, ack, 'Message not found in this room');
      if (msg.isDeleted) return emitSocketError(socket, ack, 'Cannot edit a deleted message');
      if (msg.isAI) return emitSocketError(socket, ack, 'Cannot edit AI messages');

      // Only the author can edit
      if (msg.userId !== socket.user.id) {
        return emitSocketError(socket, ack, 'You can only edit your own messages');
      }

      if (Date.now() - msg.createdAt.getTime() > EDIT_WINDOW_MS) {
        return emitSocketError(socket, ack, 'The edit window has expired');
      }

      if (!msg.originalContent) {
        msg.originalContent = msg.content;
      }

      msg.editHistory.push({
        content: msg.content,
        editedAt: new Date(),
      });
      msg.content = newContent.trim();
      msg.isEdited = true;
      msg.editedAt = new Date();
      await msg.save();
      await refreshRoomInsight(roomId);

      io.to(roomId).emit('message_edited', {
        messageId: msg._id.toString(),
        content: msg.content,
        isEdited: true,
        editedAt: msg.editedAt,
      });

      ack({ success: true, messageId: msg._id.toString(), editedAt: msg.editedAt });
    } catch (err) {
      console.error('Edit message error:', err);
      emitSocketError(socket, ack, 'Failed to edit message');
    }
  });

  // -- delete_message (soft delete — owner or moderator/admin) --
  socket.on('delete_message', async ({ roomId, messageId }, callback) => {
    const ack = getAck(callback);
    if (isFlooded(socket, ack)) return;

    try {
      if (!isValidObjectId(messageId) || !isValidObjectId(roomId)) {
        return emitSocketError(socket, ack, 'Invalid room or message ID');
      }

      const room = await Room.findById(roomId).select('members creatorId pinnedMessages');
      if (!room || !findRoomMember(room, socket.user.id)) {
        return emitSocketError(socket, ack, 'Join this room before deleting messages');
      }

      const msg = await Message.findById(messageId);
      if (!msg || msg.roomId.toString() !== roomId.toString()) return emitSocketError(socket, ack, 'Message not found in this room');
      if (msg.isDeleted) return emitSocketError(socket, ack, 'This message has already been deleted');

      const isOwner = msg.userId === socket.user.id;
      const isModOrAdmin = hasRoomRole(room, socket.user.id, ['admin', 'moderator']);

      if (!isOwner && !isModOrAdmin) {
        return emitSocketError(socket, ack, 'You can only delete your own messages unless you moderate this room');
      }

      msg.isDeleted = true;
      msg.deletedAt = new Date();
      msg.deletedBy = socket.user.id;
      msg.isPinned = false;
      msg.pinnedBy = null;
      msg.pinnedAt = null;
      await msg.save();

      room.pinnedMessages = room.pinnedMessages.filter((id) => id.toString() !== messageId.toString());
      await room.save();
      await refreshRoomInsight(roomId);

      io.to(roomId).emit('message_deleted', {
        messageId: msg._id.toString(),
        deletedBy: socket.user.username,
      });

      ack({ success: true, messageId: msg._id.toString() });
    } catch (err) {
      console.error('Delete message error:', err);
      emitSocketError(socket, ack, 'Failed to delete message');
    }
  });

  // -- pin_message (admin/moderator/creator only) --
  socket.on('pin_message', async ({ roomId, messageId }, callback) => {
    const ack = getAck(callback);
    if (isFlooded(socket, ack)) return;

    try {
      if (!isValidObjectId(messageId) || !isValidObjectId(roomId)) {
        return emitSocketError(socket, ack, 'Invalid room or message ID');
      }

      const room = await Room.findById(roomId).select('members creatorId pinnedMessages');
      if (!room || !findRoomMember(room, socket.user.id)) {
        return emitSocketError(socket, ack, 'Join this room before pinning messages');
      }

      // Check permissions (any member can pin for now — simple approach)
      if (!isSocketInRoom(roomId, socket.id)) {
        return emitSocketError(socket, ack, 'Join the room before pinning messages');
      }

      if (!hasRoomRole(room, socket.user.id, ['admin', 'moderator'])) {
        return emitSocketError(socket, ack, 'Only room moderators can pin messages');
      }

      const msg = await Message.findById(messageId);
      if (!msg || msg.roomId.toString() !== roomId.toString()) {
        return emitSocketError(socket, ack, 'Message not found in this room');
      }

      if (msg.isDeleted) {
        return emitSocketError(socket, ack, 'Deleted messages cannot be pinned');
      }

      msg.isPinned = true;
      msg.pinnedBy = socket.user.username;
      msg.pinnedAt = new Date();
      await msg.save();

      if (!room.pinnedMessages.some((id) => id.toString() === messageId.toString())) {
        room.pinnedMessages.push(msg._id);
        await room.save();
      }

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

      ack({ success: true, messageId });
    } catch (err) {
      console.error('Pin message error:', err);
      emitSocketError(socket, ack, 'Failed to pin message');
    }
  });

  // -- unpin_message --
  socket.on('unpin_message', async ({ roomId, messageId }, callback) => {
    const ack = getAck(callback);
    if (isFlooded(socket, ack)) return;

    try {
      if (!isValidObjectId(messageId) || !isValidObjectId(roomId)) {
        return emitSocketError(socket, ack, 'Invalid room or message ID');
      }

      const room = await Room.findById(roomId).select('members creatorId pinnedMessages');
      if (!room || !findRoomMember(room, socket.user.id)) {
        return emitSocketError(socket, ack, 'Join this room before unpinning messages');
      }

      if (!isSocketInRoom(roomId, socket.id)) {
        return emitSocketError(socket, ack, 'Join the room before unpinning messages');
      }

      if (!hasRoomRole(room, socket.user.id, ['admin', 'moderator'])) {
        return emitSocketError(socket, ack, 'Only room moderators can unpin messages');
      }

      const msg = await Message.findById(messageId);
      if (msg && msg.roomId.toString() === roomId.toString()) {
        msg.isPinned = false;
        msg.pinnedBy = null;
        msg.pinnedAt = null;
        await msg.save();
      }

      room.pinnedMessages = room.pinnedMessages.filter((id) => id.toString() !== messageId.toString());
      await room.save();

      io.to(roomId).emit('message_unpinned', { messageId });
      ack({ success: true, messageId });
    } catch (err) {
      console.error('Unpin message error:', err);
      emitSocketError(socket, ack, 'Failed to unpin message');
    }
  });

  // -- disconnect --
  socket.on('disconnect', async () => {
    console.log(`→ [SOCKET] User disconnected: ${socket.user.username} (${socket.id})`);

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
  await refreshModelCatalogs().catch(() => {});
  const configuredModels = getAvailableModels({ includeFallback: false });
  const providerCounts = configuredModels.reduce((accumulator, model) => {
    accumulator[model.provider] = (accumulator[model.provider] || 0) + 1;
    return accumulator;
  }, {});

  await new Promise((resolve, reject) => {
    const handleError = (error) => {
      server.off('listening', handleListening);
      reject(error);
    };

    const handleListening = () => {
      server.off('error', handleError);
      resolve();
    };

    server.once('error', handleError);
    server.once('listening', handleListening);
    server.listen(PORT);
  });

  console.log(`\n✦ ChatSphere server running on port ${PORT}`);
  console.log(`  → API:      http://localhost:${PORT}/api`);
  console.log(`  → Socket:   ws://localhost:${PORT}`);
  console.log(`  → Client:   ${CLIENT_URL}`);
  console.log(`  → Database: MongoDB`);
  if (configuredModels.length === 0) {
    console.log('⚠ [AI] No provider-backed AI models are configured. Add API keys in backend/.env');
  } else {
    console.log('→ [AI] Available models loaded:');
    console.log(`  total models: ${configuredModels.length}`);
    Object.entries(providerCounts).forEach(([provider, count]) => {
      console.log(`  - ${provider}: ${count}`);
    });
  }
  console.log();
}

startServer().catch((err) => {
  if (err?.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the existing process using port ${PORT}, or change PORT in backend/.env.`);
  } else {
    console.error('Failed to start server:', err);
  }
  process.exit(1);
});
