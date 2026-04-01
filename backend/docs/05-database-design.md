# 05 - Database Design

Complete database schema documentation, design decisions, and data model relationships.

---

## Overview

ChatSphere uses **PostgreSQL 16** as the primary data store, managed through **Prisma ORM**. The schema follows normalized relational design with selective denormalization for query performance.

---

## Schema Diagram

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│      User        │     │    RoomMember     │     │      Room       │
├─────────────────┤     ├──────────────────┤     ├─────────────────┤
│ id          PK  │──┐  │ id           PK  │  ┌──│ id          PK  │
│ email       UQ  │  │  │ roomId    FK(UQ) │──┘  │ name            │
│ username    UQ  │  │  │ userId    FK(UQ) │──┐  │ slug        UQ  │
│ passwordHash    │  │  │ role            │  │  │ description     │
│ googleId    UQ  │  │  │ joinedAt        │  │  │ visibility      │
│ authProvider    │  │  └──────────────────┘  │  │ tags[]          │
│ displayName     │  │                        │  │ maxMembers      │
│ avatarUrl       │  │  ┌──────────────────┐  │  │ creatorId    FK │
│ bio             │  │  │     Message      │  │  │ lastMessageAt   │
│ isAdmin         │  │  ├──────────────────┤  │  │ createdAt       │
│ presenceStatus  │  └──│ authorId    FK   │  │  │ updatedAt       │
│ lastSeenAt      │     │ roomId      FK   │──┘  └─────────────────┘
│ themeMode       │     │ parentMsgId FK   │
│ createdAt       │     │ uploadId    FK   │     ┌─────────────────┐
│ updatedAt       │     │ content          │     │    Upload       │
└────────┬────────┘     │ messageType      │     ├─────────────────┤
         │              │ status           │     │ id          PK  │
         │              │ isPinned         │     │ ownerId   FK(UQ)│
┌────────┴────────┐     │ createdAt        │     │ roomId    FK    │
│  RefreshToken   │     │ updatedAt        │     │ storageKey  UQ  │
├─────────────────┤     └────────┬─────────┘     │ originalName    │
│ id          PK  │              │                │ mimeType        │
│ userId      FK  │     ┌────────┴─────────┐     │ sizeBytes       │
│ tokenHash   UQ  │     │ MessageReaction  │     │ visibility      │
│ expiresAt       │     ├──────────────────┤     │ createdAt       │
│ createdAt       │     │ id          PK   │     └─────────────────┘
│ lastUsedAt      │     │ messageId FK(UQ) │
│ revokedAt       │     │ userId    FK(UQ) │     ┌─────────────────┐
└─────────────────┘     │ emoji           │     │  MemoryEntry    │
                        │ createdAt       │     ├─────────────────┤
┌─────────────────┐     └─────────────────┘     │ id          PK  │
│    ReadReceipt  │                              │ userId      FK  │
├─────────────────┤                              │ projectId       │
│ id          PK  │                              │ roomId      FK  │
│ messageId FK(UQ)│                              │ summary         │
│ userId    FK(UQ)│                              │ content         │
│ readAt          │                              │ keywords[]      │
└─────────────────┘                              │ score           │
                                                 │ source          │
                                                 │ createdAt       │
                                                 └─────────────────┘
