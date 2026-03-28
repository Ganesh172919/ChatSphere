# CHANGELOG

## vNext

### Added

- AI Memory Graph with persistent memory storage, ranking, and editable UI.
- Cross-model import preview/import flow for external AI conversation files.
- Normalized, markdown, and adapter export formats.
- Conversation intelligence for solo conversations and rooms.
- Prompt-template persistence and admin prompt management APIs.
- `backend/.env.example`.

### Improved

- Solo conversation sync with server-backed loading and deletion.
- Room chat with polls rendered in the main experience.
- Theme settings now apply to the actual UI.
- Profile bio persistence through the auth store.
- Admin navigation and analytics authorization.
- Group AI with memory-aware replies and per-user quota checks.

### Fixed

- Room export now uses `id` consistently on the frontend.
- Analytics endpoints are now admin-protected.
- Group AI no longer bypasses AI usage throttling.
