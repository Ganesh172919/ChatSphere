# Harsha - Realtime Collaboration, Rooms, and Messaging

## Overview
Harsha should own the backend's collaborative messaging engine. This is the heart of the realtime product: rooms, membership, socket events, message lifecycle, presence, reactions, replies, pins, polls, and read receipts.

The current implementation is functional and fairly rich, but it has a few clear architecture and correctness gaps: some socket rules are enforced in transport rather than in reusable domain helpers, typing events do not enforce membership as strictly as other events, message-read updates are row-by-row, and the socket layer is not yet ready for multi-instance scaling. This scope is large enough to stand on its own and is a strong fit for a lead engineer.

## Core Responsibilities
- Room and group lifecycle
- Room membership, roles, and moderation rules inside rooms
- Message creation, reply, edit, delete, read receipts, reactions, and pinned state
- Socket.IO event handling, realtime acknowledgements, and presence semantics
- Poll creation, voting, and room-level engagement mechanics
- Realtime reliability, cursor pagination, and collaboration-domain test coverage

## Detailed Tasks

### High Priority
1. Close the current authorization and integrity gaps in the collaboration domain.
   Work:
   - Enforce room-membership verification for `typing_start` and `typing_stop`.
   - Ensure reply targets belong to the same room before allowing a reply.
   - Review moderator/admin permissions for delete, pin, member removal, and role updates so they are consistent across services and socket events.
   Why this matters:
   - These are correctness and security issues inside the most active domain in the product.
   Done when:
   - Typing events reject non-members.
   - Cross-room replies cannot be created.
   - Permission checks are explicit and tested.

2. Refactor `socket/index.ts` into clearer collaboration submodules.
   Work:
   - Split payload validation, event registration, ack/error formatting, presence tracking, and room event broadcasting into smaller helpers.
   - Keep transport code thin and move shared business rules back into services where possible.
   - Define a stable error-code map for socket acknowledgements and `socket_error` events.
   Why this matters:
   - The socket file already contains a lot of logic and will become a bottleneck as more realtime features land.
   Done when:
   - `socket/index.ts` is reduced to orchestration.
   - Collaboration event handlers are easier to test independently.

3. Introduce cursor-based pagination and batch-safe updates for room messages.
   Work:
   - Replace simple `skip/take` room-history reads with cursor-based pagination ordered by `createdAt` and `id`.
   - Rework `markMessagesRead` to avoid row-by-row updates where possible.
   - Add tests for older-message retrieval, duplicate cursor handling, and large room histories.
   Why this matters:
   - Current pagination is fine for small rooms, but it will become slower and less stable as message volume grows.
   Done when:
   - Room history API supports cursor pagination.
   - Read-receipt updates are more efficient and consistent.

4. Build multi-instance readiness seams for realtime behavior.
   Work:
   - Introduce an adapter boundary around presence tracking and room event fan-out.
   - Keep the current in-memory implementation as the default, but make Redis-backed or distributed adapters pluggable.
   - Document how socket presence and flood control would behave once the app runs on multiple backend instances.
   Why this matters:
   - This backend is currently single-instance friendly but not horizontally-ready on the realtime side.
   Done when:
   - Presence and event fan-out are abstracted behind interfaces or helper modules.
   - The collaboration domain can adopt Redis later without rewriting business logic.

### Medium Priority
5. Harden room and group lifecycle behavior.
   Work:
   - Make room join/leave operations idempotent.
   - Review creator-leave, creator-delete, role-transfer, and member-removal rules so edge cases are explicit.
   - Ensure group-member APIs and room-member data stay aligned and predictable.
   Why this matters:
   - Collaboration products break trust quickly when role and membership edge cases behave inconsistently.
   Done when:
   - Lifecycle behavior is documented in tests and consistent across API and socket usage.

6. Improve polls as a room-native feature rather than an isolated helper.
   Work:
   - Verify that poll creation, voting, and close operations properly enforce room membership and closed-state behavior.
   - Add room timeline integration tests so poll activity behaves like a first-class collaboration feature.
   - Clean up any contract inconsistencies between room flows and poll flows.
   Why this matters:
   - Polls are part of group collaboration and should behave with the same rigor as messages.
   Done when:
   - Poll APIs have stable validation, membership enforcement, and regression coverage.

7. Add collaboration-domain observability.
   Work:
   - Emit structured warnings for failed send/edit/delete/pin/reaction operations with room ID and user ID.
   - Add counters or hooks for socket connection churn, room joins, message sends, read-receipt updates, and socket error codes.
   - Coordinate metric names with the platform owner.
   Why this matters:
   - Realtime bugs are hard to reproduce without strong observability.
   Done when:
   - Operators can trace collaboration failures and event hotspots from logs and metrics.

### Low Priority
8. Add a collaboration-focused automated test suite.
   Work:
   - Add integration tests for room creation, join/leave, send, reply, edit, delete, reaction, pin/unpin, read receipts, member role updates, and poll flows.
   - Add socket-focused tests for reconnect, duplicate event handling, and auth failure behavior.
   Why this matters:
   - This domain has the most event combinations and therefore the highest regression risk.
   Done when:
   - Collaboration flows can be validated automatically before release.

## File/Folder Ownership
Harsha should be the primary owner of:

```text
backend/src/routes/rooms.routes.ts
backend/src/routes/groups.routes.ts
backend/src/routes/polls.routes.ts
backend/src/socket/index.ts
backend/src/services/room.service.ts
backend/src/services/message.service.ts
backend/src/services/poll.service.ts
backend/src/middleware/socketAuth.middleware.ts
backend/src/types/socket.ts
backend/prisma/schema.prisma
```

## Dependencies
- Depends on Ganesh for token/role-policy alignment in socket handshakes and protected room actions.
- Depends on Ashish for schema/index migrations, Redis-ready infrastructure decisions, and observability plumbing.
- Depends on Hari for collaboration regression tests, smoke scripts, and release checklists once APIs stabilize.
- Coordinates with Jagadesh for room-level AI triggers so realtime room events and AI message creation stay consistent.

## Deliverables
- Secure and consistent collaboration-domain authorization
- Refactored and testable Socket.IO event architecture
- Cursor-based room message pagination
- More efficient read-receipt updates
- Multi-instance-ready realtime seams
- Stable poll and room-member behavior with regression coverage

## Priority Levels
- High: collaboration security fixes, socket refactor, cursor pagination, distributed-readiness seams
- Medium: room/group lifecycle cleanup, poll hardening, collaboration observability
- Low: broader regression expansion and advanced realtime polish after the core refactor lands
