# Code Walkthrough

## Purpose of this file

This file gives a backend file-by-file walkthrough of the most important AI-related services, middleware, routes, and schema elements.

## `backend/src/services/ai/gemini.service.ts`

### Responsibility

- model catalog
- model routing
- provider execution
- attachment note generation
- usage estimation
- telemetry generation
- deterministic fallback

### Why it matters

This is the backbone of the backend AI system.

### Main weakness

The file name now hides its true scope and it carries too many responsibilities.

## `backend/src/services/aiFeature.service.ts`

### Responsibility

- list models
- smart replies
- sentiment
- grammar

### Notable behavior

It enforces user feature toggles before calling the router.

## `backend/src/services/chat.service.ts`

### Responsibility

- solo chat orchestration
- conversation loading
- project validation
- memory retrieval
- insight loading
- AI call
- persistence

### Notable strength

This file creates the richest backend prompt in the system.

## `backend/src/services/memory.service.ts`

### Responsibility

- deterministic memory extraction
- AI-assisted memory extraction
- memory ranking
- memory CRUD
- memory import and export

### Notable strength

It combines AI-assisted learning with non-AI fallback heuristics.

## `backend/src/services/conversationInsights.service.ts`

### Responsibility

- build structured summaries for conversations and rooms
- upsert them into `ConversationInsight`

### Notable strength

This is one of the few places where prompt templates are used consistently.

## `backend/src/services/promptCatalog.service.ts`

### Responsibility

- define default prompt templates
- load active DB overrides
- interpolate variables
- seed initial room AI history

### Notable weakness

Prompt templates exist, but several live AI services bypass them.

## `backend/src/services/aiQuota.service.ts`

### Responsibility

- maintain in-memory AI request counters per time window

### Notable weakness

This design does not scale across multiple backend instances.

## `backend/src/routes/chat.routes.ts`

### Responsibility

- expose solo AI chat
- apply auth, rate limit, quota, and validation

## `backend/src/routes/ai.routes.ts`

### Responsibility

- expose model list
- expose utility AI endpoints

## `backend/src/routes/conversations.routes.ts`

### Responsibility

- expose AI-derived conversation insight and actions

## `backend/src/routes/memory.routes.ts`

### Responsibility

- expose memory control plane for personalization

## `backend/src/routes/rooms.routes.ts`

### AI relevance

- exposes room insight reads and actions

The actual room AI generation path is socket-based, not HTTP-based.

## `backend/src/socket/index.ts`

### Responsibility

- authenticate sockets
- manage room membership events
- handle `trigger_ai`
- persist AI room messages
- emit realtime state

### Why it matters

This is the backend bridge between realtime collaboration and AI.

## `backend/src/services/message.service.ts`

### AI relevance

- stores room AI outputs in `Message`
- records model metadata and memory references

## `backend/src/services/room.service.ts`

### AI relevance

- seeds room AI history
- exposes room-level AI action helpers built on insights

## `backend/src/middleware/aiQuota.middleware.ts`

### Responsibility

- enforce AI quota on HTTP routes

## `backend/src/middleware/rateLimit.middleware.ts`

### AI relevance

- `aiLimiter` protects AI HTTP endpoints

## `backend/src/middleware/socketAuth.middleware.ts`

### AI relevance

- protects room AI before any socket event is accepted

## `backend/src/config/env.ts`

### AI relevance

Defines:

- provider API keys
- default models
- AI timeout
- AI rate limits
- AI quota window

## `backend/prisma/schema.prisma`

### AI-relevant models

- `Conversation`
- `ConversationInsight`
- `MemoryEntry`
- `PromptTemplate`
- `Message`
- `Room`
- `Project`
- `User.settings`

## Example walkthrough snippet

```ts
const relevantMemories = await getRelevantMemories(input.userId, userMessage, 6);
const existingInsight = input.conversationId
  ? await getInsight("CONVERSATION", input.conversationId)
  : null;
const aiResponse = await sendAiMessage({ task: "chat", message: prompt, history });
```

## Best way to read the backend AI code

Recommended order:

1. `ai/gemini.service.ts`
2. `chat.service.ts`
3. `memory.service.ts`
4. `conversationInsights.service.ts`
5. `socket/index.ts`
6. routes and middleware
7. schema
