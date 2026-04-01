# ChatSphere API Documentation

## Base URL

```
Development: http://localhost:4000/api
Production:  https://your-domain.com/api
```

## Authentication

All authenticated endpoints require a JWT access token in the Authorization header:

```
Authorization: Bearer <access_token>
```

The access token is obtained from the login/register endpoints and has a 15-minute expiration.

## Response Format

All responses follow this structure:

### Success Response (200/201)
```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```

### Error Response (400/401/403/404/500)
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {} // Optional validation details
  }
}
```

---

## Endpoints

## 1. Authentication

### Register User
Creates a new user account.

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "password123",
  "displayName": "Display Name"  // optional
}
```

**Validation:**
- `email`: Valid email address, required
- `username`: 3-30 characters, lowercase letters, numbers, underscores only, required
- `password`: 8-128 characters, required
- `displayName`: 1-60 characters, optional

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cu...",
      "email": "user@example.com",
      "username": "username",
      "displayName": "Display Name",
      "avatarUrl": null,
      "bio": "",
      "isAdmin": false,
      "authProvider": "LOCAL",
      "presenceStatus": "OFFLINE",
      "settings": {
        "themeMode": "SYSTEM",
        "customTheme": "default",
        "accentColor": "#2563EB",
        "notifications": {
          "sound": true,
          "desktop": true,
          "mentions": true,
          "replies": true
        },
        "aiFeatures": {
          "smartReplies": true,
          "sentimentAnalysis": false,
          "grammarCheck": false
        }
      },
      "createdAt": "2026-03-31T10:00:00.000Z",
      "updatedAt": "2026-03-31T10:00:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJ...",
      "refreshToken": "eyJ..."
    }
  }
}
```

**Errors:**
- 400: Validation error
- 409: User already exists

---

### Login
Authenticate user with email and password.

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "tokens": {
      "accessToken": "eyJ...",
      "refreshToken": "eyJ..."
    }
  }
}
```

**Errors:**
- 401: Invalid credentials

---

### Refresh Token
Refresh expired access token using refresh token.

**Endpoint:** `POST /api/auth/refresh`

**Request Body:**
```json
{
  "refreshToken": "eyJ..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

**Errors:**
- 401: Invalid or expired refresh token

---

### Logout
Revoke a refresh token.

**Endpoint:** `POST /api/auth/logout`

**Request Body:**
```json
{
  "refreshToken": "eyJ..."
}
```

**Response (204):** No content

---

### Get Current User
Get the authenticated user's profile.

**Endpoint:** `GET /api/auth/me`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": { ... }
  }
}
```

---

## 2. Users

### Get My Profile
Get the authenticated user's full profile.

**Endpoint:** `GET /api/users/me`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "cu...",
    "email": "user@example.com",
    "username": "username",
    "displayName": "Display Name",
    "avatarUrl": null,
    "bio": "",
    "isAdmin": false,
    "authProvider": "LOCAL",
    "presenceStatus": "OFFLINE",
    "settings": { ... },
    "createdAt": "2026-03-31T10:00:00.000Z",
    "updatedAt": "2026-03-31T10:00:00.000Z"
  }
}
```

---

### Update Profile
Update the authenticated user's profile.

**Endpoint:** `PATCH /api/users/me`

**Request Body:**
```json
{
  "displayName": "New Name",    // optional
  "bio": "My bio",            // optional
  "avatarUrl": "https://..."   // optional
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": { ... }
  }
}
```

---

### Update Settings
Update user settings.

**Endpoint:** `PATCH /api/users/me/settings`

**Request Body:**
```json
{
  "themeMode": "DARK",           // optional: LIGHT, DARK, SYSTEM
  "accentColor": "#6c5ce7",      // optional
  "notifications": {               // optional
    "sound": true,
    "desktop": true,
    "mentions": true,
    "replies": true
  },
  "aiFeatures": {                 // optional
    "smartReplies": true,
    "sentimentAnalysis": false,
    "grammarCheck": false
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": { ... }
  }
}
```

---

### Get User Profile
Get another user's public profile.

**Endpoint:** `GET /api/users/:userId/profile`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "cu...",
    "username": "username",
    "displayName": "Display Name",
    "avatarUrl": null,
    "bio": "",
    "presenceStatus": "OFFLINE",
    "createdAt": "2026-03-31T10:00:00.000Z"
  }
}
```

---

## 3. Rooms

### List Rooms
Get all rooms the authenticated user is a member of.

