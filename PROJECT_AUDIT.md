# PROJECT_AUDIT

## Current State

- Frontend: React 18, TypeScript, Vite, Zustand, Framer Motion, Socket.IO client.
- Backend: Express, Mongoose, Socket.IO, JWT auth, Google OAuth, Gemini `gemini-2.0-flash`.
- Persistence: MongoDB for users, conversations, rooms, messages, polls, memory, import sessions, prompt templates, and conversation insights.
- Auth: local email/password, refresh token rotation, Google OAuth exchange flow.

## Chat Flow

- Solo chat uses `POST /api/chat` to save the user message, retrieve relevant memory, generate an AI response, persist both messages, and refresh conversation insight.
- Group chat uses Socket.IO room events for send, reply, react, pin, edit, delete, and `trigger_ai`.
- Group AI now enforces per-user AI quota, retrieves relevant memories, stores `memoryRefs` on AI replies, and refreshes room insight after changes.

## Major Improvements Added

- Added `MemoryEntry`, `ConversationInsight`, `ImportSession`, and `PromptTemplate` models.
- Added memory CRUD plus import/export APIs.
- Added conversation and room insight endpoints plus quick-action endpoints.
- Wired solo chat to server-backed conversation sync and insight refresh.
- Added a dedicated Memory Center page.
- Upgraded Export into a data portability center with previewable import.
- Applied backend theme settings in the UI, not just in storage.
- Hid admin UI for non-admin users and enforced admin middleware for analytics.
- Added route-level lazy loading and chunk splitting on the frontend.

## Remaining Risks

- `backend/index.js` is still large and should be split further into socket modules.
- There is still no formal automated test suite or CI workflow in the repository.
- Search, dashboard, and moderation flows remain functional but could use stronger contract-level validation and tests.

## Quality Notes

- Frontend production build passes.
- Backend syntax checks pass for the updated runtime files.
- Chunk splitting now prevents the old giant single-bundle problem.
