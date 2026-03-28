# ChatSphere

ChatSphere is a full-stack chat app built with React, TypeScript, Vite, Express, Socket.IO, MongoDB, JWT auth, Google OAuth, and Gemini.

The project now uses one backend path only:

- `backend/index.js` is the single runtime entrypoint.
- MongoDB + Mongoose is the only active data layer.
- The unfinished Prisma/TypeScript backend path has been removed from the runtime architecture.

## What Works

- Local email/password auth with refresh-token rotation
- Google OAuth with a one-time frontend exchange step
- Solo AI chat with saved conversations
- Group rooms with real-time messaging, replies, reactions, pins, polls, presence, and typing
- File and image sharing in room chat
- Message edit/delete in room chat
- Search across room messages plus solo AI conversations
- Moderation, blocking, admin dashboard, analytics, settings, and export
- Forgot-password email flow with console fallback when SMTP is not configured

## Local Run

### 1. Backend

```bash
cd backend
npm install
copy .env.example .env
```

Update `backend/.env` with at least:

```env
MONGO_URI=mongodb://localhost:27017/chatsphere
JWT_ACCESS_SECRET=replace_me
JWT_REFRESH_SECRET=replace_me
GEMINI_API_KEY=replace_me
CLIENT_URL=http://localhost:5173
PORT=3000
```

Optional variables:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="ChatSphere" <noreply@chatsphere.app>

MESSAGE_EDIT_WINDOW_MINUTES=15
```

Start the backend:

```bash
npm run dev
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open:

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend health check: [http://localhost:3000/api/health](http://localhost:3000/api/health)

## Build Checks

Current verification commands:

```bash
cd backend
Get-ChildItem -Path . -Recurse -Filter *.js -File | Where-Object { $_.FullName -notmatch '\\node_modules\\' } | ForEach-Object { node --check $_.FullName }

cd frontend
npm run build
```

## Important Behavior Changes

- Room access is membership-based now. The frontend joins a room before loading its messages, and socket actions reject non-members.
- Google OAuth no longer returns access and refresh tokens in the callback URL. The callback now uses a short-lived one-time code exchange.
- Socket actions return proper ack payloads so the UI can show real errors for join/send/reply/react/pin/edit/delete actions.
- Search now supports AI, pinned, attachment, and file-type filters, and the UI includes recent/saved searches.
- Room messages now support inline image preview and attachment cards.

## Docs

- [Setup Guide](C:/Users/RAVIPRAKASH/ChatSphere/docs/setup-guide.md)
- [Architecture](C:/Users/RAVIPRAKASH/ChatSphere/docs/architecture.md)
- [API Reference](C:/Users/RAVIPRAKASH/ChatSphere/docs/api-reference.md)
- [WebSocket Events](C:/Users/RAVIPRAKASH/ChatSphere/docs/websocket-events.md)
