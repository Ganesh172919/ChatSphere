# Database Design

## Why This Chapter Exists
Most backend behavior eventually turns into a data problem.

When a user logs in, the backend must know who they are. When a room message is sent, the backend must decide where to store it, who can see it, and how it can be found again later. When AI features create insights or memories, those outputs need durable structure so they can be reused rather than regenerated every time.

That is why database design matters so much in ChatSphere. The database is not just a storage box. It is the system's long-term memory, audit trail, authorization reference, and performance foundation.

If the route layer is the reception desk and the service layer is the operations team, PostgreSQL is the archive room where the organization keeps every official record. Prisma is the filing clerk that translates application objects into structured SQL operations.

This chapter explains:

- why the schema looks the way it does
- how the most important models relate to each other
- how read and write flows move through Prisma
- which indexes support performance
- where the design intentionally uses relational structure and where it intentionally uses JSON

## The Role of Prisma in This Project
ChatSphere uses **Prisma** as its database access layer. Prisma sits between the TypeScript application and PostgreSQL.

That brings three major benefits:

### 1. The schema becomes explicit
The file [schema.prisma](../../backend/prisma/schema.prisma) is a readable, centralized source of truth. A new engineer does not need to reverse engineer table names from scattered SQL files. They can inspect one schema file and understand the major entities.

### 2. Queries become type-safe
When services call `prisma.user.findUnique()` or `prisma.message.create()`, the application gets TypeScript help for field names, relations, and selected shapes. This reduces an entire class of bugs caused by misspelled columns or inconsistent record shapes.

### 3. Migrations become part of the delivery workflow
The database is treated as part of the application release process rather than a separate manual task. In Docker-based deployment, migrations are applied during container startup via `prisma migrate deploy`.

Prisma is not free of tradeoffs. It abstracts SQL, but sometimes advanced queries or database-specific optimizations are easier to express with raw SQL. ChatSphere currently benefits from Prisma's clarity and developer ergonomics because most of its data access patterns are standard CRUD plus a few targeted filters and relation checks.

## High-Level Data Domains
The schema is easiest to understand when grouped by responsibility rather than alphabetically.

### Identity and access
These models answer "who is the user and what sessions are active?"

- `User`
- `RefreshToken`
- `UserBlock`

### Realtime collaboration
These models answer "which rooms exist, who belongs to them, and what was said there?"

- `Room`
- `RoomMember`
- `Message`
- `Poll`

### AI conversations and memory
These models answer "what has the user discussed with AI, what insights were generated, and what should be remembered?"

- `Conversation`
- `ConversationInsight`
- `MemoryEntry`
- `PromptTemplate`

### Product extensions and workflows
These models support related features that enrich the product but are not part of the simplest message flow.

- `Project`
- `ImportSession`
- `Report`

Seeing the schema in domains helps a lot. A beginner often gets overwhelmed by individual fields. Thinking in domains first gives you a mental map before you dive into column-level detail.

## Core Relational Design
ChatSphere is not a purely normalized system and it is not a document database disguised as SQL. It uses a **hybrid design**:

- strongly relational models for identity, membership, ownership, and lifecycle-critical records
- JSON fields for flexible feature payloads that change more often or are naturally nested

That is a practical choice for a collaboration product with AI features.

### Why relational structure is used
Relational structure is strongest when the application needs guarantees.

For example:

- a room member must point to a real room and a real user
- the same user should not join the same room twice
- refresh tokens should belong to a specific user
- a poll should belong to a specific room

These rules are easier to enforce with foreign keys and unique constraints than with loosely structured blobs.

### Why JSON is also used
Some data is flexible by nature.

Examples in ChatSphere include:

- `Conversation.messages`
- `Message.reactions`
- `Message.readBy`
- `ConversationInsight.topics`
- `Project.files`
- `User.settings`

Representing these as relational child tables would increase strictness, but it would also add a lot of schema and query overhead. For this product, the team chose a middle ground: keep business-critical identity and ownership data relational, and keep highly variable nested content in JSON.

