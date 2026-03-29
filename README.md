# ChatSphere

ChatSphere is a full-stack chat workspace that combines:

- Solo AI chat with saved, synced conversations
- Real-time direct messages and group rooms
- Inline room AI assistance
- Editable AI memory graph
- Conversation intelligence and summaries
- Cross-model import/export
- Admin analytics, moderation, blocking, and prompt management

The project now runs on PostgreSQL for all app data and includes Docker support for local production-style runs.

## Stack

- Frontend: React, Vite, Socket.IO client
- Backend: Node.js, Express, Prisma, Socket.IO
- Database: PostgreSQL
- Local containers: Docker Compose

## Project Layout

- `frontend/` React app
- `backend/` Express API, Prisma schema, Socket.IO server
- `docker-compose.yml` local production-style stack

## Prerequisites

- Node.js 20+
- npm 10+
- Docker Desktop or Docker Engine for the containerized flow

## Quick Start With Docker

This is the easiest way to run the full app locally with PostgreSQL.

1. From the repo root, install dependencies once if you also want local dev:

```bash
npm run install:all
```

2. Start the full stack:

```bash
npm run docker:up
```

3. Open:

- Frontend: [http://localhost:8080](http://localhost:8080)
- Backend API: [http://localhost:3000](http://localhost:3000)
- PostgreSQL: `localhost:5432`

4. Stop the stack:

```bash
npm run docker:down
```

5. Stream logs if needed:

```bash
npm run docker:logs
```

## Local Development

Use this mode if you want the Vite dev server and backend running outside Docker while still using PostgreSQL.

### 1. Start PostgreSQL

You can use the bundled container:

```bash
docker compose up -d postgres
```

### 2. Backend Environment

Create `backend/.env` from `backend/.env.example`.

Recommended local values:

```env
PORT=3000
CLIENT_URL=http://localhost:5173
SERVER_URL=http://localhost:3000
NODE_ENV=development

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/chatsphere?schema=public

JWT_ACCESS_SECRET=replace-with-a-long-random-secret
JWT_REFRESH_SECRET=replace-with-another-long-random-secret

DEFAULT_AI_MODEL=openai/gpt-5.4-mini
OPENROUTER_API_KEY=
OPENROUTER_DEFAULT_MODEL=openai/gpt-5.4-mini
OPENROUTER_MODELS=openai/gpt-5.4-mini=GPT-5.4 Mini,openai/gpt-5.4=GPT-5.4,anthropic/claude-sonnet-4.6=Claude Sonnet 4.6,google/gemini-2.5-flash=Gemini 2.5 Flash

GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
GROK_API_KEY=
XAI_API_KEY=
GROK_MODEL=grok-2-latest
HUGGINGFACE_API_KEY=
HUGGINGFACE_MODEL=meta-llama/Llama-3.1-8B-Instruct

MESSAGE_EDIT_WINDOW_MINUTES=15
AI_REQUEST_TIMEOUT_MS=30000
AI_CONTEXT_MESSAGE_LIMIT=18
AI_RATE_LIMIT_PER_MINUTE=8
```

Notes:

- `OPENROUTER_API_KEY` is the preferred provider key.
- If no provider keys are set, AI replies still work through the built-in local fallback response path.

### 3. Frontend Environment

Create `frontend/.env` from `frontend/.env.example`.

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

### 4. Install and Sync the Database

```bash
npm run install:all
npm run db:push
```

### 5. Run the Apps

In two terminals from the repo root:

```bash
npm run dev:backend
```

```bash
npm run dev:frontend
```

Open:

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend: [http://localhost:3000](http://localhost:3000)

## Build

Run both production builds from the repo root:

```bash
npm run build
```

## Default Local Accounts

There are no seeded accounts by default.

- The first user who registers becomes an admin automatically.
- Additional users can be created from the UI or via the auth API.

## Main Features

- Solo AI chat with model selection, markdown rendering, code blocks, uploads, and conversation history
- Direct messages with presence, statuses, replies, reactions, pins, and search
- Group rooms with inline AI replies, polls, typing, presence, replies, reactions, pins, and file sharing
- Editable AI memory graph with node and edge management
- Conversation intelligence generation and viewing
- Import/export for external AI chat histories
- Admin analytics, moderation queue, prompt templates, and user blocking

## API Highlights

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Chats

- `GET /api/chat`
- `POST /api/chat/solo`
- `POST /api/chat/direct`
- `POST /api/chat/group`
- `GET /api/chat/:chatId`
- `PATCH /api/chat/:chatId`
- `DELETE /api/chat/:chatId`
- `GET /api/chat/:chatId/export?format=json|markdown`
- `POST /api/chat/import`

### Messages

- `POST /api/chats/:chatId/messages`
- `GET /api/chats/:chatId/messages`
- `PATCH /api/chats/:messageId`
- `DELETE /api/chats/:messageId`
- `POST /api/chats/messages/:messageId/reactions`
- `POST /api/chats/messages/:messageId/pin`
- `POST /api/chats/messages/:messageId/poll/vote`
- `POST /api/chats/messages/:messageId/report`

### AI / Memory / Insights / Admin

- `GET /api/ai/models`
- `POST /api/ai/prompt`
- `GET /api/memory/graph`
- `POST /api/memory/nodes`
- `PATCH /api/memory/nodes/:nodeId`
- `DELETE /api/memory/nodes/:nodeId`
- `POST /api/memory/edges`
- `DELETE /api/memory/edges/:edgeId`
- `GET /api/insights/:chatId`
- `POST /api/insights/:chatId/generate`
- `GET /api/admin/analytics`
- `GET /api/admin/moderation`
- `GET /api/admin/prompts`
- `POST /api/admin/prompts`
- `GET /api/admin/blocks`

## Socket Events

Client emits:

- `chat:join`
- `chat:leave`
- `typing:start`
- `typing:stop`

Server emits:

- `message:new`
- `message:updated`
- `message:deleted`
- `typing:update`
- `presence:update`

## Notes

- Uploaded files are served from `/uploads`.
- The Docker frontend proxies `/api`, `/uploads`, and `/socket.io` to the backend container.
- Refresh-token cookies are configured to work on local HTTP during Docker runs and remain secure on HTTPS deployments.