```

---

## Models

### User

Core user account model.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, CUID | Unique identifier |
| `email` | String | UNIQUE, NOT NULL | Login email |
| `username` | String | UNIQUE, NOT NULL | Display username |
| `passwordHash` | String? | NULLABLE | bcrypt hash (null for OAuth) |
| `googleId` | String? | UNIQUE, NULLABLE | Google OAuth ID |
| `authProvider` | Enum | DEFAULT LOCAL | Auth method |
| `displayName` | String? | NULLABLE | Public display name |
| `avatarUrl` | String? | NULLABLE | Profile image URL |
| `bio` | String | DEFAULT "" | User bio |
| `isAdmin` | Boolean | DEFAULT false | Admin flag |
| `presenceStatus` | Enum | DEFAULT OFFLINE | Online status |
| `lastSeenAt` | DateTime | DEFAULT now() | Last activity |
| `themeMode` | Enum | DEFAULT SYSTEM | UI theme preference |
| `createdAt` | DateTime | AUTO | Account creation |
| `updatedAt` | DateTime | AUTO | Last profile update |

**Relations:**
- Has many `RoomMember` entries
- Has many `RefreshToken` entries
- Has many `Upload` entries
- Has many `MemoryEntry` entries

---

### Room

Chat room model.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, CUID | Unique identifier |
| `name` | String | NOT NULL | Room display name |
| `slug` | String | UNIQUE, NOT NULL | URL-safe identifier |
| `description` | String? | NULLABLE | Room description |
| `visibility` | Enum | DEFAULT PRIVATE | Access level |
| `tags` | String[] | DEFAULT [] | Categorization tags |
| `maxMembers` | Int | DEFAULT 20 | Membership cap |
| `creatorId` | String | NOT NULL | Creator user ID |
| `lastMessageAt` | DateTime? | NULLABLE | Last message timestamp |
| `createdAt` | DateTime | AUTO | Room creation |
| `updatedAt` | DateTime | AUTO | Last room update |

**Relations:**
- Has many `RoomMember` entries
- Has many `Message` entries
- Has many `Upload` entries

---

### RoomMember

Room membership with role-based access.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, CUID | Unique identifier |
| `roomId` | String | FK, COMPOSITE UNIQUE | Room reference |
| `userId` | String | FK, COMPOSITE UNIQUE | User reference |
| `role` | Enum | DEFAULT MEMBER | Member role |
| `joinedAt` | DateTime | DEFAULT now() | Join timestamp |

**Composite Unique:** `[roomId, userId]`

**Roles:**
- `OWNER` - Room creator, full control
- `ADMIN` - Can manage members and pins
- `MEMBER` - Standard participant

---

### Message

Chat message model.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, CUID | Unique identifier |
| `roomId` | String | FK, NOT NULL | Parent room |
| `authorId` | String? | FK, NULLABLE | Sender (null for system) |
| `authorName` | String | NOT NULL | Display name at send time |
| `parentMessageId` | String? | FK, NULLABLE | Thread parent |
| `uploadId` | String? | FK, NULLABLE | Attached file |
| `content` | String | NOT NULL | Message body |
| `messageType` | Enum | DEFAULT USER | Message type |
| `status` | Enum | DEFAULT SENT | Delivery status |
| `isPinned` | Boolean | DEFAULT false | Pin status |
| `createdAt` | DateTime | AUTO | Send timestamp |
| `updatedAt` | DateTime | AUTO | Last edit timestamp |

**Types:** `USER`, `SYSTEM`, `AI`
**Statuses:** `SENT`, `DELIVERED`, `READ`, `DELETED`

**Relations:**
- Belongs to `Room`
- Has many `MessageReaction` entries
- Has many `ReadReceipt` entries
- Self-referential for threads via `parentMessageId`

---

### MessageReaction

Emoji reactions on messages.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, CUID | Unique identifier |
| `messageId` | String | FK, COMPOSITE UNIQUE | Message reference |
| `userId` | String | FK, COMPOSITE UNIQUE | Reacting user |
| `emoji` | Enum | NOT NULL | Reaction type |
| `createdAt` | DateTime | AUTO | Reaction timestamp |

**Composite Unique:** `[messageId, userId, emoji]`

**Emojis:** `THUMBS_UP`, `FIRE`, `MIND_BLOWN`, `IDEA`

---

### ReadReceipt

Message read tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, CUID | Unique identifier |
| `messageId` | String | FK, COMPOSITE UNIQUE | Message reference |
| `userId` | String | FK, COMPOSITE UNIQUE | Reading user |
| `readAt` | DateTime | DEFAULT now() | Read timestamp |

**Composite Unique:** `[messageId, userId]`

---

### RefreshToken

JWT refresh token storage.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, CUID | Unique identifier |
| `userId` | String | FK, NOT NULL | Owner user |
| `tokenHash` | String | UNIQUE, NOT NULL | SHA-256 hash of token |
| `expiresAt` | DateTime | NOT NULL | Expiration time |
| `createdAt` | DateTime | AUTO | Issuance time |
| `lastUsedAt` | DateTime? | NULLABLE | Last refresh time |
| `revokedAt` | DateTime? | NULLABLE | Revocation time |

---

### Upload

File upload metadata.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, CUID | Unique identifier |
| `ownerId` | String | FK, NOT NULL | Uploader |
| `roomId` | String? | FK, NULLABLE | Attached room |
| `storageKey` | String | UNIQUE, NOT NULL | Filesystem path |
| `originalName` | String | NOT NULL | Original filename |
| `mimeType` | String | NOT NULL | MIME type |
| `sizeBytes` | Int | NOT NULL | File size |
| `visibility` | Enum | DEFAULT PRIVATE | Access scope |
| `createdAt` | DateTime | AUTO | Upload time |

**Visibility:** `PRIVATE`, `ROOM`

---

### MemoryEntry

AI memory system entries.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String | PK, CUID | Unique identifier |
| `userId` | String | FK, NOT NULL | Owner user |
| `projectId` | String? | NULLABLE | Project association |
| `roomId` | String? | FK, NULLABLE | Source room |
| `summary` | String | NOT NULL | Brief description |
| `content` | String | NOT NULL | Full content |
| `keywords` | String[] | DEFAULT [] | Search keywords |
| `score` | Int | DEFAULT 0 | Relevance score |
| `source` | Enum | DEFAULT CHAT | Origin type |
| `createdAt` | DateTime | AUTO | Creation time |

**Sources:** `CHAT`, `ROOM`, `USER_PROFILE`, `SYSTEM`

---

## Enums

```prisma
enum AuthProvider { LOCAL, GOOGLE }
enum PresenceStatus { ONLINE, AWAY, OFFLINE }
enum ThemeMode { LIGHT, DARK, SYSTEM }
enum RoomVisibility { PRIVATE, INTERNAL, PUBLIC }
enum RoomMemberRole { OWNER, ADMIN, MEMBER }
enum MessageType { USER, SYSTEM, AI }
enum MessageStatus { SENT, DELIVERED, READ, DELETED }
enum ReactionEmoji { THUMBS_UP, FIRE, MIND_BLOWN, IDEA }
enum UploadVisibility { PRIVATE, ROOM }
enum MemorySource { CHAT, ROOM, USER_PROFILE, SYSTEM }
```

---

## Key Design Decisions

### 1. CUID Primary Keys

- Globally unique, no collision risk
- URL-safe, sortable by creation time
- No sequential enumeration attacks
- Better than UUID for database indexing

### 2. Composite Unique Constraints

- `RoomMember[roomId, userId]` - One membership per room
- `MessageReaction[messageId, userId, emoji]` - One reaction per emoji per user
- `ReadReceipt[messageId, userId]` - One receipt per user per message

### 3. Soft Delete for Messages

Messages use `status: DELETED` instead of row deletion to:
- Preserve conversation context
- Maintain thread integrity
- Support audit trails
- Enable undo functionality

### 4. Author Name Snapshot

`Message.authorName` stores the display name at send time. This ensures messages remain correctly attributed even if the user changes their name later.

### 5. Token Hash Storage

Refresh tokens are SHA-256 hashed before storage. The raw token is never persisted, limiting exposure if the database is compromised.

### 6. Array Columns

PostgreSQL native arrays for `tags` and `keywords` provide efficient containment queries without join tables.

### 7. Slug-Based Room URLs

Room slugs provide human-readable identifiers while the CUID serves as the primary foreign key.

---

## Indexes

```sql
-- Performance indexes
CREATE INDEX idx_message_room_created ON Message(roomId, createdAt DESC);
CREATE INDEX idx_message_author ON Message(authorId);
CREATE INDEX idx_room_member_user ON RoomMember(userId);
CREATE INDEX idx_refresh_token_user ON RefreshToken(userId);
CREATE INDEX idx_refresh_token_hash ON RefreshToken(tokenHash);
CREATE INDEX idx_memory_user_score ON MemoryEntry(userId, score DESC);
CREATE INDEX idx_memory_keywords ON MemoryEntry USING GIN(keywords);
CREATE INDEX idx_upload_owner ON Upload(ownerId);
CREATE INDEX idx_read_receipt_message ON ReadReceipt(messageId);
```

---

## Migrations

Schema changes are managed through Prisma Migrate:

```bash
# Create a migration
npx prisma migrate dev --name add_new_feature

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset --force

