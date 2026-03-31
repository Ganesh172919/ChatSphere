# ChatSphere Architecture

## Current Source Of Truth

ChatSphere currently has one backend runtime path rooted in `backend/index.js`.

- Express provides the REST API.
- Socket.IO provides the room real-time layer.
- MongoDB with Mongoose provides persistence.
- The provider-aware AI gateway lives in `backend/services/gemini.js`.

## High-Level AI Flow

### Solo AI

1. The frontend sends `POST /api/chat`.
2. The backend validates auth, quota, attachments, and optional project context.
3. Relevant memories and an existing insight are loaded.
4. The AI gateway resolves a model, may auto-route, may fallback, and returns content plus metadata.
5. The backend persists both the user turn and assistant turn on `Conversation.messages`.
6. Memory usage is marked, new memories are upserted, and conversation insight is refreshed.

### Room AI

1. The frontend joins the room over REST and Socket.IO.
2. The user sends a normal room message when desired.
3. The frontend emits `trigger_ai` for the explicit AI request.
4. The backend validates socket auth, room membership, flood control, quota, and attachments.
5. Relevant memories and current room insight are loaded.
6. The AI gateway resolves a model, may auto-route, may fallback, and returns content plus metadata.
7. The backend updates `Room.aiHistory`, persists an AI `Message`, marks memory usage, and refreshes room insight.
8. Socket events broadcast `ai_thinking` and `ai_response` to the room.

## AI-Related Backend Modules

- `backend/index.js`
- `backend/routes/chat.js`
- `backend/routes/ai.js`
- `backend/routes/conversations.js`
- `backend/routes/rooms.js`
- `backend/routes/memory.js`
- `backend/routes/settings.js`
- `backend/routes/admin.js`
- `backend/services/gemini.js`
- `backend/services/memory.js`
- `backend/services/conversationInsights.js`
- `backend/services/promptCatalog.js`
- `backend/services/importExport.js`

## Backend AI Deep-Dive Docs

See the `docs/backend-ai` bundle for the full backend AI reference set.
