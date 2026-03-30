# Backend Project Structure

## Why This Chapter Exists
One of the hardest parts of joining an unfamiliar backend is not understanding a single algorithm. It is knowing **where things live**.

A confused developer often asks questions like:

- "Where do routes go?"
- "Where do I put a shared permission check?"
- "Why is this validation in middleware instead of the service?"
- "What is the difference between `config`, `helpers`, `middleware`, and `services`?"

This file turns the repository layout into a practical map.

## The Big Picture
The backend is centered in [backend/](../../backend). The most important folders are:

```text
backend/
  prisma/
  src/
    config/
    controllers/
    helpers/
    middleware/
    routes/
    services/
    socket/
    types/
    utils/
    app.ts
    server.ts
  Dockerfile
  docker-entrypoint.sh
  package.json
```

The root repository also includes:

- [docker-compose.yml](../../docker-compose.yml) for the full stack
- [docs/](../) for documentation
- [frontend/](../../frontend) for the web client

## Directory-by-Directory Explanation

### `backend/src/server.ts`
This is the true backend entry point.

It does four important things:

1. runs startup checks
2. creates the Express app
3. attaches Socket.IO to the HTTP server
4. installs graceful shutdown and global error listeners

If the backend were a theater production, `server.ts` is the stage manager calling "places" before the show starts.

### `backend/src/app.ts`
This file assembles the Express application itself.

It is intentionally small because its job is orchestration, not domain logic. It wires:

- request context
- helmet
- CORS
- body parsing
- cookie parsing
- Passport initialization
- API rate limiting
- route registration
- error handling

If middleware ordering ever feels mysterious, this is the first file to read.

### `backend/src/config/`
This folder holds runtime configuration and startup helpers.

#### Important files
- `env.ts`: parses environment variables
- `prisma.ts`: creates the Prisma and Postgres connection layer
- `passport.ts`: configures Google OAuth
- `startup.ts`: runs startup tasks before the server begins listening

This folder answers the question: "How does the application know who it is and what environment it is running in?"

### `backend/src/middleware/`
This folder contains reusable request and transport policies.

Examples:

- `auth.middleware.ts` checks JWT access tokens
- `validate.middleware.ts` applies Zod schemas
- `requestContext.middleware.ts` adds request IDs and timing logs
- `rateLimit.middleware.ts` protects the API from abuse
- `error.middleware.ts` turns thrown exceptions into consistent API responses
- `upload.middleware.ts` controls upload size, name, and extension rules
- `socketAuth.middleware.ts` performs Socket.IO handshake auth

The easiest way to think about middleware is: **it answers generic questions before the feature-specific code runs**.

Examples of generic questions:

- Is this user authenticated?
- Is the payload valid?
- Are we receiving too many requests from this identity?
- How do we log this request?

### `backend/src/routes/`
This folder contains the HTTP contract of the product.

Each file represents a route group:

- `auth.routes.ts`
- `chat.routes.ts`
- `conversations.routes.ts`
- `rooms.routes.ts`
- `groups.routes.ts`
- `polls.routes.ts`
- `projects.routes.ts`
- `memory.routes.ts`
- `settings.routes.ts`
- `users.routes.ts`
- `uploads.routes.ts`
- `ai.routes.ts`
- `search.routes.ts`
- and several more supporting domains

Routes are like the public doors to the building. They define:

- URL shape
- HTTP method
- request validation
- middleware stack
- response envelope

Routes should stay thin. If a route contains a lot of business logic, that is usually a sign the logic belongs in a service instead.

### `backend/src/services/`
This is the most important folder in the backend.

It contains domain behavior such as:

- `auth.service.ts`
- `chat.service.ts`
- `conversation.service.ts`
- `message.service.ts`
- `room.service.ts`
- `memory.service.ts`
- `conversationInsights.service.ts`
- `poll.service.ts`
- `settings.service.ts`
- `project.service.ts`
- `search.service.ts`

The service layer is where the system's rules live. If the database is the system's memory, the services are the system's judgment.

### `backend/src/socket/`
This folder currently centers around `index.ts`, which holds the realtime event server.

It manages:

- user connection lifecycle
- room join/leave events
- typing state
- read receipts
- message events
- AI trigger events
- pin/unpin events
- reaction events
- presence updates

This file is large because it orchestrates many realtime features. It is a good candidate for future modularization, but today it still fits the "single realtime gateway" model.

### `backend/src/helpers/`
This folder contains small reusable utilities that do not belong to one business domain.

Examples:

- `errors.ts` defines `AppError`
- `logger.ts` provides structured redacted logging
- `asyncHandler.ts` removes repetitive async try/catch wrappers in routes
- `validation.ts` contains tag normalization and room role helper functions

Helpers are not a dumping ground. They should stay generic and reusable.

### `backend/src/types/`
This folder holds shared TypeScript types such as auth and socket payload shapes.

