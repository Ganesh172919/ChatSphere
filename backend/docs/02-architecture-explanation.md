# 02 - Architecture Explanation

Deep dive into the ChatSphere system architecture, design decisions, and component interactions.

---

## System Overview

ChatSphere is a **modular monolith** with clear service boundaries, designed for local-first development while following enterprise architecture patterns. The system is structured to allow future extraction into microservices without refactoring core business logic.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  React 19 + TypeScript + Vite + TailwindCSS              │   │
│  │  Zustand (State) + React Router 7 + Socket.IO Client     │   │
│  └──────────────────────────┬───────────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   HTTP + WebSocket │
                    └─────────┬─────────┘
                              │
┌─────────────────────────────┼───────────────────────────────────┐
│                     SERVER LAYER                                │
│  ┌──────────────────────────┴───────────────────────────────┐   │
│  │  Express.js 5 + Socket.IO 4                               │   │
│  │                                                            │   │
│  │  Middleware Pipeline:                                      │   │
│  │  Helmet → CORS → Logger → RateLimiter → Routes → Error    │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                              │                                  │
│  ┌──────────┐  ┌──────────┐  │  ┌──────────┐  ┌──────────────┐ │
│  │   Auth   │  │  Rooms   │  │  │   Files  │  │     AI       │ │
│  │  Module  │  │  Module  │  │  │  Module  │  │   Module     │ │
│  └─────┬────┘  └─────┬────┘  │  └─────┬────┘  └──────┬───────┘ │
│        │             │       │        │               │         │
│  ┌─────┴─────────────┴───────┴────────┴───────────────┴───────┐ │
│  │                    Service Layer                            │ │
│  │  AuthService | RoomAuthService | FileService | AIProviders │ │
│  │  TokenService | MemoryRanking                               │ │
│  └──────────────────────────┬─────────────────────────────────┘ │
└─────────────────────────────┼───────────────────────────────────┘
                              │
┌─────────────────────────────┼───────────────────────────────────┐
│                     DATA LAYER                                  │
│  ┌──────────┐  ┌──────────┐  │                                  │
│  │PostgreSQL│  │ Prisma   │  │  ┌──────────┐  ┌─────────────┐  │
│  │   16     │──│   ORM    │──┤  │  Redis   │  │ Local Files │  │
│  │          │  │          │  │  │ (Future) │  │  /storage   │  │
│  └──────────┘  └──────────┘  │  └──────────┘  └─────────────┘  │
└──────────────────────────────┴──────────────────────────────────┘
```

---

## Component Architecture

### Backend Module Structure

Each feature module follows a strict layered pattern:

```
src/modules/auth/
├── auth.routes.ts       # Route definitions (HTTP endpoints)
├── auth.controller.ts   # Request/Response handling
├── auth.service.ts      # Core business logic
└── auth.schemas.ts      # Zod validation schemas
```

**Request Flow:**

```
HTTP Request
  → Express Middleware Stack
    → Route Matching
      → Zod Validation
        → Controller
          → Service
            → Prisma ORM
              → PostgreSQL
              → Response
```

### Service Layer Contracts

Each service is a pure class with injected dependencies. No direct database access from controllers.

```
Controller → Service → Repository/ORM → Database
```

---

## Module Responsibilities

### Auth Module

- User registration with email/password
- Login with JWT token pair (access + refresh)
- Google OAuth integration
- Token refresh rotation
- Session management

### Rooms Module

- Room CRUD operations
- Membership management (roles: Owner, Admin, Member)
- Message CRUD with edit/delete/pin
- Reactions (emoji system)
- Read receipts
- Room search and message search

### Files Module

- Multipart file upload
- Local filesystem storage with UUID-based keys
- Access control (room-scoped or private)
- Download with authorization check

### AI Module

- Pluggable AI provider interface
- Mock provider for development
- OpenAI / OpenRouter integration
- Smart reply generation
- Text insight extraction
- Streaming response support

### Memory Module

- Auto-extraction of key facts from conversations
- Keyword-based relevance scoring
- User-scoped memory retrieval
- Memory search

---

## Real-Time Architecture (Socket.IO)

### Connection Lifecycle

```
Client connects with JWT in auth token
  → Socket.IO auth middleware validates JWT
    → User marked ONLINE
      → user_status_change broadcast
        → Client joins room channels
          → Real-time event loop
