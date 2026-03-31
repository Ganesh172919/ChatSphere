# ChatSphere WebSocket Events

Socket.IO is served from the backend and used mainly for room presence, room messaging, and room AI.

Connection example:

```ts
io('/', {
  auth: {
    token: accessToken,
  },
});
```

## Ack Shape

Most client-to-server events return:

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

Returns the authenticated user summary.

### `join_room`

Payload:

```json
"room-id"
```

Notes:

- validates room existence
- can auto-add the user to the room if capacity allows
- leaving one room join can remove the socket from previously joined rooms

### `leave_room`

### `typing_start`

### `typing_stop`

### `send_message`

Persists a normal room message and refreshes room insight.

### `reply_message`

### `add_reaction`

Allowed reactions:

- `??`
- `??`
- `??`
- `??`

### `mark_read`

### `trigger_ai`

Notes:

- requires room membership
- requires the socket to be joined to the room
- applies socket flood control
- applies in-memory AI quota
- loads relevant memories for the triggering user
- loads current room insight
- persists the AI reply as a normal room message with `isAI`, `memoryRefs`, `modelId`, and `provider`
- updates `Room.aiHistory`

### `edit_message`

### `delete_message`

### `pin_message`

### `unpin_message`

## Server To Client Events

- `receive_message`
- `ai_thinking`
- `ai_response`
- `reaction_update`
- `message_status_update`
- `message_read`
- `message_edited`
- `message_deleted`
- `message_pinned`
- `message_unpinned`
- `typing_start`
- `typing_stop`
- `room_users`
- `user_joined`
- `user_left`
- `user_status_change`
- `error_message`
