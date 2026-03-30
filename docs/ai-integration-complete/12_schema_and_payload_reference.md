# Schema and Payload Reference

## Purpose

This appendix captures backend AI-related persistence structures, HTTP payloads, socket payloads, and response envelopes.

It is intended to help engineers rebuild or validate the integration contract without re-reading the source tree line by line.

## 1. `User.settings`

### Why it matters

This is where the backend stores per-user AI feature policy.

### Relevant structure

```json
{
  "theme": "system",
  "accentColor": "teal",
  "notifications": {
    "email": true,
    "push": true,
    "mentions": true
  },
  "aiFeatures": {
    "smartReplies": true,
    "sentiment": true,
    "grammar": true
  }
}
```

### AI-specific meaning

- `smartReplies` gates `/api/ai/smart-replies`
- `sentiment` gates `/api/ai/sentiment`
- `grammar` gates `/api/ai/grammar`

## 2. `Conversation`

### Purpose

Stores solo AI chat sessions.

### Relevant fields

- `id`
- `userId`
- `title`
- `messages`
- `projectId`
- `importMetadata`
- `createdAt`
- `updatedAt`

### Important design choice

`messages` is JSON.

It is not a separate relational table.

### Example message item shape

```json
{
  "role": "assistant",
  "content": "Here is the architecture summary...",
  "timestamp": "2026-03-30T10:00:00.000Z",
  "memoryRefs": ["memory-id-1"],
  "modelTelemetry": {
    "provider": "openrouter",
    "selectedModel": "openai/gpt-4o-mini",
    "fallbackUsed": false,
    "complexity": "medium",
    "processingMs": 1820,
    "category": "provider"
  }
}
```

## 3. `ConversationInsight`

### Purpose

Stores compressed conversation or room summaries.

### Fields

- `scopeKey`
- `scopeType`
- `title`
- `summary`
- `intent`
- `topics`
- `decisions`
- `actionItems`
- `messageCount`
- `lastGeneratedAt`

### Scope behavior

- `conversation:{conversationId}` for solo chat
- `room:{roomId}` for room summaries

## 4. `MemoryEntry`

### Purpose

Stores long-lived user facts or preferences.

### Fields

- `summary`
- `details`
- `tags`
- `sourceReferences`
- `confidence`
- `importance`
- `recency`
- `pinned`
- `usageCount`
- `lastUsedAt`
- `fingerprint`

### Example row meaning

- `summary` is what gets injected most directly into prompts
- `details` can give richer human-editable context
- `importance` helps ranking
- `confidence` expresses extraction trust
- `usageCount` indicates real retrieval utility

## 5. `PromptTemplate`

### Purpose

Provides prompt governance and override capability.

### Fields

- `key`
- `version`
- `description`
- `content`
- `isActive`

### Current important keys

- `solo-chat`
- `group-chat`
- `memory-extract`
- `conversation-insight`
- `smart-replies`
- `sentiment`
- `grammar`

## 6. `Project`

### Purpose

Stores structured project context for solo AI chat.

### Relevant fields

- `name`
- `description`
- `instructions`
- `context`
- `tags`
- `suggestedPrompts`
- `files`

### AI meaning

The backend injects project fields directly into prompt text when a chat is associated with a project.

## 7. `Message`

### Purpose

Stores room chat messages, including AI messages.

### AI-relevant fields

- `isAI`
- `triggeredBy`
- `memoryRefs`
- `modelId`
- `modelProvider`
- `modelTelemetry`

### Example AI room message shape

```json
{
  "roomId": "room-uuid",
  "userId": "human-user-uuid",
  "username": "Display Name",
  "content": "AI-generated answer",
  "isAI": true,
  "triggeredBy": "human-user-uuid",
  "memoryRefs": ["memory-1", "memory-2"],
  "modelId": "gemini-2.5-flash",
  "modelProvider": "gemini"
}
```

## 8. `Room`

### AI-relevant field

- `aiHistory`

### Meaning

Stores trimmed prompt-response history entries for room AI.

### Limitation

It is not the main live context source during `trigger_ai` execution.

## 9. HTTP envelope pattern

### Success envelope

```json
{
  "success": true,
  "data": {}
}
```

### Failure envelope

```json
{
  "success": false,
  "error": {
    "code": "AI_QUOTA_EXCEEDED",
    "message": "AI quota exceeded. Please retry later.",
    "requestId": "uuid",
    "retryAfterMs": 30000
  }
}
```

## 10. `/api/chat` request schema details

### Required field

- `message: string(1..6000)`

### Optional fields

- `conversationId: uuid`
- `modelId: string(1..120)`
- `projectId: uuid`
- `attachment`

### Attachment payload fields

- `fileUrl`
- `fileName`
- `fileType`
- `fileSize`
- `textContent`
- `base64`

### Meaning of attachment fields

- `textContent` is the most practically useful field for current AI behavior
- `base64` for images is currently not passed as native multimodal content

## 11. `/api/chat` response schema details

### Fields returned by `handleSoloChat()`

- `conversationId`
- `content`
- `memoryRefs`
- `insight`
- `model`
- `usage`
- `telemetry`

### `model` object

- `provider`
- `id`
- `label`

### `usage` object

- `promptTokens`
- `completionTokens`
- `totalTokens`

