# IMPLEMENTATION_LOG

## Backend

- Added memory, insight, import-session, and prompt-template models.
- Centralized reusable memory and insight services.
- Added `/api/memory` CRUD, import, and export routes.
- Added conversation and room insight endpoints.
- Added prompt management endpoints in admin.
- Enforced admin middleware on analytics.
- Added per-user AI quota enforcement for REST chat and socket-triggered room AI.
- Updated room and AI routes to use centralized prompt handling.
- Refactored the AI service into a provider-aware gateway with OpenRouter-first routing.
- Added visible model discovery endpoint plus model/provider persistence on AI messages.
- Added attachment-aware solo chat and room AI prompts.
- Fixed room detail loading so joined rooms render full metadata.

## Frontend

- Added lazy-loaded routes and shared chunking.
- Added Memory Center page.
- Upgraded export page into a portability center with import preview/import commit.
- Synced solo conversations from the backend and added server-side deletion.
- Added insight panels to solo and room chat.
- Wired room polls into Group Chat.
- Applied backend theme settings through the app theme context.
- Hid admin navigation and admin page access for non-admins.
- Wired profile bio persistence through the auth state.
- Added message-level memory usage display and optional room sentiment badges.
- Added model selectors to solo chat and room AI inputs.
- Added explicit room join handling from the rooms directory.
- Added file upload support to solo AI chat input.

## Docs

- Added `backend/.env.example`.
- Updated API and websocket docs to reflect current routes and payloads.
- Added audit, architecture, roadmap, metrics, and changelog files.
- Updated setup and README docs for the multi-provider AI gateway.
