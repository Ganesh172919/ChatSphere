# 04 - API Documentation

Complete REST API reference for the ChatSphere platform.

---

## Base URL

```
http://localhost:4000/api
```

## Authentication

All authenticated endpoints require:

```
Authorization: Bearer <access_token>
```

Tokens are obtained from login/register endpoints.

## Response Format

### Success

```json
{
  "success": true,
  "data": { ... }
}
```

### Error

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": [ ... ]
  }
}
```

---

## Auth Endpoints

### POST /api/auth/register

Register a new user account.

**Auth Required:** No

**Request Body:**

```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "securePassword123",
  "displayName": "John Doe"
}
```

**Validation:**
- `email`: valid email format
- `username`: 3-30 chars, alphanumeric + underscore
- `password`: 8-128 chars
- `displayName`: optional, max 50 chars

**Response (201):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clx...",
      "email": "user@example.com",
      "username": "johndoe",
      "displayName": "John Doe",
      "avatarUrl": null,
      "isAdmin": false,
      "createdAt": "2025-01-01T00:00:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi..."
    }
  }
}
```

---

### POST /api/auth/login

Login with email and password.

**Auth Required:** No

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "user": { ... },
    "tokens": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi..."
    }
  }
}
```

**Errors:**
- `401 INVALID_CREDENTIALS`: Wrong email or password
- `429 RATE_LIMITED`: Too many attempts

---

### POST /api/auth/refresh

Refresh access token using a valid refresh token.

**Auth Required:** No

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOi..."
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "tokens": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi..."
    }
  }
}
```

**Errors:**
- `401 INVALID_REFRESH_TOKEN`: Token expired or revoked

---

### POST /api/auth/logout

Revoke a refresh token.

**Auth Required:** No

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOi..."
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

---

### POST /api/auth/google

Authenticate with Google OAuth.

**Auth Required:** No

**Request Body:**

```json
{
  "credential": "google_id_token_string"
}
```

**Response (200):** Same as login response.

---

### GET /api/auth/me

Get current authenticated user profile.

**Auth Required:** Yes

**Response (200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clx...",
      "email": "user@example.com",
      "username": "johndoe",
      "displayName": "John Doe",
      "avatarUrl": "https://...",
      "bio": "",
      "isAdmin": false,
      "presenceStatus": "ONLINE",
      "themeMode": "DARK",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  }
}
```

---

## User Endpoints

### GET /api/users/me

Get current user profile (alias for `/api/auth/me`).

**Auth Required:** Yes

---

### PATCH /api/users/me

Update current user profile.

**Auth Required:** Yes

**Request Body:**

```json
{
  "displayName": "New Name",
  "bio": "Updated bio",
  "avatarUrl": "https://..."
}
```

**Response (200):** Updated user object.

---

### PATCH /api/users/me/settings

Update user settings.

**Auth Required:** Yes

**Request Body:**

```json
{
  "themeMode": "DARK"
}
```

**Valid Values:**
- `themeMode`: `LIGHT`, `DARK`, `SYSTEM`

---

### GET /api/users/:userId/profile

Get another user's public profile.

**Auth Required:** Yes

**Response (200):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clx...",
      "username": "johndoe",
      "displayName": "John Doe",
      "avatarUrl": "https://...",
      "bio": "",
      "presenceStatus": "ONLINE",
      "lastSeenAt": "2025-01-01T00:00:00.000Z"
    }
  }
}
```

---

## Room Endpoints

### GET /api/rooms

List rooms the current user is a member of.

**Auth Required:** Yes

**Response (200):**

```json
{
  "success": true,
  "data": {
    "rooms": [
      {
        "id": "clx...",
        "name": "General",
        "slug": "general",
        "description": "General discussion",
        "visibility": "PUBLIC",
        "tags": ["general"],
        "maxMembers": 20,
        "creatorId": "clx...",
        "lastMessageAt": "2025-01-01T00:00:00.000Z",
        "createdAt": "2025-01-01T00:00:00.000Z",
        "memberCount": 5,
        "unreadCount": 3
      }
    ]
  }
}
```

---

### POST /api/rooms

Create a new chat room.

**Auth Required:** Yes

**Request Body:**

```json
{
  "name": "Project Alpha",
  "description": "Discussion for Project Alpha",
  "visibility": "PRIVATE",
  "tags": ["project", "alpha"],
  "maxMembers": 10,
  "memberUsernames": ["jane", "bob"]
}
```

**Validation:**
- `name`: 1-100 chars
- `description`: optional, max 500 chars
- `visibility`: `PRIVATE`, `INTERNAL`, or `PUBLIC`
- `tags`: optional array of strings
- `maxMembers`: 2-100, default 20
- `memberUsernames`: optional, usernames to invite

