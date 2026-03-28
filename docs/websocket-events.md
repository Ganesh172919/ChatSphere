# ChatSphere WebSocket Events

Socket.IO is served from the backend and proxied in local development through Vite.

Connection example:

```ts
io('/', {
  auth: {
    token: accessToken,
  },
});
```

## Ack Shape

Most client-to-server events return an ack payload:

```json
{
  "success": true
}
```

Error example:

```json
{
  "success": false,
  "error": "Human readable message"
}
```

## Client To Server Events

### `authenticate`

Ack:

```json
{
  "success": true,
  "user": {
    "id": "user-id",
    "username": "ravi"
  }
}
```

### `join_room`

Payload:

```json
"room-id"
```

Rules:

- user must already be a room member
- joining a new room leaves the previous joined room

### `leave_room`

Payload:

```json
"room-id"
```

### `typing_start`

```json
{
  "roomId": "room-id"
}
```

### `typing_stop`

```json
{
  "roomId": "room-id"
}
```

### `send_message`

```json
{
  "roomId": "room-id",
  "content": "Hello team",
  "fileUrl": "/api/uploads/example.png",
  "fileName": "example.png",
  "fileType": "image/png",
  "fileSize": 123456
}
```

Notes:

- room membership is required
- socket must already be joined to the room
- messages can create memory entries for the sending user
- room insight is refreshed after message persistence

### `reply_message`

```json
{
  "roomId": "room-id",
  "content": "Reply text",
  "replyToId": "message-id"
}
```

### `add_reaction`

```json
{
  "roomId": "room-id",
  "messageId": "message-id",
  "emoji": "👍"
}
```

Allowed reactions:

- `👍`
- `🔥`
- `🤯`
- `💡`

### `mark_read`

```json
{
  "roomId": "room-id",
  "messageIds": ["message-id-1", "message-id-2"]
}
```

### `trigger_ai`

```json
{
  "roomId": "room-id",
  "prompt": "Summarize the discussion",
  "modelId": "openai/gpt-4o-mini",
  "attachment": {
    "fileUrl": "/api/uploads/notes.txt",
    "fileName": "notes.txt",
    "fileType": "text/plain",
    "fileSize": 1024
  }
}
```

Notes:

- room membership is required
- flood control applies
- per-user AI quota applies
- the caller can choose the model via `modelId`
- the AI prompt can include one uploaded file attachment
- relevant user memory is retrieved before the AI request
- the saved AI reply can contain `memoryRefs`
- room insight is refreshed after the AI response is stored

### `edit_message`

```json
{
  "roomId": "room-id",
  "messageId": "message-id",
  "newContent": "Updated text"
}
```

### `delete_message`

```json
{
  "roomId": "room-id",
  "messageId": "message-id"
}
```

### `pin_message`

```json
{
  "roomId": "room-id",
  "messageId": "message-id"
}
```

### `unpin_message`

```json
{
  "roomId": "room-id",
  "messageId": "message-id"
}
```

## Server To Client Events

### `receive_message`

Example payload:

```json
{
  "id": "message-id",
  "userId": "user-id",
  "username": "ravi",
  "content": "Hello team",
  "timestamp": "2026-03-28T10:00:00.000Z",
  "replyTo": null,
  "reactions": {},
  "status": "sent",
  "memoryRefs": []
}
```

### `ai_thinking`

```json
{
  "roomId": "room-id",
  "status": true
}
```

### `ai_response`

```json
{
  "id": "message-id",
  "userId": "ai",
  "username": "Gemini",
  "content": "Here is the summary...",
  "timestamp": "2026-03-28T10:00:10.000Z",
  "isAI": true,
  "triggeredBy": "ravi",
  "modelId": "openai/gpt-4o-mini",
  "provider": "openrouter",
  "memoryRefs": [
    {
      "id": "memory-id",
      "summary": "The user prefers concise summaries.",
      "score": 0.72
    }
  ]
}
```

### `reaction_update`

### `message_status_update`

### `message_read`

### `message_edited`

### `message_deleted`

### `message_pinned`

### `message_unpinned`

### `typing_start`

### `typing_stop`

### `room_users`

### `user_joined`

### `user_left`

### `user_status_change`

### `error_message`

```json
{
  "error": "Human readable socket error"
}
```