# View database
npx prisma studio
```

Migration files are stored in `prisma/migrations/` and versioned in Git.

---

## Data Integrity Rules

1. **Cascade deletes** - User deletion cascades to refresh tokens, room memberships
2. **Restrict deletes** - Cannot delete a room with messages (archive instead)
3. **Null checks** - `email`, `username`, `passwordHash` (for local auth) are required
4. **Default values** - All enums have sensible defaults
5. **Unique constraints** - Prevent duplicate memberships, reactions, and receipts

---

## Query Patterns

### Get Room with Members and Recent Messages

```typescript
const room = await prisma.room.findUnique({
  where: { id: roomId },
  include: {
    members: {
      include: { user: { select: { id: true, username: true, avatarUrl: true } } },
      orderBy: { joinedAt: 'asc' }
    },
    messages: {
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: { reactions: true }
    }
  }
});
```

### Get User Rooms with Unread Count

```typescript
const rooms = await prisma.roomMember.findMany({
  where: { userId },
  include: {
    room: {
      include: {
        _count: {
          select: {
            messages: {
              where: { createdAt: { gt: lastReadAt } }
            }
          }
        }
      }
    }
  }
});
```

---

## Further Reading

- [02 - Architecture Explanation](./02-architecture-explanation.md) for system design
- [06 - AI Engine Specification](./06-ai-engine-specification.md) for memory system
- [07 - Security Implementation](./07-security-implementation.md) for token security
