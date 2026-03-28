# ChatSphere REST API Reference

## Base URLs

- frontend: `http://localhost:5173`
- backend: `http://localhost:3000`
- API base: `http://localhost:3000/api`

Unless noted otherwise, protected routes require:

```http
Authorization: Bearer <access-token>
```

## Auth

### `POST /api/auth/register`

Create a local account.

Body:

```json
{
  "username": "ravi",
  "email": "ravi@example.com",
  "password": "secret123"
}
```

Returns:

- `201` with `user`, `accessToken`, `refreshToken`

Notes:

- username is normalized to lowercase
- email is normalized to lowercase
- auth rate limiting applies

### `POST /api/auth/login`

Log in with email and password.

Body:

```json
{
  "email": "ravi@example.com",
  "password": "secret123"
}
```

Returns:

- `200` with `user`, `accessToken`, `refreshToken`

### `POST /api/auth/refresh`

Rotate tokens.

Body:

```json
{
  "refreshToken": "..."
}
```

Returns:

- `200` with new `accessToken` and `refreshToken`

### `POST /api/auth/logout`

Invalidate the submitted refresh token.

### `GET /api/auth/me`

Return the currently signed-in user.

### `POST /api/auth/forgot-password`

Start the reset-password flow.

Body:

```json
{
  "email": "ravi@example.com"
}
```

Returns the same success message whether the account exists or not.

### `POST /api/auth/reset-password`

Finish the reset-password flow.

Body:

```json
{
  "email": "ravi@example.com",
  "token": "reset-token",
  "newPassword": "new-secret123"
}
```

### `GET /api/auth/google`

Start Google OAuth.

### `GET /api/auth/google/callback`

OAuth callback used by Google. This route redirects to the frontend callback page with a short-lived login code, not with JWT tokens.

### `POST /api/auth/google/exchange`

Exchange the short-lived Google login code for app tokens.

Body:

```json
{
  "code": "one-time-google-login-code"
}
```

Returns:

- `200` with `user`, `accessToken`, `refreshToken`

## Solo AI Chat

### `POST /api/chat`

Send a solo chat prompt to Gemini and persist the conversation.

Body:

```json
{
  "message": "Explain WebSockets simply",
  "conversationId": "optional-conversation-id",
  "history": []
}
```

Returns:

```json
{
  "conversationId": "conversation-id",
  "role": "model",
  "content": "AI response text",
  "timestamp": "2026-03-28T10:00:00.000Z"
}
```

## Conversations

### `GET /api/conversations`

List the current user's saved solo conversations.

### `GET /api/conversations/:id`

Load one solo conversation.

### `DELETE /api/conversations/:id`

Delete one solo conversation.

## Rooms

### `GET /api/rooms`

List rooms with summary data.

Returned room fields include:

- `id`
- `name`
- `description`
- `tags`
- `maxUsers`
- `memberCount`
- `creatorId`
- `createdAt`
- `messageCount`
- `isMember`
- `currentUserRole`

### `POST /api/rooms`

Create a room.

Body:

```json
{
  "name": "Project Room",
  "description": "Release prep",
  "tags": ["project", "release"],
  "maxUsers": 20
}
```

### `POST /api/rooms/:id/join`

Join a room if:

- the room exists
- the user is not already a member
- capacity is not full

### `POST /api/rooms/:id/leave`

Leave a room. The room creator cannot leave their own room.

### `GET /api/rooms/:id`

Load room details and the most recent 50 messages.

Membership is required.

Message payloads can include:

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

### `DELETE /api/rooms/:id`

Delete a room. Creator only.

### `POST /api/rooms/:id/pin/:messageId`

Pin a message. Admin or moderator only.

### `DELETE /api/rooms/:id/pin/:messageId`

Unpin a message. Admin or moderator only.

### `GET /api/rooms/:id/pinned`

List pinned messages for a room. Membership is required.

## Uploads

### `POST /api/uploads`

Upload a file for chat use.

Accepted mime types:

- `image/jpeg`
- `image/png`
- `image/gif`
- `image/webp`
- `application/pdf`
- `text/plain`

Current size limit:

- `5 MB`

Returns:

```json
{
  "fileUrl": "/api/uploads/generated-file-name.png",
  "fileName": "screenshot.png",
  "fileType": "image/png",
  "fileSize": 123456
}
```

### `GET /api/uploads/:filename`

Serve an uploaded file.

## Group Members

### `GET /api/groups/:roomId/members`

List room members. Membership is required.

### `PUT /api/groups/:roomId/members/:userId/role`

Update a member's role.

Allowed roles:

- `admin`
- `moderator`
- `member`

Only room managers with enough permission can change roles.

### `DELETE /api/groups/:roomId/members/:userId`

Kick a member from a room if the acting user has permission.

## Polls

### `POST /api/polls`

Create a poll in a room.

Body:

```json
{
  "roomId": "room-id",
  "question": "Which release date works best?",
  "options": ["Monday", "Friday"],
  "allowMultipleVotes": false,
  "isAnonymous": false,
  "expiresInMinutes": 60
}
```

Rules:

- room membership is required
- at least 2 options
- max 10 options
- option text must be unique

### `GET /api/polls/room/:roomId`

List recent polls for a room. Membership is required.

### `POST /api/polls/:id/vote`

Vote or unvote on a poll option.

Body:

```json
{
  "optionIndex": 0
}
```

Rules:

- membership is required
- expired polls reject voting
- duplicate votes are prevented correctly

### `POST /api/polls/:id/close`

Close a poll.

Allowed actors:

- poll creator
- room admin
- room moderator

## Search

### `GET /api/search/messages`

Search room messages the current user is allowed to see.

Query params:

- `q` required
- `roomId`
- `userId`
- `startDate`
- `endDate`
- `isAI=true`
- `isPinned=true`
- `hasFile=true`
- `fileType=image/png`
- `page`
- `limit`

Notes:

- only joined rooms are searched
- blocked users are filtered out
- deleted messages are excluded

### `GET /api/search/conversations`

Search solo AI conversations by title or message content.

Query params:

- `q` required
- `page`
- `limit`

## Moderation

### `POST /api/moderation/report`

Create a moderation report for a user or message.

Body:

```json
{
  "targetType": "message",
  "targetId": "message-id",
  "roomId": "room-id",
  "reason": "spam",
  "description": "Optional extra detail"
}
```

Allowed reasons:

- `spam`
- `harassment`
- `hate_speech`
- `inappropriate_content`
- `impersonation`
- `other`

### `POST /api/moderation/block`

Block a user.

### `DELETE /api/moderation/block/:userId`

Unblock a user.

### `GET /api/moderation/blocked`

List blocked users.

## Settings

### `GET /api/settings`

Load the current user's settings.

### `PUT /api/settings`

Update supported setting groups:

- `theme`
- `accentColor`
- `notifications`
- `aiFeatures`

## Export

### `GET /api/export/conversations`

Export the current user's solo conversations as JSON.

### `GET /api/export/rooms/:roomId`

Export room messages as JSON.

Rules:

- room membership is required
- deleted messages are exported as `[deleted]`
- attachment metadata is included when present

## Admin And Analytics

These routes stay protected behind authenticated admin access where applicable:

- `/api/admin/*`
- `/api/analytics/*`

Use the frontend API wrappers in `frontend/src/api/admin.ts` and `frontend/src/api/analytics.ts` as the current contract reference for those screens.
