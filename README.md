# ChatSphere

ChatSphere is a full-stack AI-native chat platform built with React, TypeScript, Vite, Express, MongoDB, Socket.IO, JWT auth, Google OAuth, and Gemini `gemini-2.0-flash`.

## Core Features

- Solo AI chat with saved conversations and server-backed sync
- Group rooms with real-time messaging, replies, reactions, pins, polls, presence, typing, and file sharing
- AI Memory Graph with editable user memory
- Conversation Intelligence for solo chats and rooms
- Cross-model import and export for external AI histories
- Admin analytics, moderation, blocking, and prompt management

## Stack

- Frontend: React 18, TypeScript, Vite, Zustand, Framer Motion
- Backend: Express, Mongoose, Socket.IO
- Database: MongoDB
- AI: Gemini `gemini-2.0-flash`
- Auth: JWT access/refresh tokens plus Google OAuth

## Local Setup

### Backend

```bash
cd backend
npm install
cp .env.example .env
```

Windows PowerShell:

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Minimum backend env:

```env
MONGO_URI=mongodb://localhost:27017/chatsphere
JWT_ACCESS_SECRET=replace_me
JWT_REFRESH_SECRET=replace_me
GEMINI_API_KEY=replace_me
CLIENT_URL=http://localhost:5173
PORT=3000
```

Start backend:

```bash
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open:

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend health: [http://localhost:3000/api/health](http://localhost:3000/api/health)

## Verification

```bash
cd frontend
npm run build

cd ../
node --check backend/index.js
node --check backend/routes/rooms.js
node --check backend/routes/ai.js
```

## New In This Version

- Memory Center at `/memory`
- Data Portability Center at `/export`
- Solo conversation sync with server data
- Room insight summaries and action extraction
- Prompt template storage and admin prompt APIs
- Admin-protected analytics routes

## Documentation

- [PROJECT_AUDIT.md](PROJECT_AUDIT.md)
- [INNOVATION_ROADMAP.md](INNOVATION_ROADMAP.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [IMPLEMENTATION_LOG.md](IMPLEMENTATION_LOG.md)
- [METRICS.md](METRICS.md)
- [CHANGELOG.md](CHANGELOG.md)
- [API Reference](docs/api-reference.md)
- [WebSocket Events](docs/websocket-events.md)
- [Setup Guide](docs/setup-guide.md)
- [Security](docs/security.md)