The tradeoff is important to understand.

JSON fields make iteration faster, especially for AI-generated metadata that may evolve. But they can make analytics, indexing, and validation harder over time. If the product needed heavy reporting on reactions, read receipts, or structured conversation turns, some of those JSON fields would likely graduate into dedicated tables later.

## The Most Important Models

## `User`
`User` is the anchor model for almost everything else.

It stores identity and profile information such as email, display name, avatar, authentication provider, online status, last seen timestamp, and user-level settings.

In practical terms, `User` is referenced by:

- refresh tokens
- rooms created by the user
- room membership records
- messages
- AI conversations
- projects
- memories
- reports
- block relationships

That makes `User` the equivalent of the customer master record in a business system.

### Why `settings` is JSON
User settings often evolve faster than the rest of the schema. Today the application stores AI toggles, theme preferences, and accent selections inside `User.settings`.

This lets the backend merge defaults with partial user-specific overrides without introducing a separate table for every preference. The downside is that settings are less query-friendly for cross-user analytics.

For per-user preferences, that tradeoff is reasonable.

## `RefreshToken`
Access tokens are short-lived, but refresh tokens need tracking because they can be rotated, revoked, and expired.

Instead of storing raw refresh tokens, ChatSphere stores a **hash** of each refresh token in the `RefreshToken` table. This is an important security choice. If the database is leaked, an attacker should not immediately gain active session tokens.

The model also stores:

- which user the token belongs to
- when it expires
- whether it has been revoked

This allows flows like:

1. User logs in.
2. Backend creates short-lived access token plus refresh token.
3. Refresh token is set in an HTTP-only cookie.
4. Hashed refresh token is stored in the database.
5. On refresh, the old token can be invalidated and replaced.

That design behaves more like a real session store than a stateless JWT-only system.

## `Room` and `RoomMember`
These two models are the backbone of group chat.

### Why membership is its own model
It would be tempting to store a room's members as a JSON array. That would be simple at first, but it would create serious problems:

- difficult membership queries
- weak uniqueness guarantees
- poor indexing
- awkward role management

Instead, ChatSphere uses `RoomMember` as a join model. Each row says:

- user X belongs to room Y
- their role is Z
- they joined at time T

This is a classic many-to-many design. One user can belong to many rooms, and one room can have many users.

The unique constraint on `[roomId, userId]` matters a lot because it prevents duplicate memberships at the database level, not just in application code.

### What `Room` stores directly
The room table stores the parts of a room that are truly room-level:

- name
- description
- creator
- update timestamps
- tags
- AI history

The `aiHistory` JSON field is a good example of a flexible auxiliary payload. It supports room-level AI context without forcing a complex secondary schema before the product has stabilized.

## `Message`
`Message` is one of the highest-traffic tables in the system.

This model stores:

- room ownership
- sender
- content
- timestamps
- edit and delete state
- pinned state
- status
- reply context
- reactions
- read receipts
- attachment references
- model telemetry and memory references for AI-related activity

This is where the hybrid schema strategy becomes very visible. Ownership and lifecycle fields are relational and queryable. Secondary interaction details such as reactions and read receipts are stored as JSON because they are nested, user-specific, and frequently updated.

### Why this matters for request flow
When the socket layer receives `send_message`, it does not need to write ten different relational tables for one chat bubble. The service can create one message row that contains the primary facts plus the current nested metadata structure.

That keeps the write path simpler, which matters in realtime systems.

### Tradeoff
The cost is that features like "show the most-used emoji reactions across all rooms" become harder to query efficiently because reactions are not normalized into a dedicated table.

## `Conversation`
AI conversations are stored separately from room messages because they represent a different interaction model.

Instead of a stream of independent room events, a conversation acts more like a self-contained transcript between a user and the AI system. The schema stores message turns in `Conversation.messages` as JSON.

Why choose JSON here instead of a `ConversationMessage` table?

