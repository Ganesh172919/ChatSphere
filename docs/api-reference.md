# ChatSphere REST API Reference

Base API URL in local development:

- `http://localhost:3000/api`

Protected routes require:

```http
Authorization: Bearer <access-token>
```

## Auth

### `POST /api/auth/register`

```json
{
  "username": "ravi",
  "email": "ravi@example.com",
  "password": "secret123"
}
```

Returns `user`, `accessToken`, and `refreshToken`.

### `POST /api/auth/login`

```json
{
  "email": "ravi@example.com",
  "password": "secret123"
}
```

### `POST /api/auth/refresh`

```json
{
  "refreshToken": "..."
}
```

### `POST /api/auth/logout`

### `GET /api/auth/me`

### `POST /api/auth/google/exchange`

```json
{
  "code": "one-time-google-login-code"
}
```

## Solo Chat

### `POST /api/chat`

```json
{
  "message": "Explain WebSockets simply",
  "conversationId": "optional-conversation-id",
  "history": []
}
```

Example response:

```json
{
  "conversationId": "conversation-id",
  "role": "model",
  "content": "AI response text",
  "timestamp": "2026-03-28T10:00:00.000Z",
  "memoryRefs": [
    {
      "id": "memory-id",
      "summary": "The user likes TypeScript.",
      "score": 0.78
    }
  ],
  "insight": {
    "title": "WebSocket discussion",
    "summary": "The user asked for a simple explanation of WebSockets.",
    "intent": "question-answering",
    "topics": ["websockets", "networking"],
    "decisions": [],
    "actionItems": []
  }
}
```

## Conversations

### `GET /api/conversations`

Returns summaries:

```json
[
  {
    "id": "conversation-id",
    "title": "Explain WebSockets simply",
    "sourceType": "native",
    "sourceLabel": "ChatSphere",
    "messageCount": 4,
    "lastMessage": "AI response text",
    "createdAt": "2026-03-28T10:00:00.000Z",
    "updatedAt": "2026-03-28T10:01:00.000Z"
  }
]
```

### `GET /api/conversations/:id`

Returns messages plus `memoryRefs` on assistant replies when relevant.

### `GET /api/conversations/:id/insights`

### `POST /api/conversations/:id/actions/summarize`

### `POST /api/conversations/:id/actions/extract-tasks`

### `POST /api/conversations/:id/actions/extract-decisions`

### `DELETE /api/conversations/:id`

## Rooms

### `GET /api/rooms`

### `POST /api/rooms`

```json
{
  "name": "Project Room",
  "description": "Release prep",
  "tags": ["project", "release"],
  "maxUsers": 20
}
```

### `POST /api/rooms/:id/join`

### `POST /api/rooms/:id/leave`

### `GET /api/rooms/:id`

Example response shape:

```json
{
  "id": "room-id",
  "name": "Project Room",
  "description": "Release prep",
  "tags": ["project", "release"],
  "messageCount": 12,
  "currentUserRole": "creator",
  "insight": {
    "title": "Room insight",
    "summary": "The room discussed release prep and next steps.",
    "intent": "discussion",
    "topics": ["release", "tasks"],
    "decisions": ["Ship after QA"],
    "actionItems": [
      {
        "text": "Collect QA feedback",
        "owner": "ravi",
        "done": false
      }
    ]
  },
  "messages": [
    {
      "id": "message-id",
      "userId": "user-id",
      "username": "ravi",
      "content": "Hello team",
      "timestamp": "2026-03-28T10:00:00.000Z",
      "reactions": {},
      "replyTo": null,
      "memoryRefs": []
    }
  ]
}
```

### `GET /api/rooms/:id/insights`

### `POST /api/rooms/:id/actions/summarize`

### `POST /api/rooms/:id/actions/extract-tasks`

### `POST /api/rooms/:id/actions/extract-decisions`

### `POST /api/rooms/:id/pin/:messageId`

### `DELETE /api/rooms/:id/pin/:messageId`

### `GET /api/rooms/:id/pinned`

### `DELETE /api/rooms/:id`

## Polls

### `POST /api/polls`

```json
{
  "roomId": "room-id",
  "question": "When should we ship?",
  "options": ["Today", "Tomorrow", "Next week"],
  "allowMultipleVotes": false,
  "isAnonymous": false,
  "expiresInMinutes": 60
}
```

### `GET /api/polls/room/:roomId`

### `POST /api/polls/:id/vote`

```json
{
  "optionIndex": 1
}
```

### `POST /api/polls/:id/close`

## AI Utility Routes

### `POST /api/ai/smart-replies`

```json
{
  "messages": [
    { "username": "ravi", "content": "Can you review the API docs?" }
  ],
  "context": "Group chat room: docs"
}
```

### `POST /api/ai/sentiment`

```json
{
  "text": "I think we're very close to shipping this."
}
```

### `POST /api/ai/grammar`

```json
{
  "text": "Can you checks this sentence?"
}
```

## Memory

### `GET /api/memory`

Query params:

- `q`
- `pinned`
- `limit`

### `PUT /api/memory/:id`

```json
{
  "summary": "The user prefers TypeScript for frontend work.",
  "details": "Mentioned while discussing the new dashboard.",
  "tags": ["typescript", "preferences"],
  "pinned": true
}
```

### `DELETE /api/memory/:id`

### `POST /api/memory/import`

Preview example:

```json
{
  "mode": "preview",
  "filename": "chatgpt-export.json",
  "content": "{ ... external export content ... }"
}
```

Import example:

```json
{
  "mode": "import",
  "filename": "claude-history.md",
  "content": "Human: ...\nAssistant: ..."
}
```

### `GET /api/memory/export?format=normalized|markdown|adapter`

## Export

### `GET /api/export/conversations?format=normalized|markdown|adapter`

### `GET /api/export/conversation/:id?format=json|markdown`

### `GET /api/export/rooms/:roomId`

## Settings

### `GET /api/settings`

### `PUT /api/settings`

```json
{
  "theme": {
    "mode": "dark",
    "customTheme": "midnight"
  },
  "accentColor": "#06B6D4",
  "notifications": {
    "sound": true,
    "desktop": true,
    "mentions": true,
    "replies": true
  },
  "aiFeatures": {
    "smartReplies": true,
    "sentimentAnalysis": true,
    "grammarCheck": true
  }
}
```

## Users

### `PUT /api/users/profile`

```json
{
  "displayName": "Ravi",
  "bio": "Shipping product and learning AI systems.",
  "avatar": "data:image/png;base64,..."
}
```

### `GET /api/users/:id`

## Dashboard, Search, Moderation

- `GET /api/dashboard`
- `GET /api/search`
- `GET /api/moderation/blocked`
- `POST /api/moderation/block/:userId`
- `DELETE /api/moderation/block/:userId`

## Uploads

### `POST /api/uploads`

Returns:

```json
{
  "fileUrl": "/api/uploads/abc123.png",
  "fileName": "design.png",
  "fileType": "image/png",
  "fileSize": 123456
}
```

## Admin and Analytics

These routes require an admin user.

- `GET /api/admin/stats`
- `GET /api/admin/reports`
- `PUT /api/admin/reports/:id`
- `GET /api/admin/users`
- `GET /api/admin/prompts`
- `PUT /api/admin/prompts/:key`
- `GET /api/analytics/overview`
- `GET /api/analytics/activity`
- `GET /api/analytics/growth`
