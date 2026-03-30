# API Design

## Why This Chapter Exists
APIs are promises. Once the frontend depends on a route shape, response envelope, or error code, that contract becomes part of the product.

This file explains how ChatSphere's backend designs those contracts and how the current implementation turns incoming requests into predictable responses.

The focus is not only on "what endpoints exist." It is also on:

- why the API is shaped the way it is
- how validation works
- how the frontend should think about request and response handling
- what tradeoffs the current design makes

## API Style: REST with Domain-Oriented Route Groups
ChatSphere uses a REST-style HTTP API organized by domain:

- `/api/health`
- `/api/auth`
- `/api/chat`
- `/api/conversations`
- `/api/rooms`
- `/api/groups`
- `/api/polls`
- `/api/projects`
- `/api/memory`
- `/api/settings`
- `/api/users`
- `/api/uploads`
- `/api/ai`
- `/api/search`
- `/api/moderation`
- `/api/admin`
- `/api/analytics`
- `/api/export`
- `/api/import`

This is a practical choice for a product with both CRUD-like behavior and workflow endpoints.

For example:

- `POST /api/auth/login` is action oriented
- `GET /api/conversations/:conversationId` is resource oriented
- `POST /api/rooms/:roomId/actions` is workflow oriented

The API is not "pure REST" in the academic sense, and that is okay. Production APIs often mix resource and action patterns when it makes the client simpler.

## Contract Source of Truth
The current route contracts live in the backend source itself, especially:

- [backend/src/routes/index.ts](../../backend/src/routes/index.ts)
- [backend/src/routes/auth.routes.ts](../../backend/src/routes/auth.routes.ts)
- [backend/src/routes/chat.routes.ts](../../backend/src/routes/chat.routes.ts)
- [backend/src/routes/conversations.routes.ts](../../backend/src/routes/conversations.routes.ts)
- [backend/src/routes/rooms.routes.ts](../../backend/src/routes/rooms.routes.ts)
- [backend/src/routes/groups.routes.ts](../../backend/src/routes/groups.routes.ts)
- [backend/src/routes/polls.routes.ts](../../backend/src/routes/polls.routes.ts)
- [backend/src/routes/projects.routes.ts](../../backend/src/routes/projects.routes.ts)
- [backend/src/routes/memory.routes.ts](../../backend/src/routes/memory.routes.ts)
- [backend/src/routes/ai.routes.ts](../../backend/src/routes/ai.routes.ts)
- [backend/src/routes/settings.routes.ts](../../backend/src/routes/settings.routes.ts)
- [backend/src/routes/search.routes.ts](../../backend/src/routes/search.routes.ts)
- [backend/src/routes/users.routes.ts](../../backend/src/routes/users.routes.ts)
- [backend/src/routes/uploads.routes.ts](../../backend/src/routes/uploads.routes.ts)

Some of these route groups are core product paths used every day, while others are supporting or administrative surfaces. Documenting all of them matters because engineers extending the backend need to understand the full contract surface, not just the most visible chat endpoints.

That matters because bundled frontend artifacts or old docs may contain outdated route names. The source route files are the canonical truth.

## Common Response Envelope
Most successful responses follow this structure:

```json
{
  "success": true,
  "data": { "...": "..." },
  "message": "Optional human-readable message"
}
```

Most failures follow this structure:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "requestId": "7a4a0f40-..."
  }
}
```

This is a good design for frontend ergonomics because the client can:

- check `success`
- inspect `data` on success
- inspect `error.code` for user-facing behavior and retries

## Why the Envelope Exists
Some APIs return raw resources directly. For example, they may respond with:

```json
{ "id": "...", "name": "..." }
```

ChatSphere instead wraps the result. The advantage is consistency. A frontend developer does not have to guess whether a route returns:

- a raw array
- an object
- metadata next to the payload
- a separate error shape

The envelope is like standardized packaging in a warehouse. Even when the contents differ, the outer box is familiar.

## Validation Strategy
Every important route validates input with Zod before entering service logic.

### Example
`POST /api/chat` validates:

- `message`
- optional `conversationId`
- optional `modelId`
- optional `projectId`
- optional attachment metadata

This matters because validation is the first line of defense against malformed requests and confusing runtime errors.

Instead of letting a bad request explode inside business logic, the backend stops it early and returns a structured `VALIDATION_ERROR`.

## The Request Flow Pattern
Most routes follow this pipeline:

```text
Client request
  -> middleware (auth / rate limit / validation)
  -> route handler
  -> service call
  -> Prisma / external integration
  -> normalized response
```

### Concrete example: room creation
```ts
POST /api/rooms
  -> protect
  -> validateBody(createRoomSchema)
  -> createRoom(userId, body)
  -> prisma.room.create(...)
  -> return 201 with room payload
```

## Major Route Groups

### Authentication routes
Defined in [backend/src/routes/auth.routes.ts](../../backend/src/routes/auth.routes.ts).

Key endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/google`
- `GET /api/auth/google/callback`
- `POST /api/auth/google/exchange`

These routes are a good example of action-style API design. Authentication is less about CRUD and more about session state transitions.

### Solo AI chat route
Defined in [backend/src/routes/chat.routes.ts](../../backend/src/routes/chat.routes.ts).

Key endpoint:

- `POST /api/chat`

This route is intentionally singular because it represents a workflow rather than a stored resource. The request says, in effect, "process this AI exchange," not "create a generic row."

### Conversation routes
Defined in [backend/src/routes/conversations.routes.ts](../../backend/src/routes/conversations.routes.ts).

Key endpoints:

- `GET /api/conversations`
- `GET /api/conversations/:conversationId`
- `GET /api/conversations/:conversationId/insights`
- `POST /api/conversations/:conversationId/actions`
- `DELETE /api/conversations/:conversationId`

