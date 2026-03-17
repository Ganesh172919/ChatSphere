# WebSocket Events Reference

ChatSphere utilizes Socket.IO for real-time bidirectional communication. The connection endpoints is `ws://localhost:3000` (or as configured in environment).

All Socket.IO connections require authentication. A valid JWT Access Token must be provided in the handshake auth object or headers.

## Client-to-Server Events (Emitted by Client)

### `authenticate`
Verifies the current socket connection is attached to a valid user.
- **Payload**: None
- **Callback Returns**: `{ success: true, user: { id, username, ... } }`

### `join_room`
Requests to join a specific group chat room. Automatically leaves any previously joined rooms.
- **Payload**: `roomId` (String)

### `leave_room`
Requests to explicitly leave a group chat room without joining another.
- **Payload**: `roomId` (String)

### `send_message`
Dispatches a standard text message to the currently joined room.
- **Payload**: 
  ```json
  {
    "roomId": "string",
    "content": "string"
  }
  ```

### `reply_message`
Dispatches a message that explicitly replies to another message.
- **Payload**: 
  ```json
  {
    "roomId": "string",
    "content": "string",
    "replyToId": "string"
  }
  ```

### `add_reaction`
Toggles an emoji reaction on a specific message. If the user already reacted with that emoji, it removes it.
- **Payload**: 
  ```json
  {
    "roomId": "string",
    "messageId": "string",
    "emoji": "string"
  }
  ```

### `trigger_ai`
Invokes the Gemini AI assistant to respond to a prompt within the context of the room.
- **Payload**: 
  ```json
  {
    "roomId": "string",
    "prompt": "string"
  }
  ```

---

## Server-to-Client Events (Listened by Client)

### `user_joined`
Broadcast to a room when a new user joints.
- **Payload**: `{ username: string, userId: string }`

### `user_left`
Broadcast to a room when a user leaves or disconnects.
- **Payload**: `{ username: string, userId: string }`

### `room_users`
Broadcast to a room whenever the roster of online users changes (join/leave/disconnect).
- **Payload**: Array of `{ id: string, username: string }`

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
    "isAI": false
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
Broadcast to a room to show an active typing indicator for the AI.
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
    "triggeredBy": "string (username who asked)"
  }
  ```

### `error_message`
Emitted to the specific client if an action fails (e.g., trying to join a non-existent room).
- **Payload**: `{ error: string }`
