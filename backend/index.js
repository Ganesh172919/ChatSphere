require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
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

// Middleware
const socketAuthMiddleware = require('./middleware/socketAuth');

// Models
const Room = require('./models/Room');
const Message = require('./models/Message');
const User = require('./models/User');

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

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/search', searchRoutes);

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

// Track online users per room: Map<roomId, Map<socketId, {id, username}>>
const roomUsers = new Map();
// Track global online users: Map<userId, {socketId, username}>
const globalOnlineUsers = new Map();
// Track typing state: Map<roomId, Map<userId, {username, timeout}>>
const typingUsers = new Map();

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

  // authenticate
  socket.on('authenticate', (callback) => {
    if (typeof callback === 'function') {
      callback({ success: true, user: socket.user });
    }
  });

  // join_room
  socket.on('join_room', async (roomId) => {
    try {
      const room = await Room.findById(roomId);
      if (!room) {
        socket.emit('error_message', { error: 'Room not found' });
        return;
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

      // Mark unread messages in this room as delivered for this user
      try {
        await Message.updateMany(
          { roomId, status: 'sent', userId: { $ne: socket.user.id } },
          { $set: { status: 'delivered' } }
        );
      } catch (err) {
        console.error('Mark delivered error:', err.message);
      }
    } catch (err) {
      console.error('Join room error:', err);
      socket.emit('error_message', { error: 'Failed to join room' });
    }
  });

  // leave_room
  socket.on('leave_room', (roomId) => {
    const user = removeUserFromRoom(roomId, socket.id);
    socket.leave(roomId);
    if (user) {
      io.to(roomId).emit('user_left', { username: user.username, userId: user.id });
      io.to(roomId).emit('room_users', getRoomOnlineUsers(roomId));
    }
  });

  // typing_start — broadcast typing indicator
  socket.on('typing_start', ({ roomId }) => {
    if (!roomId) return;

    // Clear existing timeout
    clearTyping(roomId, socket.user.id);

    // Set timeout to auto-stop typing after 3 seconds
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

  // typing_stop — broadcast stop typing
  socket.on('typing_stop', ({ roomId }) => {
    if (!roomId) return;
    clearTyping(roomId, socket.user.id);
    socket.to(roomId).emit('typing_stop', {
      userId: socket.user.id,
      username: socket.user.username,
    });
  });

  // mark_read — mark messages as read
  socket.on('mark_read', async ({ roomId, messageIds }) => {
    if (!roomId || !messageIds || !Array.isArray(messageIds)) return;

    try {
      await Message.updateMany(
        { _id: { $in: messageIds }, userId: { $ne: socket.user.id } },
        {
          $set: { status: 'read' },
          $addToSet: {
            readBy: { userId: socket.user.id, readAt: new Date() },
          },
        }
      );

      // Notify the room about read receipts
      io.to(roomId).emit('message_read', {
        messageIds,
        readBy: socket.user.id,
        username: socket.user.username,
      });
    } catch (err) {
      console.error('Mark read error:', err.message);
    }
  });

  // send_message — persist to MongoDB
  socket.on('send_message', async ({ roomId, content }) => {
    if (!content || content.trim().length === 0) return;

    // Clear typing state
    clearTyping(roomId, socket.user.id);
    socket.to(roomId).emit('typing_stop', {
      userId: socket.user.id,
      username: socket.user.username,
    });

    try {
      const msg = new Message({
        roomId,
        userId: socket.user.id,
        username: socket.user.username,
        content: content.trim(),
        isAI: false,
        status: 'sent',
        reactions: new Map(),
      });
      await msg.save();

      const messageData = {
        id: msg._id.toString(),
        userId: msg.userId,
        username: msg.username,
        content: msg.content,
        timestamp: msg.createdAt,
        reactions: {},
        replyTo: null,
        isAI: false,
        status: 'sent',
      };

      io.to(roomId).emit('receive_message', messageData);

      // Mark as delivered for users in the room (excluding sender)
      const roomOnline = getRoomOnlineUsers(roomId);
      if (roomOnline.length > 1) {
        msg.status = 'delivered';
        await msg.save();
        io.to(roomId).emit('message_status_update', {
          messageId: msg._id.toString(),
          status: 'delivered',
        });
      }
    } catch (err) {
      console.error('Send message error:', err);
    }
  });

  // reply_message — persist to MongoDB
  socket.on('reply_message', async ({ roomId, content, replyToId }) => {
    if (!content || content.trim().length === 0) return;

    // Clear typing state
    clearTyping(roomId, socket.user.id);

    try {
      let replyTo = null;
      if (replyToId) {
        const parentMsg = await Message.findById(replyToId).lean();
        if (parentMsg) {
          replyTo = {
            id: parentMsg._id.toString(),
            username: parentMsg.username,
            content: parentMsg.content.substring(0, 100),
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

      const messageData = {
        id: msg._id.toString(),
        userId: msg.userId,
        username: msg.username,
        content: msg.content,
        timestamp: msg.createdAt,
        reactions: {},
        replyTo,
        isAI: false,
        status: 'sent',
      };

      io.to(roomId).emit('receive_message', messageData);
    } catch (err) {
      console.error('Reply message error:', err);
    }
  });

  // add_reaction — persist to MongoDB
  socket.on('add_reaction', async ({ roomId, messageId, emoji }) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg) return;

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
    } catch (err) {
      console.error('Reaction error:', err);
    }
  });

  // trigger_ai
  socket.on('trigger_ai', async ({ roomId, prompt }) => {
    if (!prompt || prompt.trim().length === 0) return;

    io.to(roomId).emit('ai_thinking', { roomId, status: true });

    try {
      const room = await Room.findById(roomId);
      if (!room) {
        io.to(roomId).emit('ai_thinking', { roomId, status: false });
        return;
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

      const aiMessageData = {
        id: aiMsg._id.toString(),
        userId: 'ai',
        username: 'GeminiX',
        content: responseText,
        timestamp: aiMsg.createdAt,
        reactions: {},
        replyTo: null,
        isAI: true,
        triggeredBy: socket.user.username,
        status: 'delivered',
      };

      io.to(roomId).emit('ai_thinking', { roomId, status: false });
      io.to(roomId).emit('ai_response', aiMessageData);
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

      io.to(roomId).emit('ai_response', {
        id: errorMsg._id.toString(),
        userId: 'ai',
        username: 'GeminiX',
        content: errorMsg.content,
        timestamp: errorMsg.createdAt,
        reactions: {},
        replyTo: null,
        isAI: true,
        triggeredBy: socket.user.username,
        status: 'delivered',
      });
    }
  });

  // pin_message — via socket for real-time updates
  socket.on('pin_message', async ({ roomId, messageId }) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg || msg.roomId.toString() !== roomId) return;

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
    } catch (err) {
      console.error('Pin message error:', err);
    }
  });

  // unpin_message
  socket.on('unpin_message', async ({ roomId, messageId }) => {
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
    } catch (err) {
      console.error('Unpin message error:', err);
    }
  });

  // disconnect
  socket.on('disconnect', async () => {
    console.log(`User disconnected: ${socket.user.username} (${socket.id})`);

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
      // Clear any typing state
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
    console.log(`  → Database: MongoDB Atlas`);
    console.log();
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
