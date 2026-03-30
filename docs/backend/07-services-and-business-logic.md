# Services and Business Logic

## Why This Chapter Exists
One of the biggest differences between a beginner backend and a maintainable backend is where the business rules live.

In an immature codebase, routes often become giant functions that:

- parse input
- check permissions
- query the database
- call external APIs
- transform results
- decide side effects
- shape the response

That works for a few endpoints, then quickly becomes hard to debug and nearly impossible to extend safely.

ChatSphere avoids that by placing most business behavior in a **service layer**. Routes and socket handlers describe the interaction. Services decide what the application actually does.

If routes are the front desk staff, services are the specialists in the building who know the real procedures. The front desk can accept requests, but it should not also perform payroll, security review, maintenance scheduling, and legal approval. That specialization is exactly what the service layer provides.

## What "Business Logic" Means in This Project
Business logic is not a vague academic phrase here. In ChatSphere, it includes rules such as:

- a user can only send a room message if they belong to the room
- the room creator cannot casually leave their own room
- only recent messages can be edited within the configured edit window
- AI features should respect user settings before running
- memories should be deduplicated using fingerprints
- conversation insights should be refreshed after transcript changes
- polls can only be voted on while open

These rules are the product's actual behavior. They are more important than the raw HTTP endpoints because they define what the system means.

## Why the Service Layer Matters
The service layer gives the backend several important properties.

### Separation of concerns
Routes stay focused on transport concerns:

- HTTP method and URL
- validation
- authentication middleware
- response formatting

Services stay focused on domain concerns:

- permission checks
- persistence coordination
- external integration calls
- orchestration across multiple modules

### Reuse
The same underlying logic can be used by both REST routes and socket handlers. This is especially visible in room messaging behavior, where real-time events and traditional API reads share the same core data rules.

### Testability
A service can be unit tested more directly than an Express handler because its logic is not tightly tied to `req` and `res`.

### Evolvability
As the project grows, the service layer becomes the safest place to insert new business behavior without duplicating logic across endpoints.

## Service Modules in ChatSphere
The service layer is split by domain, which makes the code easier to navigate.

Key services include:

- `auth.service.ts`
- `token.service.ts`
- `chat.service.ts`
- `conversation.service.ts`
- `conversationInsights.service.ts`
- `memory.service.ts`
- `message.service.ts`
- `room.service.ts`
- `poll.service.ts`
- `settings.service.ts`
- `project.service.ts`
- `search.service.ts`
- `aiFeature.service.ts`
- provider-level AI services such as `services/ai/gemini.service.ts`

This organization is not arbitrary. It mirrors the product's real capabilities.

## Route vs Service Responsibility
A practical question every engineer eventually asks is:

"How do I know whether logic belongs in the route or the service?"

Here is a useful rule for this codebase:

### Put it in the route if it is about HTTP
Examples:

- reading params
- validating request bodies
- setting cookies
- choosing status codes
- calling `res.json(...)`

### Put it in the service if it is about product behavior
Examples:

- whether a user may edit a message
- how a conversation should be updated
- how memory entries should be ranked
- when AI insight generation should happen
- whether a room action is allowed

This rule keeps the codebase from collapsing into controller-heavy spaghetti.

## `auth.service.ts`: Identity and Session Rules
The auth service does more than "log users in." It owns the rules of account and session lifecycle.

It handles flows such as:

- registering new users
- verifying login credentials
- issuing tokens
- rotating refresh sessions
- logging out
- current-user retrieval
- password reset requests
- password reset completion
- Google user creation or lookup
- OAuth exchange-code handling

### Why this belongs in a service
These flows all combine persistence, security checks, and session decisions. They are domain rules, not transport details.

For example, "hash the refresh token before storing it" is a business-critical security rule. It should not be duplicated in multiple route handlers.

## `chat.service.ts`: AI Conversation Orchestration
This is one of the richest services in the backend because it coordinates multiple subsystems.

When the client calls `POST /api/chat`, the chat service may:

- validate message intent and content
- load an existing conversation if a `conversationId` exists
- load project context if a `projectId` exists
- query relevant memory entries
- load or derive conversation insight
- construct provider-ready prompt context
- call the AI provider
- append both user and assistant turns to the stored conversation
- upsert memory extracted from the new user message
- record usage and telemetry metadata
- trigger asynchronous insight refresh

This is a great example of why services exist. A single business operation crosses several modules and data models, but the route should still look clean from the outside.

### Flow explanation
Think of `chat.service.ts` as an orchestra conductor.