Because the conversation payload is naturally ordered and nested, and the current product mostly loads or updates the conversation as a unit:

- list conversations for a user
- load one conversation
- append user turn + assistant turn
- derive insights from the transcript

This design is efficient for the current behavior. It is less ideal if the product later needs very deep analytics across individual conversation turns. That is a recurring theme in the schema: optimize first for the product's current workflows, while leaving room to normalize later if growth justifies it.

## `ConversationInsight`
AI products become much more useful when raw transcripts turn into summarized understanding. `ConversationInsight` exists for that reason.

It stores structured outputs such as:

- topics
- decisions
- action items
- scope type
- generation time

The system can derive these insights from conversations or rooms. That is why the model includes scope metadata rather than being tied to only one parent type.

This is a practical design for reuse. Instead of creating one "room insight" table and one "conversation insight" table, the project stores a unified insight record with a scope discriminator.

## `MemoryEntry`
`MemoryEntry` supports persistent memory for AI features.

A useful analogy is to think of the AI assistant as a smart colleague with a notebook. The notebook should not contain every sentence ever spoken. It should contain the durable facts worth remembering.

The backend stores those facts as memory entries with:

- user ownership
- summary text
- tags
- confidence and importance
- pinning
- source references
- a uniqueness fingerprint

The unique `[userId, fingerprint]` constraint prevents the system from writing the same durable memory over and over again. That is especially important in AI pipelines where similar content might be extracted multiple times from related prompts.

## `Poll`
Polls belong to rooms and store their options as JSON.

This is another deliberate design choice. Polls are room-scoped and relatively self-contained. The application typically loads a poll with all its options at once, so keeping the option list in JSON simplifies the schema.

If polling became a central analytics-heavy feature, a dedicated `PollOption` table and perhaps even `PollVote` rows would become more attractive.

## `Project`
Projects act as contextual containers for AI chat. A project can hold metadata, tags, suggested prompts, and file references that influence chat behavior.

This supports an important product idea: the AI assistant should respond in the context of real work, not just isolated prompts.

The database design reflects that by making projects user-scoped and flexible rather than deeply normalized.

## Request Flow: From API Call to Database Write
Database design becomes clearer when tied to a real request.

Consider `POST /api/chat`.

### Step 1. The route validates the request
The route checks that the user is authenticated and the body matches the expected input shape.

### Step 2. The service loads supporting data
The chat service may query:

- the current conversation, if `conversationId` was provided
- the selected project, if `projectId` was provided
- relevant memory entries for the current prompt
- an existing insight record

### Step 3. The AI provider is called
The application sends a compiled prompt to the AI provider and receives an assistant response plus usage and telemetry metadata.

### Step 4. The conversation is updated
The backend appends both the user message and assistant message into `Conversation.messages`.

### Step 5. Memory and insight updates happen
The backend may upsert memory entries and refresh conversation insights asynchronously.

### Step 6. The response is returned
The client receives the assistant text, conversation ID, usage, telemetry, and other derived metadata.

That one route touches several database concepts:

- user ownership
- JSON transcript storage
- AI memory extraction
- insight persistence
- timestamp-based lifecycle updates

This is why schema understanding is so important. A single request often crosses multiple data domains.

## Indexing Strategy
Indexes are where schema design turns into performance design.

Without indexes, the database behaves like a library where every book search starts by reading every shelf. With indexes, it behaves more like a catalog system that points you to the right area immediately.

Important indexes in ChatSphere include:

### `Conversation [userId, updatedAt]`
This supports the common pattern "show me this user's conversations ordered by recent activity."

### `Message [roomId, createdAt]`
This supports room timeline reads. When a user opens a room, the system usually wants messages for one room in chronological or reverse chronological order.

### `Message [roomId, isPinned]`
Pinned message views are room-scoped, so this index helps those queries avoid scanning unrelated messages.

### `Room [updatedAt]` and room ownership indexes
These help list rooms efficiently and sort them by recent activity or ownership.

