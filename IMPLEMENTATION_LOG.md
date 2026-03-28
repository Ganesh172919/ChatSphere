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

## Docs

- Added `backend/.env.example`.
- Updated API and websocket docs to reflect current routes and payloads.
- Added audit, architecture, roadmap, metrics, and changelog files.