The route does not personally play every instrument. It simply hands the request to the conductor. The conductor then coordinates memory, conversation storage, project context, AI provider communication, and telemetry handling so the result feels like one coherent feature.

## `conversation.service.ts`: Transcript Management
Conversations are stored as JSON transcripts rather than separate message rows. That makes this service responsible for appending, listing, loading, and deleting conversation histories in a consistent way.

Important responsibilities include:

- listing conversations for a user
- loading one conversation by ID and user
- appending structured conversation turns
- deleting conversation records
- interacting with insight-related behavior

### Why a dedicated conversation service matters
Without it, transcript handling logic would be spread across routes, AI endpoints, and analytics features. That would create drift in how message turns are shaped or updated.

Centralizing transcript behavior means the rest of the system can treat a conversation as a stable concept.

## `conversationInsights.service.ts`: Turning Transcript Into Structure
Raw transcripts are useful, but derived understanding is more useful.

This service generates and persists structured insight such as:

- topics
- decisions
- action items

One particularly strong design decision here is the fallback behavior. If AI-based insight generation fails, the service can still produce deterministic fallback output instead of leaving the feature entirely broken.

That is an important production habit:

**AI enrichment should improve the product, not become a hard dependency for basic stability.**

## `memory.service.ts`: Durable AI Memory
Memory systems are easy to oversimplify. It is not enough to store random snippets and call that "memory." Useful memory must be:

- relevant
- deduplicated
- attributable to the correct user
- ranked sensibly
- updateable over time

ChatSphere's memory service reflects that maturity.

### What it does
The service handles:

- extracting candidate memory facts
- hashing normalized summaries into fingerprints
- preventing duplicate memories per user
- ranking relevant memories by overlap, confidence, importance, recency, and pinned state
- recording source references
- updating use metadata

### Why the fingerprint approach matters
AI systems often restate the same idea in slightly different words. Without a deduplication strategy, the database would quickly fill with near-duplicate memories.

The fingerprint design solves that by turning the normalized summary into a stable identifier per user. That makes memory persistence feel more intentional and less noisy.

## `message.service.ts`: Core Room Messaging Rules
This service owns the lifecycle of room messages.

Its responsibilities include:

- sending room messages
- loading room message history
- marking messages as read
- adding reactions
- editing messages
- soft deleting messages

This is one of the clearest examples of domain logic enforcement.

### Example rules enforced here
- the sender must belong to the room
- the reply target must exist
- edits must happen within the configured window
- only the owner should be able to edit or delete their own message in normal flows

### Why soft delete matters
Soft delete preserves the message record while changing how it is presented. That gives the system better continuity for reply chains, moderation review, and auditability than hard deletion would.

## `room.service.ts`: Group and Membership Behavior
The room service is broader than it first appears. It does not just create rooms. It manages room-level behavior and membership policy.

It supports:

- listing rooms for the current user
- creating rooms
- joining and leaving rooms
- fetching room details
- deleting rooms
- pinning and unpinning messages
- loading pinned messages
- listing members
- updating member roles
- removing members
- room insight retrieval
- room actions that trigger AI-assisted workflows

### Why this service is important
Realtime chat systems often fail when room behavior is split across too many files. By keeping group-oriented rules together, the project makes it easier to answer questions like:

- who can remove whom?
- who is allowed to pin messages?
- what happens when the room creator tries to leave?

Those are domain questions, so they belong in the domain service.

## `poll.service.ts`: Feature-Specific Domain Logic
Polls are a good example of how to add a feature without contaminating unrelated modules.

The poll service handles:

- poll creation
- room-scoped retrieval
- voting
- closing polls

Polls have their own lifecycle rules. For example, voting only makes sense while a poll is open, and changes should remain tied to room membership and room context. Encapsulating that behavior in its own service keeps the rest of the messaging system simpler.

## `settings.service.ts`: Stable Preference Rules
Settings logic often looks trivial, but it becomes messy quickly if partial updates are handled inconsistently.

This service provides:

- default settings
- normalization
- merging of partial updates
- consistent persisted shape

That prevents two common problems:

- one route forgetting to apply defaults
- frontend and backend gradually disagreeing about the shape of settings

## `project.service.ts`: Context for AI Work
Projects give the AI chat system more grounded context. Instead of treating every prompt as a standalone message, the backend can associate conversations with project metadata, prompt suggestions, tags, and files.

The project service handles user-scoped project CRUD and keeps this context separate from the core chat code. That is good design because projects enrich the AI workflow without becoming inseparable from it.

