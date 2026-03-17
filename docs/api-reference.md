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
    "history": [] // Optional array of { role, parts: [{text}] }
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
- **Headers**: `Authorization: Bearer ...`
- **Response (200)**: Array of `{ id, title, messageCount, lastMessage, createdAt, updatedAt }`

### `GET /:id`
Retrieves the full message history for a specific conversation.
- **Headers**: `Authorization: Bearer ...`
- **Response (200)**: `{ id, title, messages: [{ role, content, timestamp }], createdAt, updatedAt }`

### `DELETE /:id`
Deletes a specific conversation history.
- **Headers**: `Authorization: Bearer ...`
- **Response (200)**: `{ message: "Conversation deleted" }`

---

## Rooms Endpoints (`/api/rooms`)

Manages Multiplayer Group Chat Rooms.

### `GET /`
Retrieves a list of all available rooms. Includes total message counts for each.
- **Headers**: `Authorization: Bearer ...`
- **Response (200)**: Array of `{ id, name, description, tags, maxUsers, creatorId, messageCount, createdAt }`

### `POST /`
Creates a newly persistent room.
- **Headers**: `Authorization: Bearer ...`
- **Body**: `{ name, description, tags: ["array"], maxUsers: number }`
- **Response (201)**: `Room Object`

### `GET /:id`
Retrieves room details and its 50 most recent messages.
- **Headers**: `Authorization: Bearer ...`
- **Response (200)**: 
  ```json
  {
    "id": "string",
    // ... room metadata,
    "messages": [
      // array of latest 50 Message objects chronological
    ]
  }
  ```

### `DELETE /:id`
Deletes an entire room and purges all of its messages. *Can only be called by the room's original creator.*
- **Headers**: `Authorization: Bearer ...`
- **Response (200)**: `{ message: "Room deleted successfully" }`
- **Errors**: `403` (Unauthorized), `404` (Not Found)
