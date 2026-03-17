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

// Middleware
const socketAuthMiddleware = require('./middleware/socketAuth');

// Models
const Room = require('./models/Room');
const Message = require('./models/Message');

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

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.user.username} (${socket.id})`);

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

  // send_message — persist to MongoDB
  socket.on('send_message', async ({ roomId, content }) => {
    if (!content || content.trim().length === 0) return;

    try {
      const msg = new Message({
        roomId,
        userId: socket.user.id,
        username: socket.user.username,
        content: content.trim(),
        isAI: false,
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
      };

      io.to(roomId).emit('receive_message', messageData);
    } catch (err) {
      console.error('Send message error:', err);
    }
  });

  // reply_message — persist to MongoDB
  socket.on('reply_message', async ({ roomId, content, replyToId }) => {
    if (!content || content.trim().length === 0) return;

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
      });
    }
  });

  // disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.user.username} (${socket.id})`);
    const leftRooms = removeUserFromAllRooms(socket.id);
    leftRooms.forEach(({ roomId, user }) => {
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
