# Backend Overview

## Why This Document Exists
This repository already contains a broad technical write-up in [../ChatSphere-Technical-Documentation.md](../ChatSphere-Technical-Documentation.md). That document is useful as a master reference, but it reads like a single long architecture note. This backend guide breaks that material into smaller chapters so a developer can learn the system step by step.

The goal of this file is to answer the first question every new engineer asks:

"What exactly does this backend do, and how should I think about it before I start changing code?"

If you imagine the product as a busy collaboration building, the backend is the building's operations team:

- Express routes are the front desk.
- Middleware is the security gate, badge scanner, and check-in desk.
- Services are the specialists behind the scenes doing the real work.
- Prisma and PostgreSQL are the records department.
- Socket.IO is the radio system that keeps everyone updated in real time.
- AI integrations are external consultants the building can call when it needs analysis, summaries, or suggestions.

## What ChatSphere's Backend Is Responsible For
At a high level, the backend handles five major jobs:

### 1. Authentication and identity
The backend registers users, logs them in, rotates refresh tokens, supports Google OAuth, and exposes the authenticated profile through `/api/auth/me`.

### 2. Core communication features
It powers:

- solo AI conversations
- room-based group chat
- message reactions, replies, edits, and deletes
- pinned messages
- read receipts
- presence and typing indicators
- polls and member role management

### 3. AI-assisted workflows
The backend is not just a chat server. It also provides:

- solo AI chat through `/api/chat`
- room AI triggers over Socket.IO
- sentiment analysis
- grammar improvement
- smart replies
- conversation and room insights
- memory extraction and reuse

### 4. Persistence and data ownership
Every significant workflow eventually lands in PostgreSQL through Prisma. The backend is responsible for enforcing ownership rules, membership rules, and data shaping before database writes happen.

### 5. Runtime operations
The backend starts the HTTP server, initializes Socket.IO, loads model catalogs and prompt templates, runs Prisma migrations in Docker, and exposes health information for operations.

## The Backend's High-Level Shape
ChatSphere uses a **modular monolith** architecture.

That means the project is still a single deployable backend process, but the code is divided into clear modules such as auth, rooms, messages, memory, search, AI, settings, and projects.

This is an important design choice. A modular monolith is often a strong middle ground:

- simpler than microservices because there is one deployment unit
- easier to debug because a single request can be followed in one codebase
- structured enough that the team can later extract pieces if scale or organization requires it

In this project, the main backend entry points are:

- [backend/src/server.ts](../../backend/src/server.ts)
- [backend/src/app.ts](../../backend/src/app.ts)
- [backend/src/routes/index.ts](../../backend/src/routes/index.ts)
- [backend/src/socket/index.ts](../../backend/src/socket/index.ts)
- [backend/prisma/schema.prisma](../../backend/prisma/schema.prisma)

## A Quick Mental Model of the Request Lifecycle
Before diving into deeper chapters, it helps to understand the life of a typical request.

### Example: a user sends a room message
1. The frontend sends a request or socket event with the room ID, text, and optional file metadata.
2. The backend validates the payload with Zod.
3. Authentication middleware or socket auth verifies the JWT access token.
4. The service layer checks that the user is actually a member of the room.
5. The message service writes a new `Message` row through Prisma.
6. The room's `updatedAt` is touched so room ordering stays fresh.
7. The response is returned to the caller, and the socket server broadcasts the new message to other room members.

That one feature already shows the pattern used throughout the backend:

**client -> validation -> auth -> service -> database -> response/broadcast**

The same pattern appears in other areas too:

- login -> validate credentials -> issue tokens -> set cookie -> return user
- AI chat -> load conversation/memory/project context -> call AI provider -> persist transcript -> return telemetry
- settings update -> validate partial settings -> merge with defaults -> save JSON settings -> return normalized result

## What Makes This Backend Interesting
Many tutorial backends stop at CRUD. ChatSphere goes further, which means the documentation also needs to go further.

This backend combines:

- classic REST APIs
- realtime socket events
- JWT authentication
- refresh token rotation
- role-based room management
- AI model routing and fallback behavior
- memory and insight generation
- Dockerized deployment with migration orchestration

That combination creates real engineering tradeoffs. For example:

- Storing conversation messages as JSON is convenient, but relational tables are easier to search deeply.
- In-memory socket presence is simple in one process, but harder to scale across many servers.
- AI enrichments create a better user experience, but they also add latency, cost, and failure modes.

This documentation does not hide those tradeoffs. It explains the architecture as it exists today, then shows where the design is strong and where it could evolve.

## How To Use The Rest Of The Documentation
If you are new to the project, read the files in this order:

1. [01-overview.md](./01-overview.md)
2. [02-architecture.md](./02-architecture.md)
3. [03-project-structure.md](./03-project-structure.md)
4. [04-api-design.md](./04-api-design.md)
5. [05-database-design.md](./05-database-design.md)
6. [06-authentication.md](./06-authentication.md)
7. [07-services-and-business-logic.md](./07-services-and-business-logic.md)
8. [08-error-handling-and-logging.md](./08-error-handling-and-logging.md)
9. [09-scaling-and-performance.md](./09-scaling-and-performance.md)
10. [10-deployment-and-devops.md](./10-deployment-and-devops.md)
11. [11-security-best-practices.md](./11-security-best-practices.md)
12. [12-future-improvements.md](./12-future-improvements.md)

If you are joining the team to implement a feature, use the documents differently:

- feature touching routes: start with [04-api-design.md](./04-api-design.md)
- feature touching schema or queries: start with [05-database-design.md](./05-database-design.md)
- feature touching login, tokens, or OAuth: start with [06-authentication.md](./06-authentication.md)
- feature touching AI, rooms, or message orchestration: start with [07-services-and-business-logic.md](./07-services-and-business-logic.md)
- production issue or incident: start with [08-error-handling-and-logging.md](./08-error-handling-and-logging.md) and [10-deployment-and-devops.md](./10-deployment-and-devops.md)

## What "Backend Understanding" Means in This Project
To truly understand this backend, you should be able to answer all of the following:

- Where does a request enter the system?
- Which middleware runs before a service is called?
- Which service owns each business rule?
- Which Prisma model stores the final state?
- How does the response get shaped for the client?
- If the request is realtime, which socket event broadcasts updates?
- If the feature depends on AI, how does fallback behavior work when providers fail?

If you can answer those questions, you are no longer just reading the backend. You are ready to extend it.

## Summary
ChatSphere's backend is a modular Node.js and TypeScript system that combines REST APIs, realtime sockets, PostgreSQL persistence, JWT-based auth, AI-assisted features, and Docker-based operations. It is small enough to reason about as a single application, but rich enough to teach real-world backend architecture.

The rest of this guide unpacks that design one layer at a time.