## `aiFeature.service.ts`: User-Controlled AI Helpers
Not every AI feature should be globally enabled for every user. This service checks user settings and then exposes AI-powered helpers such as:

- smart replies
- sentiment analysis
- grammar improvement
- model listing

This is an important architectural distinction:

- `chat.service.ts` is about the main AI conversation workflow
- `aiFeature.service.ts` is about secondary AI assistance features

Separating them prevents the main chat orchestration from becoming overloaded with unrelated utility behavior.

## `search.service.ts`: Read-Focused Business Logic
Search is not just a database query. It is a permissioned read feature with user scope, filtering rules, and result shaping.

The search service handles room messages and AI conversations as searchable resources. That makes it part of the business layer rather than a raw repository helper.

### Important implementation note
The current implementation includes a known caveat around room filtering behavior when a specific `roomId` filter is supplied. That is exactly the kind of detail good documentation should preserve. It shows that service documentation is not only about praise; it should also record boundaries and risks honestly so future engineers know where to improve the design.

## Services and the Request Lifecycle
To understand services well, trace a full request.

Consider `POST /api/rooms/:roomId/messages` conceptually, whether triggered by HTTP or socket event:

1. The request arrives with authenticated user context.
2. Validation ensures the content shape is acceptable.
3. The route or socket handler extracts `roomId` and message input.
4. `message.service.ts` checks room membership.
5. The service writes the message and initializes metadata such as reactions and read state.
6. The transport layer emits or returns the created message.
7. Other subsystems such as sockets and notifications react to the result.

The route never needs to know how membership is stored or how reactions are initialized. That knowledge belongs to the service.

## Services and the Socket Layer
Realtime systems often tempt developers to duplicate business logic inside socket handlers because events feel separate from API routes.

That is a trap.

Socket handlers should still delegate to services whenever the same domain rules apply. The transport mechanism changed, but the product rule did not.

For example:

- "a user must belong to a room before sending a message" is true for both REST and sockets
- "editing is limited by the configured window" is true for both REST and sockets

This is a major reason the backend remains understandable despite supporting both request-response and realtime interaction styles.

## Pseudo-Code Example: Service-Oriented Room Message Flow

```ts
// route or socket handler
const result = await messageService.sendRoomMessage(user.id, roomId, input);
publishMessageCreated(result);
return result;
```

```ts
// service
async function sendRoomMessage(userId: string, roomId: string, input: SendMessageInput) {
  await assertRoomMembership(userId, roomId);
  await assertNotBlockedConversation(userId, input.replyTargetUserId);

  return prisma.message.create({
    data: {
      roomId,
      userId,
      content: input.content,
      replyTo: input.replyTo ?? Prisma.JsonNull,
      reactions: [],
      readBy: [{ userId, readAt: new Date().toISOString() }],
    },
  });
}
```

That small example captures the layering philosophy:

- transport calls service
- service enforces rules
- persistence happens after the rules pass

## Tradeoffs in the Current Service Design
No service architecture is perfect, and understanding tradeoffs is part of learning the system honestly.

### Strengths
- domain logic is not buried inside route handlers
- modules are named after product capabilities
- services coordinate persistence and integrations clearly
- AI-specific workflows are first-class parts of the backend

### Tradeoffs
- some services are orchestration-heavy and could grow large over time
- not every cross-cutting concern is perfectly abstracted into smaller helper layers
- repository-style data access abstraction is intentionally minimal, which keeps things simple but means Prisma is visible in domain services

That last point is worth noticing. ChatSphere does not build an elaborate repository pattern over Prisma. That is a deliberate simplification. For many Node backends, that is a reasonable choice as long as service boundaries remain disciplined.

## How to Add a New Feature the Right Way
Suppose you want to add "scheduled room summaries."

A clean implementation path would be:

1. Add a new route or socket trigger if needed.
2. Create or extend a summary-focused service.
3. Reuse room, message, and AI provider services where appropriate.
4. Persist summary outputs in a clearly named model.
5. Keep formatting and response details at the transport edge.

This approach protects the architecture while still allowing the product to evolve.

## Key Takeaways
ChatSphere's service layer is where the backend becomes a product instead of a collection of endpoints.

That matters because backend quality is rarely defined by how many routes exist. It is defined by whether the rules are:

- readable
- reusable
- testable
- extendable

In this project, the services are the real engine room. If you want to understand or safely change system behavior, this is the layer you should read most carefully.