**Response (201):** Created room object.

---

### GET /api/rooms/:roomId

Get room details including members.

**Auth Required:** Yes (must be member)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "room": {
      "id": "clx...",
      "name": "General",
      "slug": "general",
      "description": "",
      "visibility": "PUBLIC",
      "tags": [],
      "maxMembers": 20,
      "creatorId": "clx...",
      "members": [
        {
          "id": "clx...",
          "userId": "clx...",
          "role": "OWNER",
          "joinedAt": "2025-01-01T00:00:00.000Z",
          "user": {
            "id": "clx...",
            "username": "johndoe",
            "displayName": "John Doe",
            "avatarUrl": null
          }
        }
      ],
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  }
}
```

---

### POST /api/rooms/:roomId/members

Add a member to the room.

**Auth Required:** Yes (must be Admin or Owner)

**Request Body:**

```json
{
  "username": "newmember"
}
```

**Response (201):** Created RoomMember object.

**Errors:**
- `403 FORBIDDEN`: Not admin/owner
- `409 CONFLICT`: Already a member
- `400 ROOM_FULL`: Max members reached

---

### DELETE /api/rooms/:roomId/members/me

Leave a room.

**Auth Required:** Yes (must be member)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Left room successfully"
  }
}
```

---

### GET /api/rooms/:roomId/messages

List messages in a room.

**Auth Required:** Yes (must be member)

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 50 | Messages per page (max 100) |
| `before` | string | - | Cursor: message ID to fetch before |
| `after` | string | - | Cursor: message ID to fetch after |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "clx...",
        "roomId": "clx...",
        "authorId": "clx...",
        "authorName": "John Doe",
        "content": "Hello world!",
        "messageType": "USER",
        "status": "SENT",
        "isPinned": false,
        "parentMessageId": null,
        "uploadId": null,
        "reactions": [
          { "emoji": "THUMBS_UP", "userId": "clx...", "count": 2 }
        ],
        "createdAt": "2025-01-01T00:00:00.000Z",
        "updatedAt": "2025-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 150,
      "hasMore": true
    }
  }
}
```

---

### POST /api/rooms/:roomId/messages

Send a message to a room.

**Auth Required:** Yes (must be member)

**Request Body:**

```json
{
  "content": "Hello everyone!",
  "replyToId": "clx...",
  "uploadId": "clx..."
}
```

**Validation:**
- `content`: 1-5000 chars (required if no uploadId)
- `replyToId`: optional, must exist in same room
- `uploadId`: optional, must be owned by user

**Response (201):** Created message object.

---

### PATCH /api/rooms/:roomId/messages/:messageId

Edit a message.

**Auth Required:** Yes (must be author)

**Request Body:**

```json
{
  "content": "Updated message content"
}
```

**Response (200):** Updated message object.

---

### DELETE /api/rooms/:roomId/messages/:messageId

Soft-delete a message (sets status to DELETED).

**Auth Required:** Yes (must be author or admin)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "Message deleted"
  }
}
```

---

### POST /api/rooms/:roomId/messages/:messageId/reactions

Toggle a reaction on a message.

**Auth Required:** Yes (must be member)

**Request Body:**

```json
{
  "emoji": "THUMBS_UP"
}
```

**Valid Emojis:** `THUMBS_UP`, `FIRE`, `MIND_BLOWN`, `IDEA`

**Response (200):** Updated message with reactions.

---

### POST /api/rooms/:roomId/messages/:messageId/pin

Toggle pin status on a message.

**Auth Required:** Yes (must be Admin or Owner)

**Response (200):** Updated message.

---

### POST /api/rooms/:roomId/messages/read

Mark messages as read.

**Auth Required:** Yes (must be member)

**Request Body:**

```json
{
  "messageIds": ["clx...", "clx..."]
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "markedCount": 2
  }
}
```

---

### GET /api/rooms/search/messages

Search messages across all rooms.

**Auth Required:** Yes

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | Yes | Search query |
| `roomId` | string | No | Limit to specific room |

**Response (200):** Array of matching messages.

---

## File Endpoints

### POST /api/files/upload

Upload a file.

**Auth Required:** Yes

**Content-Type:** `multipart/form-data`

**Form Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `file` | File | The file to upload |
| `roomId` | string | Room to attach file to (optional) |

**Response (201):**

```json
{
  "success": true,
  "data": {
    "upload": {
      "id": "clx...",
      "originalName": "document.pdf",
      "mimeType": "application/pdf",
      "sizeBytes": 1048576,
      "visibility": "ROOM",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  }
}
```