Types act like a shared vocabulary. Without them, each module ends up inventing its own language for the same concepts.

### `backend/src/controllers/`
This folder exists, but the current backend mostly keeps controller responsibilities inside route handlers. That is worth noting because some teams expect a strict `route -> controller -> service` pipeline.

In this project the actual shape is closer to:

`route -> service`

That is a valid choice, especially when route handlers remain small and consistent.

### `backend/prisma/`
This folder defines persistence.

Key contents:

- `schema.prisma`: data model
- migration files: schema evolution history

This is the canonical source for database shape. If a developer wants to understand what can be stored, this folder answers that question.

## Practical "Where Should I Put This?" Guidance

### Scenario: I want to add a new API endpoint
Put the endpoint definition in the appropriate `routes/*.routes.ts` file. Put validation there. Put business logic in a service. Add or reuse middleware as needed.

### Scenario: I want to add a reusable permission rule
If it is cross-cutting and transport-agnostic, place it in the relevant service or helper, not only in a route.

### Scenario: I want to add a new database model
Add it in `prisma/schema.prisma`, create or apply the migration, then expose it through services and routes.

### Scenario: I want to add a new realtime event
Add it in `socket/index.ts`, validate it with Zod, delegate to the proper service, and emit well-named broadcast events.

### Scenario: I want to add a new AI utility
Usually the route belongs in `ai.routes.ts`, while the feature implementation belongs in `aiFeature.service.ts` or another domain service depending on whether the feature is generic or domain-specific.

## Example: How One Feature Crosses the Structure
Consider room pinning.

### Files involved
- route: [backend/src/routes/rooms.routes.ts](../../backend/src/routes/rooms.routes.ts)
- socket event: [backend/src/socket/index.ts](../../backend/src/socket/index.ts)
- domain logic: [backend/src/services/room.service.ts](../../backend/src/services/room.service.ts)
- persistence: [backend/prisma/schema.prisma](../../backend/prisma/schema.prisma) `Message.isPinned`, `pinnedAt`, `pinnedBy`

### What that teaches us
The structure is not random. Each feature spans multiple layers, but each layer has a different responsibility:

- route or socket defines the contract
- service enforces the business rule
- Prisma stores the state

## Suggested Reading Order by Folder
If you learn best from the outside in:

1. `routes/`
2. `middleware/`
3. `services/`
4. `prisma/`
5. `socket/`

If you learn best from the inside out:

1. `prisma/schema.prisma`
2. `services/`
3. `routes/`
4. `middleware/`
5. `server.ts` and `app.ts`

Both are valid. The right approach depends on whether you think in terms of user flows or data models first.

## Common Structural Patterns in This Codebase
### Pattern 1: thin route, heavy service
```ts
router.post("/", protect, validateBody(schema), asyncHandler(async (req, res) => {
  const result = await someService(req.user!.userId, req.body);
  res.status(200).json({ success: true, data: result });
}));
```

### Pattern 2: service validates domain state before writing
```ts
const membership = await assertRoomMembership(roomId, userId);
if (!membership) {
  throw new AppError("FORBIDDEN");
}

return prisma.message.create({ data: ... });
```

### Pattern 3: socket reuses service logic
```ts
socket.on("pin_message", async (payload) => {
  const message = await pinMessage(user.userId, payload.roomId, payload.messageId);
  io.to(payload.roomId).emit("message_pinned", message);
});
```

This pattern is healthy because it avoids duplicating permission and persistence rules in multiple transports.

## Structural Tradeoffs and Alternatives
### Why routes are not split into controllers
Some teams prefer:

`route -> controller -> service`

ChatSphere mostly uses:

`route -> service`

That is a deliberate simplification. The team avoids a controller layer when route handlers are already short enough to act as transport adapters.

### Why services are grouped by domain rather than by technical type
A domain-based structure scales better for product work. A developer thinking about rooms can open `room.service.ts` and immediately find room behavior.

An alternative would be a technical grouping such as:

- repositories
- handlers
- managers
- policies

That can work, but it often makes feature tracing harder for newcomers.

## How To Rebuild the Backend Structure From Scratch
If the codebase disappeared and you had to recreate the skeleton before rewriting functionality, the safest order would be:

1. create `server.ts` and `app.ts`
2. add `config/` for env and DB bootstrap
3. add middleware for auth, validation, request IDs, and errors
4. define Prisma schema
5. add route groups by domain
6. implement services one domain at a time
7. add Socket.IO event handling for rooms
8. add Docker packaging and migration bootstrapping
9. add documentation and runbooks

That rebuild order mirrors the real structure because the current project is arranged around the natural lifecycle of a backend.

## Summary
The project structure is not just a set of folders. It encodes the architectural decisions of the backend:

- configuration is centralized
- middleware handles policy
- routes define contracts
- services implement behavior
- Prisma owns persistence
- sockets extend the same business rules into realtime interactions

Once you see the structure this way, the repository becomes much easier to navigate and extend.
