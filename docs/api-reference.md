# ChatSphere REST API Reference

Base local API URL:

- `http://localhost:3000/api`

Protected routes require:

```http
Authorization: Bearer <access-token>
```

## AI-Relevant Routes

### `GET /api/ai/models`

Returns the visible model catalog for the current deployment.

Response fields:

- `models[]`: visible models with `id`, `label`, `provider`, and `supportsFiles`
- `defaultModelId`: the client-facing default, often `auto`
- `hasConfiguredModels`: optional deployment hint
- `emptyStateMessage`: optional UI message when no providers are configured

### `POST /api/chat`

Body:

```json
{
  "message": "Explain the backend AI flow",
  "conversationId": "optional-conversation-id",
  "history": [],
  "modelId": "auto",
  "attachment": {
    "fileUrl": "/api/uploads/example.txt",
    "fileName": "example.txt",
    "fileType": "text/plain",
    "fileSize": 1024
  },
  "projectId": "optional-project-id"
}
```

Response highlights:

- `conversationId`
- `content`
- `memoryRefs`
- `insight`
- `modelId`
- `provider`
- `requestedModelId`
- `processingMs`
- `promptTokens`
- `completionTokens`
- `totalTokens`
- `autoMode`
- `autoComplexity`
- `fallbackUsed`

### `POST /api/ai/smart-replies`

### `POST /api/ai/sentiment`

### `POST /api/ai/grammar`

## Conversation And Insight Routes

- `GET /api/conversations`
- `GET /api/conversations/:id`
- `GET /api/conversations/:id/insights`
- `POST /api/conversations/:id/actions/summarize`
- `POST /api/conversations/:id/actions/extract-tasks`
- `POST /api/conversations/:id/actions/extract-decisions`
- `DELETE /api/conversations/:id`

Conversation detail returns persisted assistant metadata including attachment fields, `memoryRefs`, `modelId`, `provider`, `requestedModelId`, token counts, and routing diagnostics.

## Room And Room Insight Routes

- `GET /api/rooms`
- `POST /api/rooms`
- `POST /api/rooms/:id/join`
- `POST /api/rooms/:id/leave`
- `GET /api/rooms/:id`
- `GET /api/rooms/:id/insights`
- `POST /api/rooms/:id/actions/summarize`
- `POST /api/rooms/:id/actions/extract-tasks`
- `POST /api/rooms/:id/actions/extract-decisions`
- `POST /api/rooms/:id/pin/:messageId`
- `DELETE /api/rooms/:id/pin/:messageId`
- `GET /api/rooms/:id/pinned`
- `DELETE /api/rooms/:id`

## Memory Routes

- `GET /api/memory?q=&pinned=&limit=`
- `PUT /api/memory/:id`
- `DELETE /api/memory/:id`
- `POST /api/memory/import`
- `GET /api/memory/export?format=normalized|markdown|adapter`

## Project Routes Used By Solo AI

- `GET /api/projects`
- `GET /api/projects/:id`
- `POST /api/projects`
- `PATCH /api/projects/:id`
- `DELETE /api/projects/:id`

## Settings Routes

- `GET /api/settings`
- `PUT /api/settings`

## Upload Route

### `POST /api/uploads`

Returns `fileUrl`, `fileName`, `fileType`, and `fileSize`.

## Export Routes

- `GET /api/export/conversations?format=normalized|markdown|adapter`
- `GET /api/export/conversation/:id?format=json|markdown`
- `GET /api/export/rooms/:roomId`

## Admin And Analytics Routes

- `GET /api/admin/stats`
- `GET /api/admin/reports`
- `PUT /api/admin/reports/:id`
- `GET /api/admin/users`
- `GET /api/admin/prompts`
- `PUT /api/admin/prompts/:key`
- `GET /api/analytics/messages`
- `GET /api/analytics/users`
- `GET /api/analytics/rooms`