### `MemoryEntry [userId, pinned, updatedAt]`
This helps user-scoped memory retrieval, especially when pinned and recent memories should be prioritized.

### Unique constraints
Unique constraints are not just integrity rules. They are also strong query accelerators for exact-match lookups like:

- membership by room and user
- refresh token uniqueness behavior
- memory deduplication by fingerprint

## Where the Schema Is Strong
Several design choices are particularly solid for the current product stage.

### Strong ownership boundaries
Most user data is clearly user-scoped or room-scoped. That makes authorization checks easier to implement at the service layer.

### Session security is better than "plain JWT only"
Using hashed refresh tokens in the database gives the team revocation and rotation control.

### Membership is relational
This makes permissions, role checks, and room filtering much more reliable.

### AI-specific persistence is explicit
Conversation insight, prompt templates, and memory entries all have dedicated homes. That makes the AI layer feel like part of the product architecture rather than a pile of prompt calls.

## Where the Schema Accepts Tradeoffs
Production systems are full of intentional compromises. ChatSphere has several worth understanding.

### JSON-heavy message metadata
Good for fast iteration and simpler writes.
Harder for analytics-heavy reporting later.

### Conversation transcript stored as JSON
Good for append-and-load conversation workflows.
Harder if the team later wants per-turn joins, moderation pipelines, or deep filtering.

### Flexible user settings
Good for product iteration.
Less ideal for cross-user reporting or fine-grained database constraints.

None of these are inherently wrong. They reflect the current product priorities: move quickly while keeping critical relationships relational.

## Example Pseudo-Code
The following pseudo-code shows the shape of a typical message write:

```ts
async function sendRoomMessage(userId: string, roomId: string, input: MessageInput) {
  await ensureUserBelongsToRoom(userId, roomId);

  const message = await prisma.message.create({
    data: {
      roomId,
      userId,
      content: input.content,
      replyTo: input.replyTo ?? Prisma.JsonNull,
      attachments: input.attachments ?? Prisma.JsonNull,
      reactions: [],
      readBy: [{ userId, readAt: new Date().toISOString() }],
    },
  });

  return message;
}
```

Even in simplified form, you can see the schema philosophy:

- room and user relationships stay relational
- nested interaction metadata stays JSON

## If You Needed to Rebuild This Database From Scratch
A practical rebuild order would look like this:

1. Create `User` and `RefreshToken` first.
2. Add `Room`, `RoomMember`, and `Message`.
3. Add `Conversation`, `ConversationInsight`, and `MemoryEntry`.
4. Add extensions such as `Project`, `Poll`, `ImportSession`, and `Report`.
5. Add indexes only after identifying the dominant read paths, then refine based on production metrics.

That order mirrors the business dependency chain. Authentication and identity come first, collaboration comes second, AI enrichment comes third, and optional workflows come last.

## Alternatives the Team Could Have Chosen

### More normalization
The team could have used separate tables for reactions, read receipts, conversation turns, and poll options.

That would improve analytics and strictness, but it would also slow down development and increase query complexity for current product needs.

### NoSQL storage for transcripts and metadata
The team could have used a document database for conversation transcripts and flexible AI payloads.

That might simplify some JSON-heavy writes, but it would complicate transactions, joins, and relational permission checks already needed by rooms, users, and membership.

### Event sourcing
A more ambitious design would treat every chat and AI action as an immutable event stream.

That would be powerful for auditability and replay, but it would dramatically increase implementation complexity. For this product stage, conventional relational persistence is the more practical choice.

## Key Takeaways
The ChatSphere database is designed around a simple principle:

**Use relational structure for truth, and use JSON for flexible product payloads.**

That principle shows up everywhere:

- users, rooms, membership, and sessions are strongly relational
- AI transcripts, metadata, insights, and settings are flexible where appropriate

For a full-stack engineer, this chapter matters because almost every backend decision eventually depends on it. When you understand the schema, route code becomes easier to read, service code becomes easier to extend, and performance problems become much easier to reason about.
