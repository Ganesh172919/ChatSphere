# ChatSphere - Full Stack Real-Time Chat Application

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-22+-339933?style=for-the-badge&logo=node.js" alt="Node.js">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker" alt="Docker">
  <img src="https://img.shields.io/badge/TailwindCSS-3-06B6D1?style=for-the-badge&logo=tailwind-css" alt="TailwindCSS">
</p>

A modern, feature-rich real-time chat application built with **Express.js + Socket.IO** backend and **React + Vite** frontend with a beautiful dark-themed UI.

## 📑 Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Features](#features)
4. [Quick Start](#quick-start)
5. [Project Structure](#project-structure)
6. [Architecture](#architecture)
7. [API Documentation](#api-documentation)
8. [Database Schema](#database-schema)
9. [WebSocket Events](#websocket-events)
10. [Environment Variables](#environment-variables)
11. [Development](#development)
12. [Deployment](#deployment)
13. [Security](#security)
14. [Troubleshooting](#troubleshooting)

---

## 1. Overview

ChatSphere is a full-featured real-time chat application with:

- **User Authentication** - Email/password + Google OAuth with JWT
- **Real-Time Messaging** - Instant message delivery via Socket.IO
- **Chat Rooms** - Create and manage public/private rooms
- **AI Integration** - AI chat, smart replies, insights
- **Memory System** - Auto-extract and search memories
- **File Management** - Secure file uploads/downloads
- **Modern UI** - Beautiful dark theme with purple accents

---

## 2. Tech Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 22+ | Runtime environment |
| Express.js | 5.x | HTTP web framework |
| Socket.IO | 4.x | Real-time WebSocket communication |
| Prisma | 7.x | ORM (Object-Relational Mapper) |
| PostgreSQL | 16+ | Primary database |
| Zod | 4.x | Request validation |
| JWT (jsonwebtoken) | 9.x | Authentication tokens |
| bcryptjs | 3.x | Password hashing |
| Pino | 10.x | Structured logging |
| Helmet | 8.x | Security HTTP headers |
| google-auth-library | 10.x | Google OAuth verification |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.x | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 6.x | Build tool & dev server |
| TailwindCSS | 3.x | Utility-first CSS framework |
| Zustand | 5.x | State management |
| React Router | 7.x | Client-side routing |
| Socket.IO Client | 4.x | Real-time client |
| Axios | 1.x | HTTP client |
| Lucide React | 0.468+ | Icon library |
| React Hot Toast | 2.x | Toast notifications |
| date-fns | 4.x | Date utilities |

---

## 3. Features

### Authentication & Security
- Email/password registration and login
- JWT-based authentication with access + refresh tokens
- Refresh token rotation with SHA-256 hashing
- Google OAuth support
- Secure password hashing (bcrypt, 12 salt rounds)
- Rate limiting (global + auth-specific)
- Input validation with Zod schemas
- CORS with credentials support
- Helmet security headers

### Real-Time Chat
- Instant message delivery via Socket.IO
- Typing indicators
- Online presence tracking
- Read receipts
- Message reactions (👍 🔥 🤯 💡)
- Message editing and deletion
- Pinned messages
- Reply/thread support

### Rooms & Messaging
- Create public/private/internal rooms
- Room membership with roles (Owner, Admin, Member)
- Room tags and descriptions
- Message search within rooms
- File attachments

### AI Features
- AI chat with conversation history
- Smart reply suggestions
- Text insights generation
- Pluggable AI provider system (Mock, OpenAI, OpenRouter)

### Memory System
- Auto-extract memories from chat
- Keyword-based relevance ranking
- Search and browse memories
- Score-based prioritization

### UI/UX
- Beautiful dark theme with purple accent (#6c5ce7)
- Responsive design
- Smooth animations
- Toast notifications
- Real-time updates

---

## 4. Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd rebuild-project

# Start the entire stack
docker compose up -d

# Access the application
# Frontend: http://localhost
# Backend API: http://localhost:4000
# API Health: http://localhost:4000/api/health
```

### Option 2: Local Development

```bash
# Install backend dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate:deploy

# Start backend (port 4000)
npm run dev

# In another terminal, start frontend
cd frontend
npm install
npm run dev
```

### Option 3: Using the Start Script (Windows)

```powershell
# Run the start script
.\scripts\start-all.bat
```

---

## 5. Project Structure

```
rebuild-project/
├── src/                          # Backend source code
│   ├── config/                   # Configuration files
│   │   ├── env.ts                # Environment validation
│   │   ├── prisma.ts             # Prisma client singleton
│   │   └── logger.ts             # Pino logger
│   ├── modules/                  # Feature modules
│   │   ├── auth/                 # Authentication
│   │   │   ├── auth.routes.ts     # Route definitions
│   │   │   ├── auth.controller.ts # Request handlers
│   │   │   ├── auth.service.ts    # Business logic
│   │   │   └── auth.schemas.ts   # Zod validation schemas
│   │   ├── users/                # User management
│   │   ├── rooms/                # Chat rooms & messaging
│   │   ├── files/                # File uploads
│   │   ├── ai/                   # AI integration
│   │   ├── memory/               # Memory system
│   │   └── health/               # Health checks
│   ├── services/                 # Business logic services
│   │   ├── auth/                 # Auth services (token, password, google)
│   │   ├── rooms/                # Room authorization
│   │   ├── files/                # File storage
│   │   ├── memory/               # Memory ranking
│   │   └── ai/                  # AI providers
│   ├── socket/                   # Socket.IO handlers
│   ├── middleware/               # Express middleware
│   │   ├── auth.ts               # JWT authentication
│   │   ├── error-handler.ts      # Error handling
│   │   ├── rate-limit.ts         # Rate limiting
│   │   └── request-logger.ts     # Request logging
│   ├── helpers/                  # Utility functions
│   │   ├── api-response.ts       # Response formatting
│   │   ├── app-error.ts          # Custom error class
│   │   ├── async-handler.ts      # Async wrapper
│   │   ├── validation.ts         # Zod validation
│   │   ├── slug.ts               # Slug generation
│   │   └── time.ts               # Date utilities
│   ├── types/                    # TypeScript types
│   ├── server.ts                 # Entry point
│   ├── app.ts                    # Express app factory
│   └── generated/                # Prisma generated client
├── frontend/                     # Frontend source code
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/             # Auth forms (Login, Register)
│   │   │   ├── chat/             # Chat components
│   │   │   │   ├── MessageList.tsx
│   │   │   │   ├── MessageBubble.tsx
│   │   │   │   ├── MessageInput.tsx
│   │   │   │   ├── AIPanel.tsx
│   │   │   │   ├── MemoryPanel.tsx
│   │   │   │   ├── MembersPanel.tsx
│   │   │   │   └── ReactionPicker.tsx
│   │   │   ├── layout/            # Layout components
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── ChatHeader.tsx
│   │   │   │   └── ChatLayout.tsx
│   │   │   └── modals/            # Modal dialogs
│   │   │       ├── CreateRoomModal.tsx
│   │   │       └── SearchModal.tsx
│   │   ├── hooks/                # Custom React hooks
│   │   │   ├── use-socket.ts     # Socket.IO integration
│   │   │   └── use-typing.ts    # Typing indicators
│   │   ├── lib/                  # Utilities
│   │   │   ├── api-client.ts     # Axios instance
│   │   │   ├── socket-client.ts  # Socket.IO client
│   │   │   └── utils.ts          # Helper functions
│   │   ├── stores/               # Zustand stores
│   │   │   ├── auth-store.ts     # Authentication state
│   │   │   ├── room-store.ts     # Rooms & messages
│   │   │   ├── ai-store.ts       # AI & memory state
│   │   │   └── file-store.ts     # File uploads
│   │   ├── pages/                # Page components
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── ChatPage.tsx
│   │   │   ├── SettingsPage.tsx
│   │   │   └── NotFoundPage.tsx
│   │   ├── types/                # TypeScript types
│   │   ├── App.tsx              # Root component
│   │   ├── main.tsx             # Entry point
│   │   └── index.css             # Global styles
│   ├── public/                  # Static assets
│   ├── index.html               # HTML template
│   ├── vite.config.ts           # Vite configuration
│   ├── tailwind.config.js       # Tailwind configuration
│   ├── postcss.config.js        # PostCSS configuration
│   ├── Dockerfile              # Frontend Docker image
│   └── nginx.conf              # Nginx configuration
├── prisma/                      # Database schema
│   ├── schema.prisma            # Database schema
│   ├── migrations/              # Migration files
│   └── config.ts               # Prisma configuration
├── scripts/                     # Run scripts
│   ├── start-all.bat           # Windows start script
│   ├── dev.bat                 # Windows dev script
│   ├── docker-start.bat        # Docker start script
│   └── dev.sh                  # Unix dev script
├── docker-compose.yml           # Full stack Docker setup
├── Dockerfile                  # Backend Docker image
├── package.json                # Backend dependencies
├── tsconfig.json               # TypeScript configuration
├── .env                        # Environment variables
└── README.md                   # This file
```

---

## 6. Architecture

### Backend Architecture

The backend follows a **modular monolith** architecture with clear separation of concerns:

```
Request → Middleware → Route → Controller → Service → Database
         ↓
    Error Handler
```

**Middleware Pipeline:**
1. Helmet (security headers)
2. CORS
3. Request Logger
4. Rate Limiter
5. Body Parser
6. Cookie Parser
7. Route Handler
8. Error Handler

**Module Structure:**
Each feature module follows the same pattern:
- `*.routes.ts` - Route definitions
- `*.controller.ts` - Request handlers
- `*.service.ts` - Business logic
- `*.schemas.ts` - Zod validation schemas

### Frontend Architecture

The frontend uses a **component-based** architecture with Zustand for state management:

```
Pages
  ↓
Components (Layout, Chat, Auth, Modals)
  ↓
Hooks (useSocket, useTyping)
  ↓
Stores (auth-store, room-store, ai-store)
  ↓
API Client (Axios + Socket.IO)
```

---

## 7. API Documentation

### Authentication Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login with email/password |
| POST | `/api/auth/refresh` | No | Refresh access token |
| POST | `/api/auth/logout` | No | Revoke refresh token |
| POST | `/api/auth/google` | No | Google OAuth login |
| GET | `/api/auth/me` | Yes | Get current user |

**Request/Response Formats:**

```typescript
// POST /api/auth/register
// Request:
{
  "email": "user@example.com",
  "username": "username",
  "password": "password123",
  "displayName": "Display Name" // optional
}

// Response (201):
{
  "success": true,
  "data": {
    "user": { ... },
    "tokens": {
      "accessToken": "eyJ...",
      "refreshToken": "eyJ..."
    }
  }
}
```

### User Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users/me` | Yes | Get my profile |
| PATCH | `/api/users/me` | Yes | Update profile |
| PATCH | `/api/users/me/settings` | Yes | Update settings |
| GET | `/api/users/:userId/profile` | Yes | Get user profile |

### Room Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/rooms` | Yes | List my rooms |
| POST | `/api/rooms` | Yes | Create room |
| GET | `/api/rooms/:roomId` | Yes | Get room details |
| POST | `/api/rooms/:roomId/members` | Yes | Add member |
| DELETE | `/api/rooms/:roomId/members/me` | Yes | Leave room |
| GET | `/api/rooms/:roomId/messages` | Yes | List messages |
| POST | `/api/rooms/:roomId/messages` | Yes | Send message |
| PATCH | `/api/rooms/:roomId/messages/:messageId` | Yes | Edit message |
| DELETE | `/api/rooms/:roomId/messages/:messageId` | Yes | Delete message |
| POST | `/api/rooms/:roomId/messages/:messageId/reactions` | Yes | Toggle reaction |
| POST | `/api/rooms/:roomId/messages/:messageId/pin` | Yes | Pin message |
| POST | `/api/rooms/:roomId/messages/read` | Yes | Mark as read |
| GET | `/api/rooms/search/messages` | Yes | Search messages |

### File Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/files/upload` | Yes | Upload file |
| GET | `/api/files/:fileId/download` | Yes | Download file |

### AI Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/ai/chat` | Yes | Chat with AI |
| POST | `/api/ai/smart-replies` | Yes | Get smart replies |
| POST | `/api/ai/insights` | Yes | Generate insights |

### Memory Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/memory` | Yes | List memories |
| POST | `/api/memory` | Yes | Create memory |
| POST | `/api/memory/extract` | Yes | Extract from content |

### Health Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | No | Root info |
| GET | `/api/health` | No | Health check |

---

## 8. Database Schema

### Core Models

```prisma
model User {
  id                       String   @id @default(cuid())
  email                    String   @unique
  username                 String   @unique
  passwordHash             String?
  googleId                 String?  @unique
  authProvider             AuthProvider @default(LOCAL)
  displayName              String?
  avatarUrl                String?
  bio                      String   @default("")
  isAdmin                  Boolean  @default(false)
  presenceStatus           PresenceStatus @default(OFFLINE)
  lastSeenAt               DateTime @default(now())
  themeMode                ThemeMode @default(SYSTEM)
  // ... more fields
}

model Room {
  id            String         @id @default(cuid())
  name          String
  slug          String         @unique
  description   String?
  visibility    RoomVisibility @default(PRIVATE)
  tags          String[]
  maxMembers    Int           @default(20)
  creatorId     String
  lastMessageAt DateTime?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}

model Message {
  id              String        @id @default(cuid())
  roomId          String
  authorId        String?
  authorName      String
  parentMessageId String?
  uploadId        String?
  content         String
  messageType     MessageType  @default(USER)
  status          MessageStatus @default(SENT)
  isPinned        Boolean      @default(false)
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
}

model RoomMember {
  id        String        @id @default(cuid())
  roomId    String
  userId    String
  role      RoomMemberRole @default(MEMBER)
  joinedAt  DateTime      @default(now())
}

model MessageReaction {
  id        String       @id @default(cuid())
  messageId String
  userId    String
  emoji     ReactionEmoji
  createdAt DateTime     @default(now())
}

model RefreshToken {
  id         String   @id @default(cuid())
  userId     String
  tokenHash  String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  lastUsedAt DateTime?
  revokedAt  DateTime?
}

model Upload {
  id           String            @id @default(cuid())
  ownerId      String
  roomId       String?
  storageKey   String            @unique
  originalName String
  mimeType     String
  sizeBytes   Int
  visibility   UploadVisibility @default(PRIVATE)
  createdAt    DateTime          @default(now())
}

model MemoryEntry {
  id        String       @id @default(cuid())
  userId    String
  projectId String?
  roomId    String?
  summary   String
  content   String
  keywords  String[]
  score     Int          @default(0)
  source    MemorySource @default(CHAT)
  createdAt DateTime     @default(now())
}
```

### Enums

```prisma
enum AuthProvider { LOCAL, GOOGLE }
enum PresenceStatus { ONLINE, AWAY, OFFLINE }
enum ThemeMode { LIGHT, DARK, SYSTEM }
enum RoomVisibility { PRIVATE, INTERNAL, PUBLIC }
enum RoomMemberRole { OWNER, ADMIN, MEMBER }
enum MessageType { USER, SYSTEM, AI }
enum MessageStatus { SENT, DELIVERED, READ, DELETED }
enum ReactionEmoji { THUMBS_UP, FIRE, MIND_BLOWN, IDEA }
enum UploadVisibility { PRIVATE, ROOM }
enum MemorySource { CHAT, ROOM, USER_PROFILE, SYSTEM }
```

---

## 9. WebSocket Events

### Connection

```javascript
// Connect with JWT token
const socket = io('http://localhost:4000', {
  auth: { token: 'jwt-access-token' }
});
```

### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `authenticate` | - | Confirm socket auth |
| `join_room` | `{ roomId }` | Join a room |
| `leave_room` | `{ roomId }` | Leave a room |
| `typing_start` | `{ roomId }` | Start typing |
| `typing_stop` | `{ roomId }` | Stop typing |
| `send_message` | `{ roomId, content, replyToId, uploadId }` | Send message |
| `add_reaction` | `{ roomId, messageId, emoji }` | Add reaction |
| `mark_read` | `{ roomId, messageIds }` | Mark messages read |
| `edit_message` | `{ roomId, messageId, newContent }` | Edit message |
| `delete_message` | `{ roomId, messageId }` | Delete message |
| `pin_message` | `{ roomId, messageId }` | Pin message |
| `trigger_ai` | `{ roomId, prompt, modelId }` | Trigger AI |

### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `receive_message` | `Message` | New message |
| `message_edited` | `Message` | Message edited |
| `message_deleted` | `Message` | Message deleted |
| `reaction_update` | `Message` | Reaction changed |
| `message_pinned` | `Message` | Message pinned |
| `message_unpinned` | `Message` | Message unpinned |
| `typing_start` | `{ roomId, userId, username }` | User started typing |
| `typing_stop` | `{ roomId, userId }` | User stopped typing |
| `user_joined` | `{ roomId, userId }` | User joined room |
| `user_left` | `{ roomId, userId }` | User left room |
| `room_users` | `User[]` | Users in room |
| `user_status_change` | `{ userId, status }` | User status changed |
| `message_read` | `{ roomId, userId, receipts }` | Messages read |
| `ai_thinking` | `{ roomId, status }` | AI processing |
| `ai_response` | `Message` | AI response |

---

## 10. Environment Variables

### Required Variables

```env
# Server
NODE_ENV=development
PORT=4000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname?schema=public

# JWT (must be at least 32 characters)
JWT_ACCESS_SECRET=your-super-secret-key-min-32-characters
JWT_REFRESH_SECRET=another-super-secret-key-min-32-characters
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL_DAYS=30

# Client
CLIENT_URL=http://localhost:5173
```

### Optional Variables

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# AI
AI_PROVIDER=mock  # Options: mock, openai, openrouter, custom
AI_DEFAULT_MODEL=mock-general

# File Upload
UPLOAD_DIR=./storage/private
MAX_UPLOAD_SIZE_MB=10

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX=120
```

---

## 11. Development

### Running the Application

```bash
# Backend (port 4000)
npm run dev

# Frontend (port 5173)
cd frontend
npm run dev
```

### Available Scripts

```bash
# Backend
npm run dev              # Start with hot-reload
npm run build            # Build for production
npm run start            # Run production build
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate:dev    # Run dev migrations
npm run prisma:migrate:deploy # Run production migrations

# Frontend
cd frontend
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
```

### Database Commands

```bash
# Generate Prisma client
npm run prisma:generate

# Create migration
npx prisma migrate dev --name init

# Apply migrations
npm run prisma:migrate:deploy

# Reset database (development)
npx prisma migrate reset --force

# Open Prisma Studio (database GUI)
npx prisma studio
```

---

## 12. Deployment

### Docker Compose (Recommended)

```bash
# Build and start all services
docker compose up -d --build

# View logs
docker compose logs -f

# Stop all services
docker compose down

# Rebuild specific service
docker compose up -d --build backend
```

### Services

| Service | Image | Port | Description |
|---------|-------|------|-------------|
| postgres | postgres:16-alpine | 5432 | PostgreSQL database |
| backend | Node.js | 4000 | API server |
| frontend | Nginx | 80 | React app |

### Production Build

```bash
# Build backend
npm run build

# Build frontend
cd frontend
npm run build

# Or use Docker
docker compose -f docker-compose.yml up -d --build
```

---

## 13. Security

### Implemented Security Features

- **Helmet** - Security HTTP headers
- **CORS** - Configured for specific client URL with credentials
- **JWT Authentication** - Short-lived access tokens (15m) + long-lived refresh tokens (30 days)
- **Refresh Token Rotation** - Tokens hashed before storage
- **Password Hashing** - bcrypt with 12 salt rounds
- **Rate Limiting** - Global (120 req/15min) and auth-specific (20 req/15min)
- **Input Validation** - Zod schemas on all request bodies and queries
- **Authorization** - Room membership enforced at service layer
- **File Access Control** - Files served only through authenticated routes
- **Log Redaction** - Sensitive fields redacted in logs

---

## 14. Troubleshooting

### Common Issues

#### Database Connection Failed

```bash
# Check if PostgreSQL is running
docker compose ps

# Check logs
docker compose logs postgres

# Restart PostgreSQL
docker compose restart postgres
```

#### Port Already in Use

```bash
# Find process using port 4000
netstat -ano | findstr :4000

# Kill process
taskkill /PID <PID> /F
```

#### Migration Failed

```bash
# Reset database
npx prisma migrate reset --force

# Recreate database
npx prisma db push --force-reset
```

#### Frontend Build Failed

```bash
# Clear node_modules and reinstall
rm -rf frontend/node_modules
cd frontend
npm install
```

### Getting Help

- Check the logs: `docker compose logs -f`
- Open Prisma Studio: `npx prisma studio`
- Check health endpoint: `http://localhost:4000/api/health`

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

---

<p align="center">Built with ❤️ using Node.js, React, and Socket.IO</p>