### `telemetry` object

- `provider`
- `selectedModel`
- `fallbackUsed`
- `complexity`
- `processingMs`
- `category`

## 12. `/api/ai/models` response schema

### Shape

```json
{
  "success": true,
  "data": {
    "auto": {
      "id": "auto",
      "label": "Automatic routing",
      "provider": "router"
    },
    "models": []
  }
}
```

### Meaning

- `auto` is a frontend convenience selector
- `models` is env-derived backend catalog data

## 13. `/api/ai/smart-replies` request schema

### Request

```json
{
  "message": "Can you review this API design?",
  "modelId": "optional-model-id"
}
```

### Typical response

```json
{
  "success": true,
  "data": {
    "replies": [
      "Yes, share the route details.",
      "I can review the schema next.",
      "Send the payload example too."
    ],
    "model": {
      "provider": "openrouter",
      "id": "model-id",
      "label": "OpenRouter Default"
    },
    "usage": {
      "promptTokens": 12,
      "completionTokens": 20,
      "totalTokens": 32
    }
  }
}
```

### Fallback behavior contract

If JSON parsing fails, `replies` still returns an array, but it may contain a single raw response string.

## 14. `/api/ai/sentiment` request and response

### Request

```json
{
  "message": "I'm worried this deploy is going to fail.",
  "modelId": "optional-model-id"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "label": "negative",
    "confidence": 0.82,
    "reason": "The language signals concern and risk.",
    "model": {
      "provider": "gemini",
      "id": "gemini-2.5-flash",
      "label": "Gemini"
    },
    "usage": {
      "promptTokens": 11,
      "completionTokens": 17,
      "totalTokens": 28
    }
  }
}
```

### Fallback contract

On parse failure or provider failure, the backend still returns a valid shape with `label`, `confidence`, and `reason`.

## 15. `/api/ai/grammar` request and response

### Request

```json
{
  "message": "please check this sentence and make it more professional"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "improved": "Please review this sentence and make it more professional.",
    "model": {
      "provider": "openrouter",
      "id": "model-id",
      "label": "OpenRouter Default"
    },
    "usage": {
      "promptTokens": 16,
      "completionTokens": 18,
      "totalTokens": 34
    }
  }
}
```

## 16. Socket payload: `trigger_ai`

### Input schema

- `roomId: uuid`
- `prompt: string(1..6000)`
- `modelId?: string(<=120)`

### Example emit payload

```json
{
  "roomId": "room-uuid",
  "prompt": "Summarize the last 10 minutes and extract decisions.",
  "modelId": "auto"
}
```

### Ack response on success

```json
{
  "success": true,
  "data": {
    "message": {
      "id": "message-uuid",
      "isAI": true,
      "content": "Here is the summary..."
    },
    "model": {
      "provider": "gemini",
      "id": "gemini-2.5-flash",
      "label": "Gemini"
    },
    "usage": {
      "promptTokens": 210,
      "completionTokens": 140,
      "totalTokens": 350
    }
  }
}
```

### Related room events

- `ai_thinking`
- `message_created`
- `socket_error`

## 17. Socket payload: `ai_thinking`

### Shape

```json
{
  "roomId": "room-uuid",
  "thinking": true
}
```

### Meaning

The backend uses this event as a realtime progress signal for room AI.

## 18. Socket payload: `socket_error`

### Example

```json
{
  "code": "AI_QUOTA_EXCEEDED",
  "message": "AI quota exceeded",
  "retryAfterMs": 60000
}
```

## 19. Prompt template payload shape

### DB row example

```json
{
  "key": "conversation-insight",
  "version": 1,
  "description": "Generate structured conversation insights",
  "content": "Generate summary, intent, topics, decisions, and action items for: {{message}}",
  "isActive": true
}
```

## 20. Model catalog payload meaning

### Example model entry

```json
{
  "id": "gemini-2.5-flash",
  "provider": "gemini",
  "label": "Gemini",
  "supportsImages": true,
  "supportsJson": true
}
```

### Important caveat

`supportsImages` reflects backend model metadata, not guaranteed provider-native multimodal implementation in current request code.

## 21. AI router input contract

### Type-level meaning

- `task` tells the backend what kind of AI job is running
- `message` is the assembled prompt body
- `history` is prior conversational state
- `modelId` is an optional preference override
- `attachment` is optional metadata and inline content
- `outputJson` marks structured-output expectation

## 22. AI router output contract

### Stability of fields

The backend keeps this envelope stable across tasks even though actual provider details vary.

### Why this is important

This lets upper layers treat AI execution as a reusable service rather than provider-specific code.

## 23. Insight payload meaning

### Shape

- `title`
- `summary`
- `intent`
- `topics`
- `decisions`
- `actionItems`
- `messageCount`

### Why it matters

This payload serves both:

- UI inspection
- future prompt compression

## 24. Memory source reference payloads

### Current meaning

Source references are stored as JSON and may include:

- conversation ID
- timestamp

### Why this matters

It gives the backend a path toward better explainability later.

## 25. Data-shape takeaway

The backend AI system relies on a small set of durable data contracts:

- conversations
- room messages
- memory entries
- insights
- prompt templates
- model catalog entries

Anyone rebuilding the backend AI system should keep these contracts stable first, then swap implementation details underneath them.