**Endpoint:** `GET /api/rooms`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "rooms": [
      {
        "id": "cu...",
        "name": "Room Name",
        "slug": "room-name",
        "description": "Room description",
        "visibility": "PRIVATE",
        "tags": ["tag1", "tag2"],
        "maxMembers": 20,
        "lastMessageAt": "2026-03-31T10:00:00.000Z",
        "role": "OWNER",
        "memberCount": 5,
        "messageCount": 100
      }
    ]
  }
}
```

---

### Create Room
Create a new chat room.

**Endpoint:** `POST /api/rooms`

**Request Body:**
```json
{
  "name": "Room Name",
  "description": "Room description",  // optional
  "visibility": "PRIVATE",            // optional: PRIVATE, INTERNAL, PUBLIC
  "tags": ["dev", "frontend"],       // optional
  "maxMembers": 20                   // optional
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "room": {
      "id": "cu...",
      "name": "Room Name",
      "slug": "room-name-123",
      "description": "Room description",
      "visibility": "PRIVATE",
      "tags": ["dev", "frontend"],
      "maxMembers": 20,
      "creatorId": "cu...",
      "createdAt": "2026-03-31T10:00:00.000Z",
      "updatedAt": "2026-03-31T10:00:00.000Z",
      "members": [...],
      "messages": [...]
    }
  }
}
```

---

### Get Room Details
Get a specific room with members and recent messages.

**Endpoint:** `GET /api/rooms/:roomId`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "room": {
      "id": "cu...",
      "name": "Room Name",
      "slug": "room-name",
      "description": "Room description",
      "visibility": "PRIVATE",
      "tags": ["dev"],
      "maxMembers": 20,
      "creatorId": "cu...",
      "createdAt": "2026-03-31T10:00:00.000Z",
      "updatedAt": "2026-03-31T10:00:00.000Z",
      "members": [
        {
          "id": "cu...",
          "roomId": "cu...",
          "userId": "cu...",
          "role": "OWNER",
          "joinedAt": "2026-03-31T10:00:00.000Z",
          "user": {
            "id": "cu...",
            "username": "username",
            "displayName": "Display Name",
            "avatarUrl": null,
            "presenceStatus": "ONLINE"
          }
        }
      ],
      "messages": [
        {
          "id": "cu...",
          "roomId": "cu...",
          "authorId": "cu...",
          "authorName": "username",
          "content": "Hello!",
          "messageType": "USER",
          "status": "READ",
          "isPinned": false,
          "createdAt": "2026-03-31T10:00:00.000Z"
        }
      ]
    }
  }
}
```

---

### Add Member
Add a user to a room (Admin+ required).

**Endpoint:** `POST /api/rooms/:roomId/members`

**Request Body:**
```json
{
  "userId": "cu...",
  "role": "MEMBER"  // optional: MEMBER, ADMIN
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "room": { ... }
  }
}
```

---

### Leave Room
Leave a room (Owner cannot leave).

**Endpoint:** `DELETE /api/rooms/:roomId/members/me`

**Response (204):** No content

---

### Get Messages
Get messages from a room.

**Endpoint:** `GET /api/rooms/:roomId/messages?limit=50`

**Query Parameters:**
- `limit`: Number of messages to fetch (default: 50, max: 100)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "cu...",
        "roomId": "cu...",
        "authorId": "cu...",
        "authorName": "username",
        "content": "Hello!",
        "messageType": "USER",
        "status": "READ",
        "isPinned": false,
        "createdAt": "2026-03-31T10:00:00.000Z",
        "updatedAt": "2026-03-31T10:00:00.000Z"
      }
    ]
  }
}
```

---

### Send Message
Send a message to a room.

**Endpoint:** `POST /api/rooms/:roomId/messages`

**Request Body:**
```json
{
  "content": "Hello, world!",
  "replyToId": "cu...",     // optional
  "uploadId": "cu..."        // optional
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "message": {
      "id": "cu...",
      "roomId": "cu...",
      "authorId": "cu...",
      "authorName": "username",
      "content": "Hello, world!",
      "messageType": "USER",
      "status": "SENT",
      "createdAt": "2026-03-31T10:00:00.000Z"
    }
  }
}
```

---

### Edit Message
Edit a message (author or admin only).

**Endpoint:** `PATCH /api/rooms/:roomId/messages/:messageId`

**Request Body:**
```json
{
  "content": "Updated content"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": { ... }
  }
}
```

---

### Delete Message
Soft-delete a message (author or admin only).

**Endpoint:** `DELETE /api/rooms/:roomId/messages/:messageId`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": { ... }
  }
}
```

---

### Toggle Reaction
Add or remove a reaction on a message.

**Endpoint:** `POST /api/rooms/:roomId/messages/:messageId/reactions`

**Request Body:**
```json
{
  "emoji": "THUMBS_UP"  // THUMBS_UP, FIRE, MIND_BLOWN, IDEA
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": { ... }
  }
}
```

---

### Pin Message
Pin a message (Admin+ only).

**Endpoint:** `POST /api/rooms/:roomId/messages/:messageId/pin`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": { ... }
  }
}
```

---

### Unpin Message
Unpin a message (Admin+ only).

**Endpoint:** `DELETE /api/rooms/:roomId/messages/:messageId/pin`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": { ... }
  }
}
```

---

### Mark Messages Read
Mark messages as read.

**Endpoint:** `POST /api/rooms/:roomId/messages/read`

