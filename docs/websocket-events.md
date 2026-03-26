# WebSocket Events Reference

ChatSphere utilizes Socket.IO for real-time bidirectional communication. The connection endpoint is `ws://localhost:3000` (or as configured in environment).

All Socket.IO connections require authentication. A valid JWT Access Token must be provided in the handshake auth object.

## Connection Lifecycle

On successful connection:
1. User is added to the global online users map
2. User's `onlineStatus` is updated to `'online'` in MongoDB
3. A `user_status_change` event is broadcast to all clients with status `'online'`

On disconnect:
1. User is removed from global online users and all rooms
2. User's `onlineStatus` is updated to `'offline'` in MongoDB
3. `user_status_change` is broadcast with status `'offline'`
4. `user_left` + `room_users` events are sent to each room the user was in
5. Typing state is cleared in all rooms

---

## Client-to-Server Events (Emitted by Client)

### `authenticate`
Verifies the current socket connection is attached to a valid user.
- **Payload**: None
- **Callback Returns**: `{ success: true, user: { id, username, ... } }`

### `join_room`
Requests to join a specific group chat room. Automatically leaves any previously joined rooms.
- **Payload**: `roomId` (String)
- **Side Effects**: 
  - Leaves all previous rooms (emitting `user_left` / `room_users` to each)
  - Joins the new room
  - Marks unread messages as `delivered`
  - Broadcasts `user_joined` + `room_users` to the room

### `leave_room`
Requests to explicitly leave a group chat room without joining another.
- **Payload**: `roomId` (String)

### `send_message`
Dispatches a standard text message to the currently joined room. Persists to MongoDB.
- **Payload**: 
  ```json
  { "roomId": "string", "content": "string" }
  ```
- **Side Effects**: Clears typing state, auto-sets status to `delivered` if other users are in room

### `reply_message`
Dispatches a message that explicitly replies to another message. Persists to MongoDB.
- **Payload**: 
  ```json
  { "roomId": "string", "content": "string", "replyToId": "string" }
  ```
- **Side Effects**: Looks up parent message for reply preview (first 100 chars), clears typing state

### `add_reaction`
Toggles an emoji reaction on a specific message. If the user already reacted with that emoji, it removes it.
- **Payload**: 
  ```json
  { "roomId": "string", "messageId": "string", "emoji": "string" }
  ```

### `trigger_ai`
Invokes the Gemini AI assistant to respond to a prompt within the context of the room.
- **Payload**: 
  ```json
  { "roomId": "string", "prompt": "string" }
  ```
- **Side Effects**: 
  - Emits `ai_thinking` (status: true) immediately
  - Processes through Gemini with room AI history
  - Appends user prompt and AI response to room's `aiHistory` (trims to last 40 entries)
  - Persists AI message to MongoDB
  - Emits `ai_thinking` (status: false) + `ai_response`
  - On error: persists error message and emits it as `ai_response`

### `typing_start`
Broadcasts that the user has started typing to other users in the room.
- **Payload**: `{ roomId: "string" }`
- **Side Effects**: Auto-expires after 3 seconds if no subsequent `typing_start` event

### `typing_stop`
Broadcasts that the user has stopped typing.
- **Payload**: `{ roomId: "string" }`

### `mark_read`
Marks specific messages as read by the current user.
- **Payload**: `{ roomId: "string", messageIds: ["string"] }`
- **Side Effects**: Updates message status to `read`, adds `readBy` entry, broadcasts `message_read`

### `pin_message`
Pins a message in a room for quick reference.
- **Payload**: `{ roomId: "string", messageId: "string" }`
- **Side Effects**: Sets `isPinned`, `pinnedBy`, `pinnedAt` on message; adds to room's `pinnedMessages` array; broadcasts `message_pinned`

### `unpin_message`
Removes a message from the pinned list.
- **Payload**: `{ roomId: "string", messageId: "string" }`
- **Side Effects**: Clears pin fields on message; removes from room's `pinnedMessages`; broadcasts `message_unpinned`

---

## Server-to-Client Events (Listened by Client)

### `user_joined`
Broadcast to a room when a new user joins.
- **Payload**: `{ username: string, userId: string }`

### `user_left`
Broadcast to a room when a user leaves or disconnects.
- **Payload**: `{ username: string, userId: string }`

### `room_users`
Broadcast to a room whenever the roster of online users changes (join/leave/disconnect).
- **Payload**: Array of `{ id: string, username: string }`

### `user_status_change`
Broadcast globally when any user's online status changes.
- **Payload**: `{ userId: string, username: string, status: "online"|"offline" }`

### `receive_message`
Broadcast to a room when a new user message is sent or replied.
- **Payload**: 
  ```json
  {
    "id": "string",
    "userId": "string",
    "username": "string",
    "content": "string",
    "timestamp": "string (ISO)",
    "reactions": {},
    "replyTo": null | { "id": "string", "username": "string", "content": "string" },
    "isAI": false,
    "status": "sent"
  }
  ```

### `reaction_update`
Broadcast to a room when a message gets a new reaction or loses one.
- **Payload**: 
  ```json
  {
    "messageId": "string",
    "reactions": { "👍": ["userId1", "userId2"] }
  }
  ```

### `ai_thinking`
Broadcast to a room to show/hide the AI typing indicator.
- **Payload**: `{ roomId: string, status: boolean }`

### `ai_response`
Broadcast to a room when the AI has finished generating its response.
- **Payload**: 
  ```json
  {
    "id": "string",
    "userId": "ai",
    "username": "GeminiX",
    "content": "string (markdown)",
    "timestamp": "string (ISO)",
    "reactions": {},
    "replyTo": null,
    "isAI": true,
    "triggeredBy": "string (username who asked)",
    "status": "delivered"
  }
  ```

### `typing_start`
Broadcast to a room when a user starts typing.
- **Payload**: `{ userId: string, username: string }`

### `typing_stop`
Broadcast to a room when a user stops typing (explicit or 3-second auto-expire).
- **Payload**: `{ userId: string, username: string }`

### `message_pinned`
Broadcast to a room when a message is pinned.
- **Payload**: 
  ```json
  {
    "messageId": "string",
    "pinnedBy": "string",
    "message": {
      "id": "string",
      "content": "string",
      "username": "string",
      "timestamp": "ISO Date",
      "pinnedBy": "string",
      "pinnedAt": "ISO Date"
    }
  }
  ```

### `message_unpinned`
Broadcast to a room when a message is unpinned.
- **Payload**: `{ messageId: string }`

### `message_read`
Broadcast to a room when messages are marked as read.
- **Payload**: `{ messageIds: [string], readBy: string, username: string }`

### `message_status_update`
Broadcast to a room when a message's delivery status changes.
- **Payload**: `{ messageId: string, status: "delivered" }`

### `error_message`
Emitted to the specific client if an action fails.
- **Payload**: `{ error: string }`
