# ChatSphere

ChatSphere is a full-stack AI-native chat platform built with React, TypeScript, Vite, Express, MongoDB, Socket.IO, JWT auth, Google OAuth, and a multi-provider backend AI gateway.

## Current AI Snapshot

- Solo AI chat runs through `POST /api/chat` and persists conversation-level model, provider, token, and routing metadata.
- Room AI runs through the `trigger_ai` Socket.IO event and persists room AI replies as normal `Message` documents.
- The backend AI gateway supports OpenRouter, Gemini direct, xAI Grok direct, Groq direct, Together AI, and Hugging Face router paths when matching API keys are configured.
- Model discovery is exposed through `GET /api/ai/models` with a client-facing `auto` option.
- Persistent AI artifacts include memories, conversation insights, room insights, prompt templates, and import sessions.
- Project context and uploaded files can enrich solo AI prompts.

## Stack

- Frontend: React 18, TypeScript, Vite, Zustand, Framer Motion
- Backend: Express, Mongoose, Socket.IO
- Database: MongoDB
- AI: Multi-provider routing in `backend/services/gemini.js`
- Auth: JWT access/refresh tokens plus Google OAuth

## Local Setup

### Backend

Create `backend/.env` manually because the current repo does not include a checked-in `.env.example` file.

Minimum backend env for AI-enabled local work:

```env
MONGO_URI=mongodb://localhost:27017/chatsphere
JWT_ACCESS_SECRET=replace_me
JWT_REFRESH_SECRET=replace_me
CLIENT_URL=http://localhost:5173
PORT=3000

OPENROUTER_API_KEY=replace_me
OPENROUTER_DEFAULT_MODEL=openai/gpt-5.4-mini
DEFAULT_AI_MODEL=openai/gpt-5.4-mini

# Optional direct-provider keys
GEMINI_API_KEY=
GROK_API_KEY=
GROQ_API_KEY=
TOGETHER_API_KEY=
HUGGINGFACE_API_KEY=
```

Run:

```powershell
cd backend
npm install
npm run dev
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open:

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend health: [http://localhost:3000/api/health](http://localhost:3000/api/health)

## Verification

```powershell
cd frontend
npm run build
```

```powershell
cd ../backend
Get-ChildItem -Path . -Recurse -Filter *.js -File |
  Where-Object { $_.FullName -notmatch '\node_modules\' -and $_.FullName -notmatch '\dist\' } |
  ForEach-Object { node --check $_.FullName }
```

## Backend AI Docs

- [Backend AI Overview](docs/backend-ai/01-backend-ai-overview.md)
- [Runtime Entrypoints And Request Lifecycle](docs/backend-ai/02-runtime-entrypoints-and-request-lifecycle.md)
- [REST AI API And Contracts](docs/backend-ai/03-rest-ai-api-and-contracts.md)
- [Socket Room AI And Realtime Lifecycle](docs/backend-ai/04-socket-room-ai-and-realtime-lifecycle.md)
- [Model Routing Provider Catalog And Fallbacks](docs/backend-ai/05-model-routing-provider-catalog-and-fallbacks.md)
- [Memory Extraction Retrieval And Governance](docs/backend-ai/06-memory-extraction-retrieval-and-governance.md)
- [Conversation Insights Summaries And Actions](docs/backend-ai/07-conversation-insights-summaries-and-actions.md)
- [Persistence Models Import Export And Project Context](docs/backend-ai/08-persistence-models-import-export-and-project-context.md)
- [Operations Security Admin And Troubleshooting](docs/backend-ai/09-operations-security-admin-and-troubleshooting.md)
- [Frontend Backend AI Integration](docs/backend-ai/10-frontend-backend-ai-integration.md)

## Existing Docs

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [CHANGELOG.md](CHANGELOG.md)
- [IMPLEMENTATION_LOG.md](IMPLEMENTATION_LOG.md)
- [API Reference](docs/api-reference.md)
- [Architecture](docs/architecture.md)
- [Features](docs/features.md)
- [Setup Guide](docs/setup-guide.md)
- [WebSocket Events](docs/websocket-events.md)