These routes expose stored solo chat history and derived insight artifacts.

### Room routes
Defined in [backend/src/routes/rooms.routes.ts](../../backend/src/routes/rooms.routes.ts).

Key endpoints:

- `GET /api/rooms`
- `POST /api/rooms`
- `POST /api/rooms/:roomId/join`
- `POST /api/rooms/:roomId/leave`
- `GET /api/rooms/:roomId`
- `DELETE /api/rooms/:roomId`
- `GET /api/rooms/:roomId/messages`
- `POST /api/rooms/:roomId/messages`
- `PATCH /api/rooms/messages/:messageId`
- `DELETE /api/rooms/messages/:messageId`
- `POST /api/rooms/messages/:messageId/reactions`
- `GET /api/rooms/:roomId/insights`
- `POST /api/rooms/:roomId/actions`
- `POST /api/rooms/:roomId/pin/:messageId`
- `POST /api/rooms/:roomId/unpin/:messageId`
- `GET /api/rooms/:roomId/pinned`

This route family blends resource management with collaboration workflows. That is common in chat systems because many operations are state transitions on a resource instead of plain replacements.

### Group member routes
Defined in [backend/src/routes/groups.routes.ts](../../backend/src/routes/groups.routes.ts).

These handle role and membership administration:

- `GET /api/groups/:roomId/members`
- `PUT /api/groups/:roomId/members/:userId/role`
- `DELETE /api/groups/:roomId/members/:userId`

### Poll routes
Defined in [backend/src/routes/polls.routes.ts](../../backend/src/routes/polls.routes.ts).

Key endpoints:

- `POST /api/polls`
- `GET /api/polls/room/:roomId`
- `POST /api/polls/:pollId/vote`
- `POST /api/polls/:pollId/close`

### AI utility routes
Defined in [backend/src/routes/ai.routes.ts](../../backend/src/routes/ai.routes.ts).

Key endpoints:

- `GET /api/ai/models`
- `POST /api/ai/smart-replies`
- `POST /api/ai/sentiment`
- `POST /api/ai/grammar`

### Settings, user, upload, memory, project, and search routes
These round out the API and show that the backend is more than chat transport:

- settings persistence
- public user profiles
- file uploads
- memory import/export and curation
- project context storage
- message and conversation search

## Example Requests and Responses

### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "ravi",
  "email": "ravi@example.com",
  "password": "secret123"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "ravi",
      "email": "ravi@example.com"
    },
    "accessToken": "jwt-access-token"
  },
  "message": "Registration successful"
}
```

### Send AI chat message
```http
POST /api/chat
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "message": "Summarize the last discussion",
  "conversationId": "optional-uuid",
  "modelId": "optional-model-id"
}
```

### Create a room
```http
POST /api/rooms
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "name": "Design War Room",
  "description": "Realtime collaboration for UI and product decisions",
  "tags": ["design", "launch"]
}
```

## Error Codes as Part of the API Contract
The API does not only expose routes. It also exposes stable error semantics. Examples include:

- `UNAUTHORIZED`
- `INVALID_CREDENTIALS`
- `GOOGLE_ACCOUNT_ONLY`
- `CONFLICT`
- `VALIDATION_ERROR`
- `NOT_FOUND`
- `FORBIDDEN`
- `AI_RATE_LIMITED`
- `FEATURE_DISABLED`
- `ROOM_FULL`
- `EDIT_WINDOW_EXPIRED`

This is valuable because frontend behavior can be smarter than a generic "something went wrong" toast.

For example:

- `AI_RATE_LIMITED` can drive a retry countdown
- `UNAUTHORIZED` can trigger a refresh or redirect to login
- `CONFLICT` can show "email or username already in use"

## API Versioning: Current State and Tradeoffs
At the moment, the API does **not** expose explicit URL versioning like `/api/v1/...`.

### Why this is acceptable for now
The project appears to be in active product iteration, and explicit versioning adds maintenance overhead when there is only one supported client contract.

### Tradeoffs
Without explicit versioning:

- breaking changes require more discipline
- old clients can break if route or payload shapes change
- contract changes need strong coordination with the frontend

### Alternatives
- URL versioning: `/api/v1/...`
- header versioning
- media type versioning

For a product like ChatSphere, URL versioning is usually the easiest if the team ever needs to support parallel client generations.

## REST vs GraphQL in This Context
Could this backend have used GraphQL? Absolutely. But REST is a sensible fit here.

### Why REST works well
- route groups map cleanly to domains
- auth and caching are straightforward
- file upload flows are familiar
- websocket features already cover the realtime side

### Why GraphQL might have been chosen
- frontend could request exactly the fields it needs
- nested resources like room + members + messages could be shaped in one query

### Why REST is still a good choice here
Because many flows are not simple graph reads. They are domain actions:

- refresh token rotation
- AI utility execution
- room join/leave
- pin/unpin message
- vote in poll

Those workflows feel natural as explicit endpoints.

## API Design Principles Worth Preserving
As the backend grows, these principles should remain stable:

1. Validate at the edge.
2. Keep response envelopes consistent.
3. Keep routes thin.
4. Put business rules in services.
5. Treat error codes as a contract, not an implementation detail.
6. Add route groups by domain, not by frontend page.

## Summary
ChatSphere's API design is pragmatic, domain-oriented, and friendly to a modern React client. It combines REST-style route grouping, strong Zod validation, consistent envelopes, and expressive error codes. The design is not theoretical purity for its own sake. It is optimized for a real product that needs auth, AI workflows, collaborative rooms, and predictable client integration.

The next chapters build on this foundation by explaining the underlying data model and the auth system that powers the API.
