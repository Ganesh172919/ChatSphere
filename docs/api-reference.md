# REST API Reference

Base URL (Development): `http://localhost:3000/api`

Most endpoints (except login, register, refresh, and OAuth) require an `Authorization` header with a valid JWT Bearer token:
`Authorization: Bearer <your_access_token>`

---

## Auth Endpoints (`/api/auth`)

### `POST /register`
Creates a new local user account.
- **Body**: `{ username, email, password }`
- **Response (201)**: `{ user, accessToken, refreshToken }`
- **Errors**: `400` (Validation), `409` (Conflict)

### `POST /login`
Authenticates an existing local user.
- **Body**: `{ email, password }`
- **Response (200)**: `{ user, accessToken, refreshToken }`
- **Errors**: `400` (Missing fields), `401` (Invalid credentials / Google Auth required)

### `POST /refresh`
Obtains a new Access Token using a valid Refresh Token.
- **Body**: `{ refreshToken }`
- **Response (200)**: `{ accessToken, refreshToken }`
- **Errors**: `400` (Missing), `403` (Invalid or Expired)

### `POST /logout`
Logs out a user by invalidating the provided refresh token.
- **Body**: `{ refreshToken }`
- **Response (200)**: `{ message: "Logged out successfully" }`

### `GET /me`
Returns the currently authenticated user's profile.
- **Headers**: `Authorization: Bearer ...`
- **Response (200)**: `User Object`

### `GET /google`
Initiates the Google OAuth 2.0 flow. Redirects to Google consent screen.

### `GET /google/callback`
OAuth callback endpoint. Upon successful authentication, redirects to the `CLIENT_URL` with JWT tokens in query parameters.

---

## Solo Chat Endpoints (`/api/chat`)

### `POST /`
Sends a message to the Gemini AI in a solitary chat sequence.
- **Headers**: `Authorization: Bearer ...`
- **Body**: 
  ```json
  {
    "message": "User prompt text",
    "conversationId": "optional_existing_id",
    "history": []
  }
  ```
- **Response (200)**: 
  ```json
  {
    "conversationId": "string",
    "role": "model",
    "content": "AI formatted response",
    "timestamp": "ISO Date"
  }
  ```

---

## Conversations Endpoints (`/api/conversations`)

Manages the persistent history of Solo AI chats.

### `GET /`
Retrieves a list of all conversations for the authenticated user, sorted by most recently updated.
- **Response (200)**: Array of `{ id, title, messageCount, lastMessage, createdAt, updatedAt }`

### `GET /:id`
Retrieves the full message history for a specific conversation.
- **Response (200)**: `{ id, title, messages: [{ role, content, timestamp }], createdAt, updatedAt }`

### `DELETE /:id`
Deletes a specific conversation history.
- **Response (200)**: `{ message: "Conversation deleted" }`

---

## Rooms Endpoints (`/api/rooms`)

Manages Multiplayer Group Chat Rooms.

### `GET /`
Retrieves a list of all available rooms with message counts.
- **Response (200)**: Array of `{ id, name, description, tags, maxUsers, creatorId, messageCount, createdAt }`

### `POST /`
Creates a new room.
- **Body**: `{ name, description, tags: ["array"], maxUsers: number }`
- **Response (201)**: `Room Object`

### `GET /:id`
Retrieves room details and its 50 most recent messages.
- **Response (200)**: `{ id, ...roomMetadata, messages: [...] }`

### `DELETE /:id`
Deletes a room and purges all messages. *Creator only.*
- **Response (200)**: `{ message: "Room deleted successfully" }`
- **Errors**: `403` (Unauthorized), `404` (Not Found)

---

## Dashboard Endpoints (`/api/dashboard`)

### `GET /`
Returns aggregated stats and activity feed for the authenticated user.
- **Response (200)**:
  ```json
  {
    "stats": {
      "totalConversations": 12,
      "totalRooms": 5,
      "totalMessagesSent": 148,
      "messagesToday": 7,
      "onlineUsers": 3
    },
    "recentRooms": [
      { "id": "...", "name": "...", "description": "...", "tags": [], "createdAt": "..." }
    ],
    "activity": [
      { "id": "...", "type": "message|ai_response", "content": "...", "roomName": "...", "username": "...", "timestamp": "..." }
    ]
  }
  ```

