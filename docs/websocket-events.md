# ChatSphere WebSocket Events

ChatSphere uses Socket.IO on the backend server:

- socket URL: `ws://localhost:3000`
- auth: JWT access token in the handshake

Example client connection shape:

```ts
io('http://localhost:3000', {
  auth: {
    token: accessToken,
  },
});
```

## Connection Rules

- the socket connection is authenticated by `backend/middleware/socketAuth.js`
- invalid or expired tokens reject the connection
- the frontend reconnects the socket after token refresh
- presence and typing state are tracked in memory on the server
- flood control rejects spammy bursts of events

## Ack Pattern

Most room actions now support an ack callback. The common shape is:

```json
{
  "success": true
}
```

or

```json
{
  "success": false,
  "error": "Human readable message"
}
```

The frontend uses this in `frontend/src/hooks/useSocket.ts` so UI actions can show reliable success and error states.

## Client To Server Events

### `authenticate`

Confirms the socket is attached to a valid user.

Ack success payload:

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
{
  "roomId": "room-id"
}
```

Rules:

- room id must be valid
- the user must already be a room member
- the socket leaves previous joined rooms before joining the new one

Side effects:

- updates room presence
- clears stale typing state
- marks eligible unread messages as `delivered`
- emits `user_joined` and `room_users`

### `leave_room`

Payload:

```json
{
  "roomId": "room-id"
}
```

Leaves the currently joined room and clears typing state.

### `typing_start`

Payload:

```json
{
  "roomId": "room-id"
}
```

Rules:

- the socket must already be joined to the room

### `typing_stop`

Payload:

```json
{
  "roomId": "room-id"
}
```

### `send_message`

Payload:

```json
{
  "roomId": "room-id",
  "content": "Hello team",
  "fileUrl": "/api/uploads/abc.png",
  "fileName": "design.png",
  "fileType": "image/png",
  "fileSize": 123456
}
```

Rules:

- room membership is required
- the socket must already be joined to the room
- message text or a valid attachment is required
- attachment metadata must match the upload rules

Ack success includes the new message payload.

### `reply_message`

Payload:

```json
{
  "roomId": "room-id",
  "content": "Reply text",
  "replyToId": "message-id"
}
```

Rules:

- room membership is required
- the socket must already be joined to the room
- the parent message must belong to the same room
- blocked-user relationships stop the interaction

### `add_reaction`

Payload:

```json
{
  "roomId": "room-id",
  "messageId": "message-id",
  "emoji": "👍"
}
```

Rules:

- room membership is required
- message must belong to the room
- deleted messages cannot be reacted to
- blocked-user relationships stop the interaction

Allowed reactions are currently:

- `👍`
- `🔥`
- `🤯`
- `💡`

### `mark_read`

Payload:

```json
{
  "roomId": "room-id",
  "messageIds": ["message-id-1", "message-id-2"]
}
```

Rules:

- room membership is required
- the socket must already be joined to the room
- only valid messages from the same room are updated

### `trigger_ai`

Payload:

```json
{
  "roomId": "room-id",
  "prompt": "Summarize the discussion"
}
```

Rules:

- room membership is required
- the socket must already be joined to the room
- flood control applies

Side effects:

- emits `ai_thinking`
- appends prompt and response to room AI history
- persists an AI message
- emits `ai_response`

### `edit_message`

Payload:

```json
{
  "roomId": "room-id",
  "messageId": "message-id",
  "newContent": "Updated text"
}
```

Rules:

- room membership is required
- only the original sender can edit
- AI messages cannot be edited
- deleted messages cannot be edited
- edit window is controlled by `MESSAGE_EDIT_WINDOW_MINUTES`

The server stores edit metadata and pushes the previous content into `editHistory`.

### `delete_message`

Payload:

```json
{
  "roomId": "room-id",
  "messageId": "message-id"
}
```

Rules:

- room membership is required
- allowed for the message owner
- also allowed for room admins or moderators

Deletes are soft deletes. The message stays in history and is shown as a deleted placeholder.

### `pin_message`

Payload:

```json
{
  "roomId": "room-id",
  "messageId": "message-id"
}
```

Rules:

- room membership is required
- the socket must already be joined to the room
- only room admins or moderators can pin
- deleted messages cannot be pinned

### `unpin_message`

Payload:

```json
{
  "roomId": "room-id",
  "messageId": "message-id"
}
```

Rules:

- room membership is required
- the socket must already be joined to the room
- only room admins or moderators can unpin

## Server To Client Events

### `user_joined`

Payload:

```json
{
  "username": "ravi",
  "userId": "user-id"
}
```

### `user_left`

Payload:

```json
{
  "username": "ravi",
  "userId": "user-id"
}
```

### `room_users`

Payload:

```json
[
  {
    "id": "user-id",
    "username": "ravi"
  }
]
```

### `user_status_change`

Payload:

```json
{
  "userId": "user-id",
  "username": "ravi",
  "status": "online"
}
```

### `receive_message`

Broadcast when a new user message or reply is saved.

Important fields:

- `id`
- `userId`
- `username`
- `content`
- `timestamp`
- `replyTo`
- `reactions`
- `status`
- `isPinned`
- `isEdited`
- `editedAt`
- `isDeleted`
- `fileUrl`
- `fileName`
- `fileType`
- `fileSize`

### `reaction_update`

Payload:

```json
{
  "messageId": "message-id",
  "reactions": {
    "👍": ["user-id"]
  }
}
```

### `ai_thinking`

Payload:

```json
{
  "roomId": "room-id",
  "status": true
}
```

### `ai_response`

Broadcast when the group AI response is saved.

Important fields:

- `userId` is `ai`
- `username` uses the configured Gemini bot label
- `triggeredBy` contains the requesting username

### `typing_start`

Payload:

```json
{
  "userId": "user-id",
  "username": "ravi"
}
```

### `typing_stop`

Payload:

```json
{
  "userId": "user-id",
  "username": "ravi"
}
```

### `message_read`

Payload:

```json
{
  "messageIds": ["message-id"],
  "readBy": "user-id",
  "username": "ravi"
}
```

### `message_status_update`

Payload:

```json
{
  "messageId": "message-id",
  "status": "delivered"
}
```

### `message_edited`

Payload:

```json
{
  "messageId": "message-id",
  "content": "Updated text",
  "isEdited": true,
  "editedAt": "2026-03-28T10:00:00.000Z"
}
```

### `message_deleted`

Payload:

```json
{
  "messageId": "message-id",
  "deletedBy": "moderator-name"
}
```

### `message_pinned`

Payload:

```json
{
  "messageId": "message-id",
  "pinnedBy": "moderator-name",
  "message": {
    "id": "message-id",
    "content": "Pinned text",
    "username": "ravi",
    "timestamp": "2026-03-28T10:00:00.000Z",
    "pinnedBy": "moderator-name",
    "pinnedAt": "2026-03-28T10:00:00.000Z"
  }
}
```

### `message_unpinned`

Payload:

```json
{
  "messageId": "message-id"
}
```

### `error_message`

Emitted to the acting client when a socket action fails.

Payload:

```json
{
  "error": "Human readable message"
}
```