**Limits:**
- Max file size: 10MB (configurable via `MAX_UPLOAD_SIZE_MB`)

---

### GET /api/files/:fileId/download

Download a file.

**Auth Required:** Yes (must have access to file)

**Response:** Binary file stream with appropriate `Content-Type` and `Content-Disposition` headers.

---

## AI Endpoints

### POST /api/ai/chat

Chat with an AI model.

**Auth Required:** Yes

**Request Body:**

```json
{
  "prompt": "Explain quantum computing in simple terms",
  "modelId": "mock-general",
  "history": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi! How can I help?" }
  ]
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "response": "Quantum computing is...",
    "modelId": "mock-general",
    "usage": {
      "promptTokens": 45,
      "completionTokens": 120,
      "totalTokens": 165
    }
  }
}
```

---

### POST /api/ai/smart-replies

Generate smart reply suggestions for a message.

**Auth Required:** Yes

**Request Body:**

```json
{
  "message": "Can you help me with the project deadline?",
  "context": "We've been discussing the Q1 deliverables"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "replies": [
      "Sure, what do you need help with?",
      "Let me check my schedule and get back to you",
      "Of course! When is the deadline?"
    ]
  }
}
```

---

### POST /api/ai/insights

Generate insights from text content.

**Auth Required:** Yes

**Request Body:**

```json
{
  "content": "We need to improve our deployment pipeline. The current process takes 45 minutes and has a 20% failure rate."
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "insights": {
      "summary": "Discussion about deployment pipeline improvements",
      "sentiment": "neutral",
      "keyTopics": ["deployment", "pipeline", "reliability"],
      "actionItems": ["Optimize deployment time", "Reduce failure rate"],
      "suggestions": ["Consider parallel builds", "Add rollback mechanism"]
    }
  }
}
```

---

## Memory Endpoints

### GET /api/memory

List memories for the current user.

**Auth Required:** Yes

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `q` | string | - | Search query |
| `roomId` | string | - | Filter by room |
| `limit` | number | 50 | Max results |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "memories": [
      {
        "id": "clx...",
        "summary": "User prefers dark theme",
        "content": "The user mentioned they prefer dark mode...",
        "keywords": ["theme", "dark", "preference"],
        "score": 85,
        "source": "CHAT",
        "roomId": "clx...",
        "createdAt": "2025-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

### POST /api/memory

Create a memory entry manually.

**Auth Required:** Yes

**Request Body:**

```json
{
  "summary": "Important project detail",
  "content": "The deadline is March 15th for the Q1 release",
  "keywords": ["deadline", "q1", "release"],
  "roomId": "clx..."
}
```

**Response (201):** Created memory entry.

---

### POST /api/memory/extract

Extract memories from content automatically.

**Auth Required:** Yes

**Request Body:**

```json
{
  "content": "I prefer using TypeScript over JavaScript. Also, my timezone is EST.",
  "roomId": "clx..."
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "extracted": [
      {
        "summary": "Programming language preference",
        "content": "Prefers TypeScript over JavaScript",
        "keywords": ["typescript", "javascript", "preference"]
      },
      {
        "summary": "User timezone",
        "content": "Timezone is EST",
        "keywords": ["timezone", "est"]
      }
    ]
  }
}
```

---

## Health Endpoints

### GET /

Root endpoint with API info.

**Auth Required:** No

**Response (200):**

```json
{
  "success": true,
  "data": {
    "name": "ChatSphere API",
    "version": "1.0.0",
    "environment": "development"
  }
}
```

---

### GET /api/health

Health check endpoint.

**Auth Required:** No

**Response (200):**

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 3600,
    "timestamp": "2025-01-01T00:00:00.000Z",
    "database": "connected"
  }
}
```

---

## Error Codes Reference

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `UNAUTHORIZED` | 401 | Missing or invalid auth |
| `INVALID_CREDENTIALS` | 401 | Wrong email/password |
| `INVALID_REFRESH_TOKEN` | 401 | Refresh token invalid |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Duplicate resource |
| `ROOM_FULL` | 400 | Room at max capacity |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limiting

| Endpoint Group | Limit | Window |
|----------------|-------|--------|
| Global | 120 requests | 15 minutes |
| Auth (login/register) | 20 requests | 15 minutes |
| AI endpoints | 30 requests | 15 minutes |
| File upload | 10 requests | 15 minutes |

Rate limit headers:

```
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 115
X-RateLimit-Reset: 1704067200
```

---

## Further Reading

- [05 - Database Design](./05-database-design.md) for data models
- [07 - Security Implementation](./07-security-implementation.md) for auth details
- [10 - Architecture Diagrams](./10-architecture-diagrams.md) for system flows