---

## Users Endpoints (`/api/users`)

### `PUT /profile`
Updates the authenticated user's profile.
- **Body**: `{ displayName?, bio?, avatar? }`
- **Constraints**: displayName max 50 chars, bio max 200 chars, avatar max ~375KB
- **Response (200)**: Updated `User Object`

### `GET /:id`
Returns a user's public profile.
- **Response (200)**:
  ```json
  {
    "id": "string",
    "username": "string",
    "displayName": "string",
    "bio": "string",
    "avatar": "string|null",
    "onlineStatus": "online|away|offline",
    "lastSeen": "ISO Date",
    "createdAt": "ISO Date"
  }
  ```

---

## Search Endpoints (`/api/search`)

### `GET /messages`
Full-text search across messages using MongoDB text indexes.
- **Query Params**:
  - `q` (required): Search query text
  - `roomId`: Filter by room
  - `userId`: Filter by sender
  - `startDate`, `endDate`: Date range filter
  - `page` (default: 1), `limit` (default: 20): Pagination
- **Response (200)**:
  ```json
  {
    "results": [
      { "id": "...", "content": "...", "username": "...", "roomId": "...", "roomName": "...", "isAI": false, "timestamp": "...", "score": 1.5 }
    ],
    "total": 42,
    "page": 1,
    "totalPages": 3
  }
  ```
- **Errors**: `400` (Missing query)

---

## AI Tool Endpoints (`/api/ai`)

### `POST /smart-replies`
Generates 3 contextual quick-reply suggestions.
- **Body**: `{ messages: [{ username, content }], context?: "string" }`
- **Response (200)**: `{ suggestions: ["reply1", "reply2", "reply3"] }`

### `POST /sentiment`
Analyzes the sentiment of a message.
- **Body**: `{ text: "message text" }`
- **Response (200)**: `{ sentiment: "positive|negative|neutral|excited|confused|angry", confidence: 0.85, emoji: "😊" }`

### `POST /grammar`
Checks a message for grammar and spelling errors.
- **Body**: `{ text: "message text" }` (min 3 chars)
- **Response (200)**: `{ corrected: "fixed text"|null, suggestions: ["explanation"] }`

---

## Settings Endpoints (`/api/settings`)

### `GET /`
Returns the authenticated user's settings.
- **Response (200)**: Settings object (see below)

### `PUT /`
Updates user settings. All fields are optional; only provided fields are updated.
- **Body**:
  ```json
  {
    "theme": { "mode": "dark|light|system", "customTheme": "string" },
    "accentColor": "#A855F7",
    "notifications": { "sound": true, "desktop": true, "mentions": true, "replies": true },
    "aiFeatures": { "smartReplies": true, "sentimentAnalysis": false, "grammarCheck": false }
  }
  ```
- **Response (200)**: Updated settings object

---

## Polls Endpoints (`/api/polls`)

### `POST /`
Creates a new poll in a room.
- **Body**:
  ```json
  {
    "roomId": "string",
    "question": "string (max 500 chars)",
    "options": ["Option A", "Option B"],
    "allowMultipleVotes": false,
    "isAnonymous": false,
    "expiresInMinutes": 60
  }
  ```
- **Constraints**: 2–10 options, option text max 200 chars
- **Response (201)**: Formatted poll object

### `GET /room/:roomId`
Lists the 20 most recent polls for a room.
- **Response (200)**: Array of formatted poll objects

### `POST /:id/vote`
Toggles a vote on a poll option. If not allowing multiple votes, previous votes are removed.
- **Body**: `{ optionIndex: 0 }`
- **Response (200)**: Updated poll object
- **Errors**: `400` (Closed/expired/invalid), `404` (Not found)

### `POST /:id/close`
Closes a poll. *Creator only.*
- **Response (200)**: Updated poll object
- **Errors**: `403` (Not creator), `404` (Not found)

---

## Groups Endpoints (`/api/groups`)

Room member and role management.

### `GET /:roomId/members`
Lists all members of a room with their roles and online status.
- **Response (200)**:
  ```json
  [
    {
      "userId": "string",
      "username": "string",
      "displayName": "string",
      "avatar": "string|null",
      "onlineStatus": "online|offline",
      "role": "admin|moderator|member",
      "isCreator": true,
      "joinedAt": "ISO Date"
    }
  ]
  ```