**Request Body:**
```json
{
  "messageIds": ["cu...", "cu..."]
}
```

**Response (204):** No content

---

### Search Messages
Search messages across rooms.

**Endpoint:** `GET /api/rooms/search/messages?roomId=cu...&query=search&limit=20`

**Query Parameters:**
- `roomId`: Room to search in (required)
- `query`: Search query (required)
- `limit`: Max results (default: 20)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "cu...",
        "roomId": "cu...",
        "content": "Search result",
        "authorName": "username",
        "createdAt": "2026-03-31T10:00:00.000Z"
      }
    ]
  }
}
```

---

## 4. Files

### Upload File
Upload a file to the server.

**Endpoint:** `POST /api/files/upload`

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file`: File to upload (required)
- `roomId`: Room ID for room-scoped files (optional)
- `visibility`: PRIVATE or ROOM (default: ROOM)

**Response (201):**
```json
{
  "success": true,
  "data": {
    "upload": {
      "id": "cu...",
      "originalName": "file.pdf",
      "mimeType": "application/pdf",
      "sizeBytes": 1024000,
      "createdAt": "2026-03-31T10:00:00.000Z"
    }
  }
}
```

---

### Download File
Download a file.

**Endpoint:** `GET /api/files/:fileId/download`

**Response:** File blob

---

## 5. AI

### Chat with AI
Send a message to the AI and get a response.

**Endpoint:** `POST /api/ai/chat`

**Request Body:**
```json
{
  "prompt": "Hello, how are you?",
  "context": "Optional context",    // optional
  "roomId": "cu...",               // optional
  "conversationId": "cu...",       // optional
  "model": "mock-general"          // optional
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "response": "I'm doing well, thank you!",
    "conversationId": "cu..."
  }
}
```

---

### Get Smart Replies
Get AI-generated smart reply suggestions.

**Endpoint:** `POST /api/ai/smart-replies`

**Request Body:**
```json
{
  "prompt": "Thanks for your help",
  "roomId": "cu..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "replies": [
      "You're welcome!",
      "No problem!",
      "Happy to help!"
    ]
  }
}
```

---

### Generate Insights
Generate insights from text.

**Endpoint:** `POST /api/ai/insights`

**Request Body:**
```json
{
  "text": "Long conversation text...",
  "roomId": "cu..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "insights": "Key insights from the conversation..."
  }
}
```

---

## 6. Memory

### List Memories
Get user's memory entries.

**Endpoint:** `GET /api/memory?query=search&roomId=cu...&limit=50`

**Query Parameters:**
- `query`: Search query (optional)
- `roomId`: Filter by room (optional)
- `limit`: Max results (default: 50)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "cu...",
      "summary": "Memory summary",
      "content": "Full content",
      "keywords": ["keyword1", "keyword2"],
      "score": 10,
      "source": "CHAT",
      "createdAt": "2026-03-31T10:00:00.000Z"
    }
  ]
}
```

---

### Create Memory
Create a new memory entry.

**Endpoint:** `POST /api/memory`

**Request Body:**
```json
{
  "summary": "Memory summary",
  "content": "Full memory content",
  "keywords": ["keyword1", "keyword2"],
  "score": 10,           // optional
  "roomId": "cu...",     // optional
  "projectId": "cu..."   // optional
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "memory": { ... }
  }
}
```

---

### Extract Memory
Automatically extract a memory from content.

**Endpoint:** `POST /api/memory/extract`

**Request Body:**
```json
{
  "content": "Content to extract memory from",
  "roomId": "cu..."
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "memory": {
      "id": "cu...",
      "summary": "Extracted summary",
      "content": "Full content",
      "keywords": ["extracted", "keywords"],
      "score": 5,
      "source": "CHAT",
      "createdAt": "2026-03-31T10:00:00.000Z"
    }
  }
}
```

---

## 7. Health

### Root Endpoint
Get API information.

**Endpoint:** `GET /`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "name": "ChatSphere Rebuild API",
    "version": "1.0.0",
    "docs": "/api/health"
  }
}
```

---

### Health Check
Check API and database health.

**Endpoint:** `GET /api/health`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "chatsphere-rebuild",
    "timestamp": "2026-03-31T10:00:00.000Z"
  }
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `USER_ALREADY_EXISTS` | User with email/username already exists |
| `INVALID_CREDENTIALS` | Invalid email or password |
| `INVALID_REFRESH_TOKEN` | Refresh token is invalid or expired |
| `USER_NOT_FOUND` | User not found |
| `ROOM_NOT_FOUND` | Room not found |
| `NOT_A_MEMBER` | User is not a member of the room |
| `NOT_AN_ADMIN` | User is not an admin of the room |
| `CANNOT_LEAVE_OWNER` | Room owner cannot leave |
| `MESSAGE_NOT_FOUND` | Message not found |
| `DATABASE_CONFLICT` | Database constraint violation |
| `INTERNAL_SERVER_ERROR` | Unexpected server error |