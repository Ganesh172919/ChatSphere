# ChatSphere Architecture

## Source Of Truth

ChatSphere now has one backend runtime path:

- `backend/index.js` boots the Express API, Socket.IO server, Passport config, and MongoDB connection.
- The data layer uses MongoDB with Mongoose models from `backend/models`.
- There is no second database runtime to keep in sync. MongoDB is the only supported persistence path.

For local work, think in terms of:

1. `frontend/` for the React app
2. `backend/` for the API and socket server
3. MongoDB for persistence

## High-Level Flow

### Frontend

- React + TypeScript + Vite
- Zustand stores for auth, room, and chat state
- Axios for REST calls
- Socket.IO client for room presence and live message updates

Important frontend files:

- `frontend/src/api` contains REST wrappers
- `frontend/src/hooks/useSocket.ts` owns socket connection, ack handling, and reconnect after token refresh
- `frontend/src/pages/GroupChat.tsx` handles room chat, replies, reactions, file sending, edit/delete, and AI requests
- `frontend/src/pages/SearchPage.tsx` combines room-message search and solo conversation search

### Backend

- Express REST API
- Socket.IO for real-time room chat
- Passport Google OAuth
- JWT access and refresh token flow
- Mongoose models for users, rooms, messages, conversations, polls, reports, and refresh tokens

Important backend files:

- `backend/index.js` application entry point
- `backend/routes/auth.js` local auth, refresh, password reset, and Google code exchange
- `backend/routes/rooms.js` room listing, join/leave, room detail, and pinned messages
- `backend/routes/groups.js` room member management
- `backend/routes/polls.js` poll create/list/vote/close
- `backend/routes/search.js` room and solo-chat search
- `backend/routes/uploads.js` authenticated file upload and file serving

## Main Data Models

### User

Stores:

- account info
- auth provider
- online status
- blocked users
- settings
- admin flag

### Room

Stores:

- room metadata
- creator
- member list with roles
- max user capacity
- pinned message ids
- AI history used for group Gemini prompts

### Message

Stores:

- room message content
- reactions
- reply preview metadata
- status (`sent`, `delivered`, `read`)
- pin state
- soft-delete state
- edit metadata and edit history
- optional uploaded file metadata

### Conversation

Stores solo AI chat history per user.

### Poll

Stores:

- room id
- question
- options
- vote lists
- close state
- expiry time

### Report

Stores moderation reports for users or messages, with status and review notes.

## Auth And Session Flow

### Local Login

1. Client calls `POST /api/auth/login`
2. Server returns access token, refresh token, and safe user object
3. Frontend stores tokens and uses the access token for REST and sockets
4. Axios refreshes tokens through `POST /api/auth/refresh` when needed
5. `useSocket` reconnects with the rotated token after refresh

### Google Login

The Google flow no longer puts JWT tokens in the browser redirect URL.

1. Browser starts at `GET /api/auth/google`
2. Google returns to `GET /api/auth/google/callback`
3. Server creates a short-lived one-time login code
4. Browser is redirected to the frontend callback route with `?code=...`
5. Frontend exchanges that code through `POST /api/auth/google/exchange`
6. Server returns access and refresh tokens in JSON

This keeps real tokens out of the callback query string.

## Real-Time Rules

Socket events are protected by JWT auth through `backend/middleware/socketAuth.js`.

Important server-side rules:

- room membership is checked before room-scoped actions run
- `join_room` only works for actual room members
- send, reply, react, pin, unpin, and read operations return ack payloads
- socket flood control limits bursts of room actions
- delivered status only moves forward when another room member is online
- read status is only applied to valid messages in the current room

The socket server also keeps lightweight in-memory maps for:

- room presence
- online users
- typing state
- flood-control counters

## Files And Uploads

Uploads are handled by Multer in `backend/middleware/upload.js`.

Current limits:

- max file size: 5 MB
- allowed mime types:
  - `image/jpeg`
  - `image/png`
  - `image/gif`
  - `image/webp`
  - `application/pdf`
  - `text/plain`

Uploaded files are stored in `backend/uploads` and served through `/api/uploads/:filename`.

## Search Design

Two search paths exist and are both used by the frontend:

- `GET /api/search/messages` for room messages
- `GET /api/search/conversations` for solo AI conversations

Room-message search is restricted to rooms the current user belongs to and supports filters like:

- room id
- sender id
- date range
- AI-only
- pinned-only
- attachment-only
- file type

## Settings And Feature Toggles

User settings live on the `User` document and are read or updated through `GET/PUT /api/settings`.

Current settings groups:

- theme
- accent color
- notification preferences
- AI feature toggles

The frontend should treat settings as user preferences, while backend permission checks remain authoritative.

## Local Development Layout

Run the project in two terminals:

1. `cd backend && npm run dev`
2. `cd frontend && npm run dev`

Backend default URL:

- `http://localhost:3000`

Frontend default URL:

- `http://localhost:5173`

The frontend talks to the backend through `/api` and the Socket.IO server on the same backend origin.