### `PUT /:roomId/members/:userId/role`
Updates a member's role. *Creator or admin only.* Only the creator can assign admin role.
- **Body**: `{ role: "admin|moderator|member" }`
- **Response (200)**: `{ userId, role, message }`
- **Errors**: `403` (Insufficient permissions)

### `DELETE /:roomId/members/:userId`
Removes (kicks) a member from a room. *Creator, admin, or moderator.* Moderators cannot kick admins.
- **Response (200)**: `{ message: "Member removed successfully" }`
- **Errors**: `403` (Insufficient permissions)

---

## Moderation Endpoints (`/api/moderation`)

### `POST /report`
Submits a report against a user or message.
- **Body**:
  ```json
  {
    "targetType": "user|message",
    "targetId": "string",
    "roomId": "optional string",
    "reason": "spam|harassment|hate_speech|inappropriate_content|impersonation|other",
    "description": "optional details (max 1000 chars)"
  }
  ```
- **Response (201)**: `{ id, message: "Report submitted successfully..." }`
- **Errors**: `400` (Self-report, invalid reason), `409` (Duplicate pending report)

### `POST /block`
Blocks a user.
- **Body**: `{ userId: "string" }`
- **Response (200)**: `{ message: "User blocked successfully" }`
- **Errors**: `400` (Self-block), `409` (Already blocked)

### `DELETE /block/:userId`
Unblocks a user.
- **Response (200)**: `{ message: "User unblocked successfully" }`

### `GET /blocked`
Returns the authenticated user's blocked users list.
- **Response (200)**: Array of `{ userId, username, displayName, avatar }`

---

## Export Endpoints (`/api/export`)

### `GET /conversations`
Exports all solo conversations for the authenticated user as a JSON download.
- **Response**: JSON file download (`chatsphere-conversations.json`)
- **Content**: `{ exportedAt, userId, username, type, conversations: [...], totalConversations }`

### `GET /rooms/:roomId`
Exports all messages from a room as a JSON download.
- **Response**: JSON file download (`chatsphere-room-{name}.json`)
- **Content**: `{ exportedAt, exportedBy, type, room: {...}, messages: [...], totalMessages }`

---

## Admin Endpoints (`/api/admin`)

*All admin endpoints require JWT auth + `isAdmin: true` on the user.*

### `GET /stats`
Returns global platform statistics.
- **Response (200)**:
  ```json
  {
    "totalUsers": 150,
    "totalRooms": 25,
    "totalMessages": 5000,
    "pendingReports": 3,
    "onlineUsers": 12,
    "recentUsers": [...]
  }
  ```

### `GET /reports`
Lists reports with filtering and pagination.
- **Query Params**: `status` (pending|reviewed|action_taken|dismissed|all), `page`, `limit`
- **Response (200)**: `{ reports: [...], total, page, totalPages }`

### `PUT /reports/:id`
Reviews/resolves a report.
- **Body**: `{ status: "reviewed|action_taken|dismissed", reviewNote?: "string" }`
- **Response (200)**: `{ id, status, message }`

### `GET /users`
Lists all users with optional search and pagination.
- **Query Params**: `q` (search), `page`, `limit`
- **Response (200)**: `{ users: [...], total, page, totalPages }`

---

## Analytics Endpoints (`/api/analytics`)

### `GET /messages`
Daily message counts over a configurable period.
- **Query Params**: `days` (default 30, max 90)
- **Response (200)**: `{ data: [{ date: "2024-01-15", count: 42 }], total: 580 }`

### `GET /users`
Daily active user counts (unique message senders).
- **Query Params**: `days` (default 30, max 90)
- **Response (200)**: `{ data: [{ date: "2024-01-15", count: 8 }] }`

### `GET /rooms`
Top rooms ranked by total message count.
- **Query Params**: `limit` (default 10, max 20)
- **Response (200)**: `{ data: [{ roomId, name, description, messageCount, lastActivity }] }`

---

## Health Check

### `GET /api/health`
Returns server health status. No authentication required.
- **Response (200)**: `{ status: "ok", timestamp: "ISO Date", db: "mongodb" }`