```

### Event Categories

| Category | Events | Direction |
|----------|--------|-----------|
| Messaging | send_message, receive_message, message_edited, message_deleted | Bidirectional |
| Presence | user_status_change, user_joined, user_left | Server → Client |
| Typing | typing_start, typing_stop | Bidirectional |
| Reactions | add_reaction, reaction_update | Bidirectional |
| Read | mark_read, message_read | Bidirectional |
| AI | trigger_ai, ai_thinking, ai_response | Bidirectional |

### Room Channel Isolation

Each room is a Socket.IO channel. Users only receive events for rooms they have joined. This provides:

- Bandwidth efficiency
- Privacy enforcement at the transport layer
- Simpler client-side state management

---

## Authentication Flow

```
1. Client POST /api/auth/register { email, username, password }
2. Server validates with Zod schema
3. Server hashes password (bcrypt, 12 rounds)
4. Server creates User + RefreshToken in DB
5. Server returns { user, tokens: { accessToken, refreshToken } }
6. Client stores tokens in memory (Zustand)
7. Client sends accessToken in Authorization: Bearer header
8. On 401, client POST /api/auth/refresh with refreshToken
9. Server rotates refresh token, returns new pair
10. Client updates stored tokens
```

### Token Design

| Token | Lifetime | Storage | Signing |
|-------|----------|---------|---------|
| Access | 15 minutes | Client memory | JWT_ACCESS_SECRET |
| Refresh | 30 days | DB (hashed) + Client | JWT_REFRESH_SECRET |

Refresh tokens are hashed with SHA-256 before database storage. On refresh, the old token is revoked and a new one issued.

---

## Database Design Philosophy

### Single Source of Truth

PostgreSQL is the authoritative data store. All state derives from it.

### Prisma ORM

- Type-safe database access
- Migration-based schema management
- Generated client for autocomplete and type inference

### Key Design Decisions

1. **CUID for IDs** - Globally unique, sortable, URL-safe
2. **Soft deletes via status** - Messages use `MessageStatus.DELETED` instead of row deletion
3. **Array columns for tags** - PostgreSQL native array support
4. **Timestamps on all models** - `createdAt` and `updatedAt` for audit trail
5. **Enum types** - Constrained values at the database level

---

## Error Handling Strategy

### Layered Error Handling

```
Service throws AppError
  → AsyncHandler catches
    → Error handler middleware
      → Formatted JSON response
```

### Error Types

| HTTP Status | Code | Usage |
|-------------|------|-------|
| 400 | VALIDATION_ERROR | Invalid request data |
| 401 | UNAUTHORIZED | Missing or invalid token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource does not exist |
| 409 | CONFLICT | Duplicate resource |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL | Unexpected server error |

---

## Security Architecture

### Defense in Depth

```
Layer 1: Helmet (HTTP security headers)
Layer 2: CORS (origin restriction)
Layer 3: Rate Limiting (abuse prevention)
Layer 4: JWT Authentication (identity verification)
Layer 5: Zod Validation (input sanitization)
Layer 6: Service Authorization (permission checks)
Layer 7: Prisma ORM (SQL injection prevention)
```

---

## Frontend Architecture

### State Management (Zustand)

```
authStore    → Authentication state, tokens, user
roomStore    → Rooms, messages, active room
aiStore      → AI chat state, memory entries
fileStore    → Upload progress, file list
```

### Component Hierarchy

```
App
├── AuthProvider
│   ├── LoginPage
│   └── RegisterPage
└── ChatLayout
    ├── Sidebar (rooms list)
    ├── ChatHeader
    ├── MessageList
    │   └── MessageBubble[]
    ├── MessageInput
    ├── AIPanel
    ├── MemoryPanel
    └── MembersPanel
```

### Data Flow

```
Socket.IO Event
  → useSocket hook dispatches
    → Zustand store update
      → React re-render
```

---

## Scalability Considerations

While running locally, the architecture supports future scaling:

1. **Module Extraction** - Each module can become an independent service
2. **Database Sharding** - Prisma supports read replicas
3. **Horizontal Scaling** - Socket.IO adapter for Redis Pub/Sub
4. **CDN Integration** - Static file serving separation
5. **Queue System** - Background job processing with BullMQ

---

## Technology Decision Rationale

| Choice | Why |
|--------|-----|
| Express.js | Mature, ecosystem, middleware |
| Prisma | Type safety, migration tooling |
| Socket.IO | Fallback support, rooms, namespaces |
| Zustand | Minimal API, no boilerplate |
| TailwindCSS | Rapid prototyping, consistent design |
| Vite | Fast HMR, ES modules native |
| Zod | Runtime validation with TS inference |
| Pino | Structured logging, performance |
| TypeScript | Type safety across full stack |

---

## Further Reading

- [05 - Database Design](./05-database-design.md) for schema details
- [06 - AI Engine Specification](./06-ai-engine-specification.md) for AI architecture
- [10 - Architecture Diagrams](./10-architecture-diagrams.md) for visual diagrams
