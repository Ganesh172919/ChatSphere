# Complete Backend AI Documentation

## Scope

This is the consolidated backend-only AI implementation manual for ChatSphere.

It is intentionally focused on:

- backend AI architecture
- backend routes and middleware that affect AI execution
- backend schema and payload contracts for AI features
- backend service interactions
- backend failure handling, scaling, and operational behavior

It does not attempt to document the frontend except where frontend behavior is required to understand backend request shape or socket event semantics.

## Reading Order For Schema And Implementation Detail

1. `12_schema_and_payload_reference`
2. `11_backend_file_reference`
3. `09_code_walkthrough`
4. `02_ai_integration`
5. `04_chat_and_socket_flow`
6. `13_operations_and_scenarios`

## Included source sections

The sections below are compiled from the backend AI documentation set in `docs/ai-backend` and kept together here so a new engineer can read the entire backend AI system as one long-form internal manual.

---

---

<!-- BEGIN: 00_master_deep_dive.md -->

# ChatSphere AI System Documentation

## Scope

This document covers only the AI-related features that are implemented in the ChatSphere website and backend.

It is based on direct analysis of the current source tree.

It does not try to document unrelated authentication, moderation, analytics, or generic CRUD flows unless they materially affect AI execution.

It is written to help an engineer:

- understand the current AI design
- rebuild the AI system from scratch
- debug failures
- extend the product safely
- plan scaling work

## Evidence Base

The analysis in this document is grounded in these files:

- `backend/src/services/ai/gemini.service.ts`
- `backend/src/services/aiFeature.service.ts`
- `backend/src/services/chat.service.ts`
- `backend/src/services/memory.service.ts`
- `backend/src/services/conversationInsights.service.ts`
- `backend/src/services/promptCatalog.service.ts`
- `backend/src/services/aiQuota.service.ts`
- `backend/src/services/conversation.service.ts`
- `backend/src/services/project.service.ts`
- `backend/src/services/room.service.ts`
- `backend/src/services/message.service.ts`
- `backend/src/routes/chat.routes.ts`
- `backend/src/routes/ai.routes.ts`
- `backend/src/routes/conversations.routes.ts`
- `backend/src/routes/memory.routes.ts`
- `backend/src/routes/rooms.routes.ts`
- `backend/src/routes/settings.routes.ts`
- `backend/src/socket/index.ts`
- `backend/src/middleware/aiQuota.middleware.ts`
- `backend/src/middleware/rateLimit.middleware.ts`
- `backend/src/middleware/auth.middleware.ts`
- `backend/src/middleware/socketAuth.middleware.ts`
- `backend/src/middleware/validate.middleware.ts`
- `backend/src/middleware/error.middleware.ts`
- `backend/src/middleware/requestContext.middleware.ts`
- `backend/src/config/env.ts`
- `backend/src/config/startup.ts`
- `backend/src/config/prisma.ts`
- `backend/prisma/schema.prisma`
- `frontend/src/features/ai-chat/AiChatPage.tsx`
- `frontend/src/features/ai-chat/api.ts`
- `frontend/src/features/ai-chat/components/AiConversationSidebar.tsx`
- `frontend/src/features/ai-chat/components/AiConversationThread.tsx`
- `frontend/src/features/ai-chat/components/AiInspector.tsx`
- `frontend/src/features/ai-chat/ui.store.ts`
- `frontend/src/features/rooms/RoomsPage.tsx`
- `frontend/src/features/rooms/components/RoomThread.tsx`
- `frontend/src/features/rooms/components/RoomInspector.tsx`
- `frontend/src/pages/internal/MemoryPageImpl.tsx`
- `frontend/src/features/settings/SettingsPage.tsx`
- `frontend/src/features/uploads/api.ts`
- `frontend/src/shared/socket/socket-client.ts`
- `frontend/src/shared/socket/socket.store.ts`
- `frontend/src/shared/api/client.ts`
- `frontend/src/shared/api/errors.ts`
- `frontend/src/shared/types/contracts.ts`

## Executive Reality Check

ChatSphere already has a meaningful AI layer.

It supports:

- solo AI chat over HTTP
- room AI invocation over Socket.IO
- memory extraction and ranking
- structured conversation and room insights
- smart replies API
- sentiment API
- grammar improvement API
- model catalog listing
- AI-specific rate limiting and quota checks
- project context injection
- attachment-aware prompt enrichment

At the same time, several important architectural gaps exist.

The biggest ones are:

- JSON output is best-effort rather than guaranteed
- provider timeouts are not actually enforced correctly
- image attachments are not truly sent to providers as image parts
- several prompt templates exist but are not used by the corresponding features
- AI quota and rate limiting are in-memory only
- there is no streaming response path
- there is no vector store or embedding-based retrieval
- room AI stores `aiHistory`, but runtime prompting does not truly use that stored history
- room AI messages are persisted as AI messages but attributed to the triggering human user
- smart replies, sentiment, and grammar are exposed in the backend but are not visibly wired into the inspected frontend flows

Those gaps do not make the system unusable.

They do define the boundary between the current implementation and a production-grade scalable AI platform.

---

# 1. System Overview

## 1.1 What the AI system does

The AI system in ChatSphere is not a separate microservice.

It is an embedded AI orchestration layer inside the main Node.js backend.

That layer performs five broad jobs:

1. route AI requests to an available model provider
2. enrich prompts with chat history, project context, memory, and insight
3. normalize or fall back when providers fail
4. persist AI outputs back into the product data model
5. expose AI features over both HTTP and Socket.IO

## 1.2 AI capabilities visible in the product

### Solo AI chat

The website contains a dedicated AI workspace at `/app/ai`.

Users can:

- start a new AI conversation
- continue an old conversation
- select a model or use automatic routing
- select a project for additional context
- attach files
- inspect recent run telemetry
- request summaries, decisions, and tasks for the conversation

### Room AI

The website contains realtime rooms at `/app/rooms`.

Users can trigger room AI by typing `/ai <prompt>` in the room composer.

The server then:

- loads recent room messages
- retrieves relevant personal memories for the triggering user
- retrieves room insight
- calls the AI model
- persists the AI reply as a room message
- broadcasts the result to the room

### Memory

The website contains a memory management page at `/app/memory`.

The system automatically extracts memory candidates from user messages in solo AI chat.

Those memories are later ranked and injected into future prompts.

The user can also:

- review memories
- edit them
- pin them
- delete them

### Conversation and room insights

The backend can summarize:

- solo conversations
- group rooms

Those insights include:

- title
- summary
- intent
- topics
- decisions
- action items
- message count

### AI utility APIs

The backend also exposes:

- `/api/ai/models`
- `/api/ai/smart-replies`
- `/api/ai/sentiment`
- `/api/ai/grammar`

These are real capabilities in the backend.

In the inspected frontend, the settings page exposes toggles for smart replies, sentiment, and grammar.

However, the visible UI flows do not currently show dedicated controls that call those three utility endpoints.

That means the platform capability is ahead of the website surface in this part of the product.

## 1.3 Product-level value of AI

AI enhances ChatSphere in four distinct ways:

| AI role | User value | Backend mechanism | Persistence impact |
|---|---|---|---|
| Conversational assistant | Helps users draft, analyze, and plan | `handleSoloChat()` + `sendAiMessage()` | Conversation JSON updated |
| Collaborative room assistant | Brings AI into live group discussions | `trigger_ai` socket event | `Message` row created |
| Context memory | Personalizes future responses | `memory.service.ts` | `MemoryEntry` rows updated |
| Insight engine | Converts long threads into decisions/tasks | `conversationInsights.service.ts` | `ConversationInsight` rows updated |

## 1.4 End-to-end user journey

### Solo chat journey

1. User opens the AI page.
2. Frontend fetches conversations, models, and projects.
3. User writes a prompt.
4. Optional attachment is uploaded.
5. Optional project context is selected.
6. Frontend posts to `/api/chat`.
7. Backend validates auth, rate limit, and AI quota.
8. Backend loads prior conversation history.
9. Backend loads relevant memories.
10. Backend loads conversation insight if the conversation already exists.
11. Backend builds a composite prompt.
12. Backend routes the request to a model provider.
13. Backend receives an answer or a deterministic fallback.
14. Backend appends both user and assistant messages to the conversation JSON.
15. Backend extracts new memories from the user message.
16. Backend marks used memories.
17. Backend refreshes conversation insight asynchronously.
18. Frontend shows the AI response and telemetry.

### Room AI journey

1. User opens a room.
2. Frontend joins the socket room.
3. User types `/ai summarize the last discussion`.
4. Frontend emits `trigger_ai`.
5. Backend checks socket flood limit.
6. Backend checks AI quota.
7. Backend verifies room membership.
8. Backend loads the last 20 room messages.
9. Backend loads relevant memories for the prompting user.
10. Backend loads room insight.
11. Backend builds the AI prompt.
12. Backend calls the provider chain.
13. Backend stores the AI result as a room message.
14. Backend updates `Room.aiHistory`.
15. Backend broadcasts `message_created`.
16. Frontend renders the AI message in the room thread.

## 1.5 High-level architecture map

```mermaid
graph TD
    U["User"] --> FE["React Frontend"]
    FE -->|POST /api/chat| CHAT["chat.routes.ts"]
    FE -->|POST /api/ai/*| AIR["ai.routes.ts"]
    FE -->|GET /api/conversations/*| CONV["conversations.routes.ts"]
    FE -->|GET /api/memory/*| MEMR["memory.routes.ts"]
    FE -->|Socket trigger_ai| SOCK["socket/index.ts"]

    CHAT --> CS["chat.service.ts"]
    AIR --> AF["aiFeature.service.ts"]
    CONV --> CIV["conversation.service.ts"]
    SOCK --> RM["message.service.ts"]
    SOCK --> RS["room.service.ts"]

    CS --> AICORE["ai/gemini.service.ts"]
    AF --> AICORE
    SOCK --> AICORE
    CS --> MEM["memory.service.ts"]
    SOCK --> MEM
    CS --> INS["conversationInsights.service.ts"]
    SOCK --> INS
    INS --> PC["promptCatalog.service.ts"]

    CS --> PR["Prisma"]
    AF --> PR
    MEM --> PR
    INS --> PR
    RM --> PR
    RS --> PR

    AICORE --> OR["OpenRouter"]
    AICORE --> GM["Gemini"]
    AICORE --> HF["HuggingFace"]
    AICORE --> X["Grok/Groq/Together via routing strategy"]
```

## 1.6 Key takeaways

- ChatSphere uses AI as a first-class feature, not as a toy demo.
- The system is centered around one reusable provider abstraction: `sendAiMessage()`.
- Personalization is driven by memory extraction plus retrieval.
- Insight generation is treated as a cached derived artifact.
- The design is pragmatic and workable for a single-instance deployment.
- The current implementation is not yet a hardened multi-instance AI platform.

---

# 2. Complete AI Architecture

## 2.1 Architectural layers

The AI system is distributed across six layers.

### Layer 1: Product entry points

These are the paths where AI begins from the user perspective:

- `frontend/src/features/ai-chat/AiChatPage.tsx`
- `frontend/src/features/rooms/RoomsPage.tsx`
- future-capable API consumers for smart replies, sentiment, grammar

### Layer 2: Transport and policy

These decide whether a request is allowed to reach AI logic:

- `protect`
- `aiLimiter`
- `aiQuota`
- socket flood control
- socket auth
- Zod validation

### Layer 3: Use-case orchestration

These services know what kind of AI work is being done:

- `handleSoloChat()`
- `generateSmartReplies()`
- `analyzeSentiment()`
- `improveGrammar()`
- `extractAiCandidates()`
- `buildInsightPayload()`
- room `trigger_ai` event handler

### Layer 4: Prompt/context composition

This is the layer that decides what text and history the model actually sees.

It includes:

- current user message
- conversation or room history
- project context
- memory summaries
- conversation or room insight
- attachment note
- optional prompt templates

### Layer 5: Provider routing

This is implemented in `backend/src/services/ai/gemini.service.ts`.

Despite its filename, it is the general AI router for the whole system.

### Layer 6: Persistence and feedback loop

The result of AI execution is written back into product storage:

- conversation messages JSON
- room messages
- room AI history
- memory entry usage counts
- conversation and room insights
- model telemetry embedded into stored messages

## 2.2 Core architecture principles in the current design

The current design follows these principles:

### One shared AI execution function

All AI features eventually flow into `sendAiMessage()`.

That is the most important architectural decision in the AI layer.

It centralizes:

- model selection
- provider calling
- fallback strategy
- usage estimation
- telemetry creation

### Best-effort structured output

Features like memory extraction and insight generation expect JSON-like output.

The system does not enforce structured output at the provider protocol level.

It tries to parse the returned text as JSON.

If parsing fails, it either:

- falls back to a weaker representation
- or returns a deterministic fallback

This is simple.

It is also one of the system's major reliability weaknesses.

### Context assembly at the orchestration layer

The router does not know business context.

Use-case services build the input.

Examples:

- `chat.service.ts` injects project context, memory, and insight
- `memory.service.ts` sends raw user text for memory extraction
- `conversationInsights.service.ts` injects a prompt template for insights
- the room socket handler injects recent room history plus memory plus room insight

### Deterministic fallback over hard failure

If providers fail, the system prefers to return something predictable instead of crashing the user flow.

This is especially clear in:

- smart replies
- sentiment
- grammar
- insight generation
- general chat fallback message

## 2.3 AI architecture diagram

```mermaid
flowchart TD
    A["Frontend action"] --> B["HTTP route or Socket event"]
    B --> C["Validation + Auth + Rate limit + Quota"]
    C --> D["Use-case service or socket orchestration"]
    D --> E["Context builder"]
    E --> F["sendAiMessage()"]
    F --> G["resolveTaskModel()"]
    G --> H["Provider chain"]
    H --> I["OpenRouter / Gemini / HuggingFace / routed providers"]
    I --> J["AI response"]
    J --> K{"Valid content?"}
    K -->|Yes| L["Usage + telemetry"]
    K -->|No| M["Try next model"]
    M --> H
    H --> N{"All models failed?"}
    N -->|Yes| O["Deterministic fallback"]
    L --> P["Persist result"]
    O --> P
    P --> Q["Return to frontend and update UI state"]
```

## 2.4 Model routing system

### Catalog source

The model catalog is not fetched from providers dynamically.

It is synthesized from environment variables.

That happens in:

- `parseOpenRouterModels()`
- `providerModelDefaults()`
- `refreshModelCatalog()`

### Catalog properties

Each model definition contains:

- `id`
- `provider`
- `label`
- `supportsImages`
- `supportsJson`

### Catalog refresh behavior

The catalog is cached in memory.

It has a 10-minute TTL.

Startup attempts a forced refresh.

Important observation:

The refresh process does not query provider APIs.

It only reparses environment-based definitions.

So the word `refresh` here means `rebuild from env and cache`.

It does not mean `discover live provider models`.

## 2.5 Request lifecycle at the AI core

For every `sendAiMessage()` call:

1. start timer
2. normalize history
3. estimate complexity from the message
4. resolve the model chain
5. iterate providers in priority order
6. call the provider
7. reject empty strings
8. synthesize usage estimates from character counts
9. synthesize telemetry
10. return result
11. if provider fails, log warning and try next model
12. if all fail, return deterministic fallback

## 2.6 Complexity estimation

The complexity classifier is intentionally simple.

It returns:

- `high` if the message is over 1000 characters or includes terms like `architecture`, `refactor`, `analysis`, `plan`, or `design`
- `medium` if over 250 characters
- `low` otherwise

This complexity score influences model selection.

It does not change prompt construction.

It does not change generation parameters.

It does not control token budgets.

It only affects routing preference and telemetry.

## 2.7 Provider order

The provider fallback order is:

1. `openrouter`
2. `gemini`
3. `grok`
4. `groq`
5. `together`
6. `huggingface`

### Important caveat

The code claims Grok, Groq, and Together are routed through OpenRouter if directly unavailable.

But `isProviderEnabled()` still requires their direct API keys to be present.

That creates a behavioral contradiction:

- the call path uses OpenRouter-style execution
- the enablement gate blocks those models unless their own provider keys exist

## 2.8 Architectural strengths

- Shared AI router keeps the system cohesive.
- The context layer is product-aware.
- Provider fallback is already built in.
- Deterministic fallback reduces broken UX.
- Model catalog exposure allows the frontend to present routing options.
- Prompt templates are already abstracted enough to support admin override for some tasks.

## 2.9 Architectural weaknesses

- Filename `gemini.service.ts` understates its true responsibility.
- Output JSON mode is not protocol-enforced.
- True multimodal image prompting is not implemented.
- Timeout handling is incomplete.
- Model discovery is static.
- There is no request queue, no circuit breaker, and no streaming.
- Shared state used for quotas and flood limits is not horizontally scalable.

---

# 3. AI Service Deep Dive

## 3.1 `sendAiMessage()` is the heart of the AI system

If one function defines ChatSphere's AI architecture, it is `sendAiMessage()`.

Everything else either:

- prepares data for it
- or consumes its output

## 3.2 Input contract

The input fields are:

| Field | Purpose | Used by current implementation |
|---|---|---|
| `task` | Declares AI job type | yes |
| `message` | Primary prompt body | yes |
| `history` | Prior turns | yes |
| `modelId` | Requested model override | yes |
| `attachment` | File metadata and optional inline content | yes |
| `outputJson` | Signals structured-output expectation | partially |

The supported tasks are:

- `chat`
- `memory`
- `insight`
- `smart-replies`
- `sentiment`
- `grammar`

## 3.3 How prompts are built today

Prompt assembly is distributed.

There is no single prompt-builder module that all features use.

### Solo chat prompt assembly

Implemented in `chat.service.ts`.

The final message is built from:

- the user's current message
- project name
- project description
- project instructions
- project context
- relevant memory summaries
- existing conversation insight summary

Those parts are concatenated with newlines.

### Room AI prompt assembly

Implemented inline inside the `trigger_ai` socket handler.

The final prompt is built from:

- the prompt text emitted by the user
- memory summaries
- room insight summary

Recent room messages are passed as `history`.

### Insight prompt assembly

Implemented in `conversationInsights.service.ts`.

This is one of the few places that actually uses `promptCatalog.service.ts`.

The service:

1. loads the `conversation-insight` template
2. interpolates `{{message}}`
3. sends the template-expanded prompt to `sendAiMessage()`

### Memory extraction prompt assembly

Implemented in `memory.service.ts`.

It sends the raw user message directly to `sendAiMessage({ task: "memory" ... })`.

Important finding:

There is a default prompt template called `memory-extract`.

That template is not used by the current extraction flow.

### Smart replies, sentiment, grammar prompt assembly

Implemented in `aiFeature.service.ts`.

These utilities pass the raw `message` field directly into `sendAiMessage()`.

Important finding:

Default prompt templates for `smart-replies`, `sentiment`, and `grammar` exist.

These templates are not used in the current AI utility routes.

## 3.4 Context injection model

The current system supports four kinds of context.

### Context type 1: history

History is injected as structured `role/content` pairs.

For solo chat:

- history comes from the existing conversation JSON
- only the last 18 non-empty messages are kept

For room AI:

- history comes from the last 20 room messages
- messages are reversed into chronological order
- AI messages are mapped to `assistant`
- human messages are mapped to `user`
- each history message is converted to text in the form `username: content`

### Context type 2: project context

Solo chat can bind to a `Project`.

If a project is selected, these fields are injected into the prompt:

- name
- description
- instructions
- context

### Context type 3: memory

Memory is injected as a summarized string.

For solo chat:

`Relevant memory: summary1 | summary2 | ...`

For room AI:

`Memories: summary1 | summary2 | ...`

The system does not currently inject:

- memory details
- source references
- structured memory tags
- memory confidence scores

### Context type 4: insight

Insight is injected as one summary string.

This acts as a compressed interpretation of prior conversation state.

## 3.5 Attachment handling

Attachment support exists, but it is more limited than the model metadata suggests.

### What is actually supported

If an attachment is present:

- file name may be included
- file size may be included
- a note may indicate the attachment is a PDF
- inline text content may be included for text-like files
- a note may indicate an image base64 payload exists

### What is not actually implemented

- the provider calls do not send image content as provider-native multimodal image parts
- the provider calls do not fetch the remote `fileUrl`
- the provider calls do not pass PDF binary content
- the provider calls do not parse documents server-side

### Consequence

For text files:

- partial contextual usefulness exists because the frontend reads text and sends `textContent`

For image files:

- the system mostly tells the model that an image exists
- it does not truly give the model the image content

## 3.6 Model selection logic

`resolveTaskModel()` does the routing.

It considers:

- model catalog
- complexity estimate
- task type
- optional requested model ID

### Requested model behavior

If the frontend asks for a specific `modelId` and it exists in the catalog:

- that model becomes first in the chain
- all remaining models are appended after it

If it fails, fallback still happens.

### Insight and memory behavior

If task is `insight` or `memory`:

- only `supportsJson` models are prioritized

That is a reasonable approximation.

But because JSON mode is not truly enforced, the guarantee is weak.

## 3.7 Provider-specific execution

### OpenRouter

The code calls:

- `POST https://openrouter.ai/api/v1/chat/completions`

Payload:

- `model`
- `messages`

Notably absent:

- `response_format`
- `temperature`
- `max_tokens`
- `stream`
- timeout signal

### Gemini

The code calls:

- `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`

Payload:

- `contents`

Notably absent:

- system instruction separation
- generation config
- safety settings
- response MIME config
- JSON schema control
- timeout signal

### HuggingFace

The code calls:

- `POST https://api-inference.huggingface.co/models/{model}`

Payload:

- `inputs`

### Grok, Groq, Together

The switch path calls `callOpenRouter()` with a modified provider field.

This is a useful shortcut.

It should be treated as provisional rather than complete provider-native support.

## 3.8 Timeout behavior

The code contains `withTimeout()`.

It creates an `AbortController`.

It creates a timer that calls `controller.abort()`.

However:

- the signal is never passed into `fetch`
- the promise is not wrapped in a `Promise.race`

So the function does not actually enforce cancellation of the provider call.

This is one of the most important reliability findings in the AI subsystem.

## 3.9 Error normalization

Provider errors are mapped into coarse categories:

- `rate_limit`
- `model_unavailable`
- `credit_exhausted`
- `transient`

This is only used for logs.

It is not returned to the frontend in the main AI flows.

## 3.10 Deterministic fallback

The fallback logic is task-aware.

### Smart replies fallback

Returns a JSON string array with generic replies.

### Sentiment fallback

Returns a JSON object with:

- `label: neutral`
- `confidence: 0.51`
- `reason`

### Grammar fallback

Returns the original message trimmed.

### Generic JSON fallback

If `outputJson` is set:

- returns a summary-like object with empty topics, decisions, and action items

### Generic text fallback

Returns a generic provider-unavailable sentence.

## 3.11 Usage accounting

Usage is estimated by character count divided by 4.

That means:

- prompt tokens are heuristic
- completion tokens are heuristic
- total tokens are heuristic

This is acceptable for UX telemetry.

It is not accurate enough for billing or hard budgeting.

## 3.12 Telemetry contract

Returned telemetry includes:

- `provider`
- `selectedModel`
- `fallbackUsed`
- `complexity`
- `processingMs`
- `category`

## 3.13 Deep assessment of `gemini.service.ts`

### Responsibilities

- maintain model catalog
- determine routing order
- estimate request complexity
- map attachments into prompt notes
- call providers
- synthesize usage
- synthesize telemetry
- fallback deterministically

### Strengths

- centralizes AI execution
- already supports multiple providers
- exposes a stable result contract
- tolerates provider failure gracefully

### Weaknesses

- filename no longer matches scope
- no true timeout enforcement
- no streaming
- no provider-native JSON schema mode
- no actual image parts support
- no prompt template integration inside the router
- static env-only catalog

---

# 4. AI Request Flow

## 4.1 Solo chat flow

```mermaid
sequenceDiagram
    participant UI as AI Chat UI
    participant API as /api/chat
    participant MW as protect + aiLimiter + aiQuota + validateBody
    participant CHAT as handleSoloChat()
    participant DB as Prisma
    participant MEM as memory.service
    participant INS as conversationInsights.service
    participant AI as sendAiMessage()

    UI->>API: POST /api/chat
    API->>MW: auth + rate + quota + schema
    MW->>CHAT: validated payload
    CHAT->>DB: load conversation if conversationId exists
    CHAT->>DB: load selected project if projectId exists
    CHAT->>MEM: getRelevantMemories()
    CHAT->>INS: getInsight(conversation)
    CHAT->>AI: sendAiMessage(chat)
    AI-->>CHAT: answer + model + usage + telemetry
    CHAT->>DB: append user + assistant messages
    CHAT->>MEM: upsertMemoriesFromUserMessage()
    CHAT->>MEM: markMemoriesUsed()
    CHAT->>INS: refreshConversationInsight() async
    CHAT-->>API: result
    API-->>UI: JSON response
```

### Detailed solo chat step-by-step

1. The frontend sends a `POST /api/chat`.
2. The request is authenticated with bearer token middleware.
3. `aiLimiter` applies per-minute throttling.
4. `aiQuota` applies a separate AI quota window.
5. Zod validates message, IDs, and optional attachment.
6. `handleSoloChat()` trims the message.
7. Empty message is rejected.
8. If `conversationId` exists, conversation ownership is verified.
9. If `projectId` exists, project ownership is verified.
10. Project mismatch between provided conversation and provided project is rejected.
11. Relevant memories are retrieved.
12. Existing conversation insight is fetched.
13. Prior conversation messages are normalized into history.
14. Prompt parts are assembled.
15. `sendAiMessage()` is called.
16. The assistant answer is stored next to the user message.
17. Memory extraction runs on the user message.
18. Used memories are marked.
19. Conversation insight is refreshed asynchronously.
20. Final response returns content, memory refs, insight, model, usage, telemetry.

## 4.2 Room AI trigger flow

```mermaid
sequenceDiagram
    participant UI as RoomsPage
    participant WS as Socket trigger_ai
    participant QUOTA as aiQuota.service
    participant DB as Prisma
    participant MEM as memory.service
    participant INS as conversationInsights.service
    participant AI as sendAiMessage()
    participant MSG as sendRoomMessage()

    UI->>WS: emit trigger_ai({roomId,prompt,modelId?})
    WS->>QUOTA: consumeAiQuota()
    QUOTA-->>WS: allowed / blocked
    WS->>DB: verify room membership
    WS->>DB: fetch recent room messages
    WS->>MEM: getRelevantMemories()
    WS->>INS: getInsight(ROOM)
    WS->>AI: sendAiMessage(chat)
    AI-->>WS: answer + telemetry
    WS->>MSG: sendRoomMessage(isAI=true)
    MSG->>DB: create Message row
    WS->>DB: update Room.aiHistory
    WS->>MEM: markMemoriesUsed()
    WS-->>UI: message_created + ack
```

### Detailed room AI step-by-step

1. The user types `/ai ...` in the room composer.
2. Frontend detects the slash command and emits `trigger_ai`.
3. Socket flood control runs first.
4. Payload is validated using Zod.
5. AI quota is checked using the in-memory quota map.
6. Membership in the room is verified.
7. `ai_thinking` is broadcast to the room.
8. Last 20 non-deleted messages are loaded.
9. Relevant memories for the prompting user are loaded.
10. Current room insight is loaded.
11. History is built from the recent messages.
12. Prompt text is built from the user prompt plus memory plus room insight.
13. `sendAiMessage()` is called with task `chat`.
14. Result is stored as a room message with `isAI: true`.
15. Room `aiHistory` is appended and trimmed to 30 entries.
16. Used memories are marked.
17. `message_created` is broadcast.
18. `ai_thinking` is set to false.

## 4.3 Smart replies, sentiment, and grammar flows

### Smart replies

The backend flow is:

- `POST /api/ai/smart-replies`
- auth + limiter + quota
- assert feature enabled in settings
- `sendAiMessage(task=smart-replies, outputJson=true)`
- parse JSON array if possible
- otherwise return raw string as a single reply

### Sentiment

The backend flow is:

- `POST /api/ai/sentiment`
- auth + limiter + quota
- assert feature enabled in settings
- `sendAiMessage(task=sentiment, outputJson=true)`
- parse JSON object if possible
- otherwise return neutral plus raw reason text

### Grammar

The backend flow is:

- `POST /api/ai/grammar`
- auth + limiter + quota
- assert feature enabled in settings
- `sendAiMessage(task=grammar)`
- return improved text

## 4.4 Insight flow

Both room and conversation insights use the same insight builder.

### Conversation insight

1. Conversation messages are loaded.
2. Messages are flattened to `role: content` text.
3. Prompt template `conversation-insight` is interpolated.
4. `sendAiMessage(task=insight, outputJson=true)` is called.
5. JSON is parsed if possible.
6. If parsing or provider call fails, deterministic insight is created.
7. The result is upserted in `ConversationInsight`.

### Room insight

1. Last 200 room messages are loaded.
2. Messages are flattened to `username: content`.
3. The same insight template flow runs.
4. The result is upserted in `ConversationInsight` under room scope.

## 4.5 Request-flow differences across features

| Feature | Entry type | Uses history | Uses memory | Uses insight | Stores output | Returns telemetry |
|---|---|---|---|---|---|---|
| Solo chat | HTTP | yes | yes | yes | conversation JSON | yes |
| Room AI | Socket | yes | yes | yes | `Message` row + room AI history | yes |
| Smart replies | HTTP | no | no | no | no | model + usage only |
| Sentiment | HTTP | no | no | no | no | model + usage only |
| Grammar | HTTP | no | no | no | no | no direct telemetry UI |
| Memory extraction | internal service | no | n/a | no | `MemoryEntry` rows | indirect |
| Insight generation | internal service | flattened text | no | n/a | `ConversationInsight` rows | indirect |

---

# 5. Memory System and Context Engineering

## 5.1 What the memory system is trying to achieve

The memory system is not a vector database.

It is a pragmatic structured memory layer designed to make future AI answers more personalized.

Its goals are:

- extract durable user facts from messages
- avoid storing every sentence as memory
- rank memory by relevance and importance
- inject memory summaries into later prompts
- let users manually curate memory

## 5.2 Storage model

Memories are stored in `MemoryEntry`.

Fields include:

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

This is a good schema for explainable memory.

It is not an embedding schema.

## 5.3 Memory extraction pipeline

Memory extraction has two sources.

### Source 1: deterministic extraction

`extractDeterministicCandidates()` scans the user message for heuristics like:

- preferences
- deadlines
- commitments
- project context

### Source 2: AI-assisted extraction

`extractAiCandidates()` calls `sendAiMessage(task="memory", outputJson=true)`.

It expects the model to return an array of candidate objects.

If parsing fails, the AI extraction contribution becomes empty.

## 5.4 Merge and upsert behavior

The two extraction streams are merged by lowercased summary text.

Each candidate receives:

- normalized tags
- a fingerprint derived from `userId + normalized summary`
- source references including conversation ID and timestamp when available

Upsert then:

- creates the memory if fingerprint is new
- updates the memory if fingerprint already exists

## 5.5 Memory ranking

Relevant memories are retrieved from the latest 100 memories for the user.

Ranking uses token overlap plus metadata boosts.

### Score ingredients

- summary/detail token overlap: `0.4`
- importance: `0.25`
- confidence: `0.2`
- recency: `0.1`
- pinned boost: `0.2`
- usage boost: up to `0.2`

### Why this matters

This is a hand-built ranking function.

It gives ChatSphere:

- explainable scoring
- no external vector dependency
- deterministic behavior

It also has limits:

- lexical overlap misses semantic similarity
- synonyms are not captured well
- ranking quality declines as memory corpus grows

## 5.6 Memory retrieval flow

```mermaid
flowchart TD
    A["New prompt arrives"] --> B["Tokenize prompt"]
    B --> C["Load up to 100 recent memories"]
    C --> D["Tokenize summary/details"]
    D --> E["Compute overlap"]
    E --> F["Add importance/confidence/recency boosts"]
    F --> G["Add pinned and usage boosts"]
    G --> H["Sort descending"]
    H --> I["Take top N"]
    I --> J["Inject summaries into prompt"]
```

## 5.7 Memory usage loop

When memories are retrieved and used:

- their IDs are stored as `memoryRefs`
- usage count is incremented
- `lastUsedAt` is updated
- recency is reset to `1`

This creates a feedback loop.

## 5.8 Memory input and output contracts

### Input into the memory system

The main input is the user's solo-chat message text.

Metadata may include:

- conversation ID
- timestamp

### Output from the memory system

Outputs appear in three forms:

1. stored `MemoryEntry` rows
2. ranked memory references attached to conversation or room responses
3. prompt context injection as summarized strings

## 5.9 Memory in solo chat

Solo chat does two different memory operations in the same request:

### Retrieval

Before calling AI:

- it asks for relevant memories based on the new prompt

### Extraction

After the assistant answer:

- it extracts durable memory from the user's message

## 5.10 Memory in room AI

Room AI only retrieves memory.

It does not extract new memory from the room slash prompt.

## 5.11 Memory UI integration

The frontend memory page lets the user:

- search memory
- filter pinned
- edit summary/details/tags
- toggle pin
- delete memory

## 5.12 Weaknesses in the current memory design

- no vector retrieval
- no semantic embeddings
- no decay job that lowers recency over time
- no cluster deduplication beyond summary fingerprint
- no memory categories
- no automatic stale-memory review

## 5.13 Improvements that fit the current design

- store retrieval reasons
- inject memory details only when score is high
- add periodic recency decay
- add memory categories
- add embeddings and vector search later

---

# 6. Chat and AI Integration

## 6.1 Integration pattern

ChatSphere uses two AI interaction modes.

### Mode 1: synchronous HTTP AI chat

Used for solo chat.

### Mode 2: realtime Socket.IO room AI

Used for room slash-triggered AI.

## 6.2 Why there are two paths

Solo chat has different needs:

- personal context
- conversation persistence
- inspector telemetry
- project context
- attachments

Room AI has different needs:

- live collaboration
- broadcast updates
- room membership enforcement
- typing and thinking signals
- message-style output

## 6.3 Solo chat integration details

### Frontend behavior

`AiChatPage.tsx` does the following:

- fetches conversations
- fetches models
- fetches projects
- fetches current conversation detail
- fetches current insight
- lets the user pick a model
- lets the user pick a project
- uploads an attachment if present
- performs optimistic UI for ongoing messages
- stores latest run telemetry in local UI store

### Backend behavior

`/api/chat` delegates to `handleSoloChat()`.

The response returns:

- `conversationId`
- `content`
- `memoryRefs`
- `insight`
- `model`
- `usage`
- `telemetry`

## 6.4 Room AI integration details

### Frontend behavior

`RoomsPage.tsx` checks whether the message starts with `/ai `.

If it does:

- the text after `/ai` becomes the prompt
- `emitSocketEvent("trigger_ai", ...)` is called
- the UI waits for `ai_thinking` and `message_created`

### Backend behavior

The socket handler:

- emits `ai_thinking: true`
- does AI work
- persists result as a `Message`
- broadcasts `message_created`
- emits `ai_thinking: false`

## 6.5 Real-time AI response behavior

The current system is realtime but not streaming.

### What realtime means here

- the room sees a thinking state
- the room receives the final AI message via broadcast

### What streaming would mean

- tokens or chunks arrive progressively
- the message grows over time

ChatSphere does not currently implement token streaming for either solo chat or room AI.

## 6.6 AI messages stored in the database

### Solo chat persistence

Solo chat messages are stored inside `Conversation.messages` JSON.

Assistant messages include:

- `role`
- `content`
- `timestamp`
- `memoryRefs`
- `modelTelemetry`

### Room AI persistence

Room AI is stored in the relational `Message` table.

Fields include:

- `isAI`
- `triggeredBy`
- `memoryRefs`
- `modelId`
- `modelProvider`
- `modelTelemetry`

## 6.7 Important room AI identity nuance

The room AI message is stored using the triggering user's `userId`.

Then `isAI` is set to true.

This means:

- the message is AI-authored in behavior
- but human-authored in ownership identity

## 6.8 Attachment integration

### Solo AI chat

Attachments can contribute:

- file metadata
- inline text content for some file types
- base64 string prepared on the frontend for images

### Room chat

Attachments are standard room attachments.

They are not routed into AI unless the user triggers room AI with a slash prompt.

## 6.9 Inspector and telemetry integration

The AI chat inspector shows:

- latest insight
- latest run model
- total token estimate
- processing time
- selected model
- quick actions for summarize, tasks, and decisions

---

# 7. API and Route Flow for AI

## 7.1 `/api/chat`

### Middleware chain

- `protect`
- `aiLimiter`
- `aiQuota`
- `validateBody(chatBodySchema)`

### Input schema

| Field | Type | Notes |
|---|---|---|
| `message` | string | required, 1..6000 |
| `conversationId` | uuid | optional |
| `modelId` | string | optional |
| `projectId` | uuid | optional |
| `attachment.textContent` | string | max 20000 |
| `attachment.base64` | string | max 1.5M chars |

### Output shape

| Field | Meaning |
|---|---|
| `conversationId` | created or existing conversation ID |
| `content` | assistant answer |
| `memoryRefs` | memory IDs used |
| `insight` | current conversation insight |
| `model` | provider/model identity |
| `usage` | heuristic token estimates |
| `telemetry` | execution metadata |

## 7.2 `/api/ai/models`

Returns:

- `auto`
- `models`

The frontend AI page uses this to populate its model selector.

## 7.3 `/api/ai/smart-replies`

Purpose:

- generate quick response suggestions

Current product status:

- backend exists
- frontend UI integration is not visible in inspected flows

## 7.4 `/api/ai/sentiment`

Purpose:

- classify tone and confidence

## 7.5 `/api/ai/grammar`

Purpose:

- improve wording without changing intent

## 7.6 `trigger_ai` socket event

### Validation and policy

- socket auth already happened at handshake
- flood control
- payload validation
- AI quota
- room membership

### Output channels

- room-wide `ai_thinking`
- room-wide `message_created`
- socket ack with model and usage
- socket-level `socket_error`

## 7.7 Conversation and room insight routes

These indirectly invoke AI by refreshing or consuming cached summaries.

- `GET /api/conversations/:conversationId/insights`
- `POST /api/conversations/:conversationId/actions`
- `GET /api/rooms/:roomId/insights`
- `POST /api/rooms/:roomId/actions`

## 7.8 Memory routes

Memory is part of AI because it shapes future prompts.

Routes include:

- `GET /api/memory`
- `PUT /api/memory/:memoryId`
- `DELETE /api/memory/:memoryId`
- `POST /api/memory/import`
- `GET /api/memory/export`

## 7.9 Missing API-level concerns

- no idempotency keys
- no provider-specific retry hints in normal success responses
- no streaming endpoint
- no structured output schema contracts
- no explicit per-user usage ledger

---

# 8. AI Security and Rate Limiting

## 8.1 Security layers in front of AI

- authentication
- feature-level user settings
- rate limiting
- quota limiting
- input validation

## 8.2 `aiLimiter`

`aiLimiter` is an `express-rate-limit` instance.

Behavior:

- 60-second window
- max requests defined by `env.aiRateLimitPerMinute`
- keyed by user ID if present, otherwise IP

Response on limit:

- `AI_RATE_LIMITED`
- `retryAfterMs`
- `requestId`

## 8.3 `aiQuota`

`aiQuota` is separate from `aiLimiter`.

It is implemented in-memory in `aiQuota.service.ts`.

Defaults:

- 15-minute window
- max 20 AI requests

## 8.4 Socket flood control

Defaults:

- 10-second window
- max 60 events per socket

## 8.5 Abuse prevention strengths

- bounded prompt length
- bounded attachment sizes
- auth required
- room membership required for room AI
- AI routes are not public
- per-user feature toggles exist
- logs redact secrets

## 8.6 Security weaknesses

### In-memory enforcement

`aiQuota` and socket flood state live in memory.

In multi-instance deployment:

- users can effectively get extra quota by hitting different instances
- rate and quota behavior becomes inconsistent

### Attachment exposure

Uploaded files can be fetched through `/api/uploads/:filename` without auth.

### Prompt injection exposure

Project context, memory details, and conversation content are concatenated into prompts with limited isolation.

### No output filtering

There is no output moderation layer around the AI result before it is saved.

## 8.7 Rate limiting table

| Mechanism | Scope | Storage | Purpose | Scaling status |
|---|---|---|---|---|
| `apiLimiter` | general API | express memory store | generic abuse control | not shared |
| `aiLimiter` | AI HTTP routes | express memory store | burst AI control | not shared |
| `aiQuota` | AI HTTP + socket | local `Map` | AI budget window | not shared |
| socket flood limit | all socket events | local `Map` | per-socket spam control | not shared |

---

# 9. Failure Handling in AI

## 9.1 Failure philosophy

The system prefers graceful degradation over total failure.

## 9.2 Failure categories

- provider failure
- timeout or hang
- empty provider output
- malformed structured output
- quota and rate rejection
- validation rejection
- persistence failure after generation
- background insight refresh failure

## 9.3 Provider failure path

When a provider call throws:

1. `normalizeProviderError()` categorizes it
2. warning log is emitted
3. `fallbackUsed` is set to true
4. the router tries the next model in the chain

## 9.4 Failure flow diagram

```mermaid
flowchart TD
    A["AI task begins"] --> B["Select first model"]
    B --> C["Call provider"]
    C --> D{"Throws error?"}
    D -->|No| E{"Empty content?"}
    D -->|Yes| F["Log warning and normalize error"]
    E -->|Yes| F
    E -->|No| G["Return success"]
    F --> H{"More models left?"}
    H -->|Yes| I["Try next model"]
    I --> C
    H -->|No| J["Generate deterministic fallback"]
    J --> K["Return fallback result"]
```

## 9.5 Deterministic fallback quality

### Strong fallback cases

- smart replies
- sentiment
- grammar
- insight summary shell

### Weak fallback cases

- general chat

## 9.6 Structured-output failure handling

Current structured-output flows use parse-and-fallback.

Examples:

- smart replies parse JSON array
- sentiment parse JSON object
- insight parse JSON object
- memory extraction parse JSON array

## 9.7 Timeout issues

The biggest hidden failure mode is request hanging.

Because `withTimeout()` does not wire the abort signal into fetch, a slow provider may block much longer than intended.

## 9.8 Persistence-after-generation failure

A provider may succeed but database persistence may fail afterward.

There is no compensation layer for this.

## 9.9 Background insight refresh failure

Solo chat runs `refreshConversationInsight()` asynchronously.

If it fails:

- a warning is logged
- the chat request still succeeds

---

# 10. Stability Analysis

## 10.1 What happens under moderate load

At moderate scale on a single instance, the system should work acceptably because:

- AI execution is synchronous and simple
- memory retrieval is lightweight
- insight generation scopes are bounded
- model catalog is cached
- frontend keeps contracts small

## 10.2 Likely bottlenecks

### AI latency

Provider latency dominates the critical path for:

- solo chat
- room AI
- insight refresh
- memory extraction

### Prisma calls

Each solo chat request can do several DB operations.

### Socket fanout

Room AI triggers can broadcast to many connected clients.

The broadcast itself is cheap.

The expensive part is the inline provider call in the socket handler.

## 10.3 High-latency paths

| Path | Latency contributors |
|---|---|
| Solo chat with project and attachment | upload + DB reads + provider latency + DB writes |
| Room AI | quota check + DB reads + provider latency + message create + room update |
| Insight refresh | message fetch + provider latency + upsert |
| Memory extraction | provider latency + upsert |

## 10.4 Stability positives

- bounded message sizes
- bounded history windows
- deterministic fallback avoids total UX failure
- async conversation insight refresh avoids blocking the main request
- cached model catalog avoids repeated env parsing

## 10.5 Stability risks

- fake timeout protection
- no backpressure queue
- in-memory quota and rate state
- no provider health cache
- no streaming means users wait for the full completion
- no request cancellation from client down to provider

## 10.6 Specific code-level stability findings

### Unused context limit

`env.aiContextMessageLimit` exists.

The current history windows are hardcoded:

- solo chat slices last 18 messages
- room AI takes last 20 messages

### Room `aiHistory` underused

Room creation seeds `aiHistory`.

Room AI updates `aiHistory`.

The active prompt path does not read `Room.aiHistory` to assemble history.

---

# 11. Scaling the AI System

## 11.1 Single-instance assumptions in the current design

The current AI architecture assumes:

- one backend instance or effectively sticky traffic
- in-process shared memory is acceptable
- provider calls happen inline
- persistence volume is modest

## 11.2 Multi-instance problems

### Problem 1: quota inconsistency

`aiQuota.service.ts` uses a local `Map`.

### Problem 2: rate limit inconsistency

`express-rate-limit` default memory store is local to each instance.

### Problem 3: socket state fragmentation

`userSockets` and socket flood state are in-memory.

### Problem 4: no distributed work coordination

Provider calls happen inline in the serving process.

## 11.3 Horizontal scaling architecture target

```mermaid
graph TD
    LB["Load Balancer"] --> API1["Backend Instance 1"]
    LB --> API2["Backend Instance 2"]
    LB --> API3["Backend Instance 3"]

    API1 --> REDIS["Redis / shared cache / rate limits / socket adapter"]
    API2 --> REDIS
    API3 --> REDIS

    API1 --> PG["PostgreSQL"]
    API2 --> PG
    API3 --> PG

    API1 --> QUEUE["AI Jobs Queue"]
    API2 --> QUEUE
    API3 --> QUEUE

    QUEUE --> WORKERS["Dedicated AI Workers"]
    WORKERS --> PROVIDERS["LLM Providers"]
```

## 11.4 What to move first when scaling

Priority order:

1. Redis-backed quota and rate limiting
2. Redis Socket.IO adapter
3. provider health and circuit breaker state in Redis or shared cache
4. optional AI work queue
5. vector retrieval service

## 11.5 Data-model scaling notes

### Conversations

Storing solo chat as JSON is simple but limiting.

### Memory

Memory is already relational enough to scale.

### Message telemetry

A dedicated AI run log table would scale analytics better.

---

# 12. API Keys and Provider Management

## 12.1 Environment-based configuration

Provider management is entirely env-driven.

Configured values include:

- `OPENROUTER_API_KEY`
- `OPENROUTER_DEFAULT_MODEL`
- `OPENROUTER_MODELS`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `GROK_API_KEY`
- `GROQ_API_KEY`
- `TOGETHER_API_KEY`
- `HUGGINGFACE_API_KEY`

## 12.2 Startup behavior

Startup tries to:

- validate base env
- refresh prompt catalog
- refresh model catalog

Provider keys are not hard-required for boot.

## 12.3 Provider management strengths

- easy to configure
- easy to switch defaults
- easy to expose model list to frontend
- easy to disable providers by removing keys

## 12.4 Provider management risks

- no admin UI for provider health
- no key rotation workflow
- no per-provider budget management
- no live model availability verification

---

# 13. Edge Cases

## 13.1 Invalid prompt

Rejected by schema if empty or too long.

## 13.2 Empty provider response

Treated as failure.

Next model is tried.

## 13.3 Malformed JSON result

Falls back differently per feature.

## 13.4 AI hallucination

The system has no hallucination detector.

Current mitigations are indirect:

- project context
- memory injection
- insight injection
- deterministic fallback for some tasks

## 13.5 Race condition: simultaneous room AI triggers

Two users can trigger AI in the same room at the same time.

Effects:

- both prompts run independently
- both read overlapping recent history
- replies may arrive in either order
- both update `Room.aiHistory`

## 13.6 Race condition: memory updates

Two requests may update the same memory summary fingerprint in close succession.

Prisma upsert preserves database integrity.

## 13.7 Race condition: insight refresh

Conversation insight can be refreshed lazily on read, asynchronously after chat, or manually through action endpoints.

The last write wins.

## 13.8 Attachment mismatch

The user may expect PDF understanding or image analysis.

The backend currently mostly supports text extraction from client-side file reads and attachment metadata notes.

## 13.9 Auto model semantics in room AI

Room AI sends `modelId: "auto"`.

`resolveTaskModel()` only treats a requested model specially if it matches a real catalog model.

So `auto` simply falls back to normal routing.

## 13.10 Edge-case table

| Edge case | Current behavior | Risk |
|---|---|---|
| Empty prompt | rejected | low |
| Too-long prompt | rejected | low |
| Empty AI text | next model or fallback | medium |
| Bad JSON from provider | parse fallback | medium |
| Hung provider | may hang longer than intended | high |
| Simultaneous room AI | independent replies | medium |
| Upload image expecting vision | model does not truly see image | high |
| Disabled feature called | 403 `FEATURE_DISABLED` | low |
| Multi-instance quota | inconsistent limits | high |

---

# 14. How to Fix Failures

## 14.1 Debugging checklist for solo chat failures

1. Confirm frontend request payload.
2. Confirm `Authorization` header exists.
3. Check `AI_RATE_LIMITED` vs `AI_QUOTA_EXCEEDED`.
4. Check request logs by `requestId`.
5. Inspect provider warning logs.
6. Confirm project ownership if `projectId` was sent.
7. Confirm conversation ownership if `conversationId` was sent.
8. Confirm memory retrieval did not throw.
9. Confirm conversation append succeeded.
10. Confirm response telemetry indicates provider vs fallback.

## 14.2 Debugging checklist for room AI failures

1. Confirm socket connection authenticated.
2. Confirm user joined the room.
3. Confirm slash command path is used.
4. Check socket toasts for `socket_error`.
5. Check AI quota state.
6. Confirm room membership in DB.
7. Confirm recent room messages query succeeded.
8. Confirm `sendRoomMessage()` succeeded.
9. Confirm `message_created` broadcast was emitted.

## 14.3 Useful logs to inspect

Look for these log messages:

- `Incoming request`
- `Request completed`
- `Request failed`
- `AI model catalog refreshed`
- `AI provider call failed`
- `Conversation insight refresh failed`
- `trigger_ai failed`
- `Socket authentication failed`

## 14.4 Retry strategies

### Safe retries

- `GET /api/ai/models`
- `GET /api/conversations/:id/insights`
- `GET /api/rooms/:id/insights`
- `POST /api/ai/sentiment`
- `POST /api/ai/grammar`

### Use caution on retries

- `POST /api/chat`
- room `trigger_ai`

## 14.5 Circuit breaker idea

Add a shared provider health state with:

- rolling error count
- rolling timeout count
- open, half-open, closed status
- cooldown window

## 14.6 Correct timeout implementation

Use `Promise.race` plus `AbortSignal`.

Also pass `signal` to every provider `fetch`.

## 14.7 Structured output fix

Use provider-native JSON mode where available and validate the result against schemas after parsing.

## 14.8 Persistence resilience fix

Split AI generation from persistence with a run record:

1. create AI run row
2. mark status `running`
3. generate provider output
4. persist result
5. mark status `completed`
6. if persistence fails, mark `generated_not_persisted`

---

# 15. Beyond Code: How to Improve the System

## 15.1 Add RAG

Current retrieval is lexical and record-based.

RAG would help if ChatSphere wants AI to reason over:

- uploaded documents
- long project files
- historical conversations
- large memory sets

## 15.2 Add vector DB

A vector database would improve:

- semantic memory retrieval
- project file retrieval
- attachment understanding
- long-term knowledge across threads

Given the current stack, `pgvector` is a natural first step.

## 15.3 Better memory system

Upgrade memory from heuristic ranking to hybrid ranking:

- lexical score
- embedding similarity
- recency
- explicit user pinning
- confidence calibration

## 15.4 Streaming responses

Streaming would materially improve:

- solo AI usability
- room AI liveliness
- perceived latency

## 15.5 AI agents

ChatSphere could evolve from one-shot assistant calls into agentic workflows such as:

- task decomposition
- project planning agents
- action-item follow-up agents
- memory cleanup agents
- conversation summarization jobs

## 15.6 Prompt template governance

Prompt templates already exist in the admin layer.

To turn that into a real system:

- use templates for all AI features
- version them by task
- allow staged rollout
- log which template version each run used

---

# 16. Complete Project Flow

## 16.1 Full AI system flow

```mermaid
graph TD
    USER["User input"] --> UI["Website UI"]
    UI --> SOLO["Solo AI page"]
    UI --> ROOM["Room AI slash command"]
    UI --> UTIL["AI utility APIs"]
    UI --> MEMUI["Memory UI"]
    SOLO --> CHATR["/api/chat"]
    ROOM --> SOCKET["Socket trigger_ai"]
    UTIL --> AIR["/api/ai/*"]
    MEMUI --> MEMAPI["/api/memory/*"]
    CHATR --> CHATS["chat.service.ts"]
    AIR --> AIFS["aiFeature.service.ts"]
    SOCKET --> SOCK["socket/index.ts"]
    MEMAPI --> MEMS["memory.service.ts"]
    CHATS --> PROJ["project data"]
    CHATS --> MEMS
    CHATS --> INSS["conversationInsights.service.ts"]
    CHATS --> CORE["sendAiMessage()"]
    AIFS --> CORE
    SOCK --> MEMS
    SOCK --> INSS
    SOCK --> CORE
    INSS --> PROMPTS["promptCatalog.service.ts"]
    CORE --> PROVIDERS["LLM providers"]
    CHATS --> DB["PostgreSQL via Prisma"]
    SOCK --> DB
    MEMS --> DB
    INSS --> DB
```

## 16.2 User-to-response narrative

### Solo chat

User -> `/api/chat` -> middleware -> `handleSoloChat()` -> memory, project, and insight lookup -> `sendAiMessage()` -> provider -> conversation append -> memory update -> insight refresh -> frontend render.

### Room AI

User -> `trigger_ai` -> flood, quota, and membership checks -> recent room history + memory + insight -> `sendAiMessage()` -> provider -> `sendRoomMessage()` -> room broadcast.

---

# 17. Code Snippets

## 17.1 Solo chat request example

```ts
const result = await sendChat({
  message: "Draft a product brief from my project context.",
  conversationId,
  modelId: selectedModelId !== "auto" ? selectedModelId : undefined,
  projectId: selectedProjectId ?? undefined,
  attachment: uploadedAttachment,
});
```

## 17.2 Prompt building pattern in solo chat

```ts
const promptParts = [userMessage];

if (projectContext) {
  promptParts.push(
    `Project: ${projectContext.name}`,
    projectContext.description ?? "",
    projectContext.instructions ?? "",
    projectContext.context ?? ""
  );
}
```

## 17.3 Socket AI trigger example

```ts
await emitSocketEvent("trigger_ai", {
  roomId,
  prompt: content,
  modelId: "auto",
});
```

## 17.4 AI quota middleware example

```ts
export const aiQuota = (req, _res, next) => {
  const key = getAiQuotaKey(req.user?.userId, req.ip);
  const result = consumeAiQuota(key);

  if (!result.allowed) {
    return next(new AppError("AI quota exceeded", 429, "AI_QUOTA_EXCEEDED"));
  }

  next();
};
```

---

# 18. Analysis of All AI Files

## 18.1 `backend/src/services/ai/gemini.service.ts`

Responsibility:

- shared model catalog
- routing
- provider calls
- fallback
- telemetry

Key weaknesses:

- misleading filename
- timeout bug
- no enforced structured output
- no real multimodal payloads

## 18.2 `backend/src/services/aiFeature.service.ts`

Responsibility:

- models
- smart replies
- sentiment
- grammar

Key weakness:

- templates defined elsewhere are not used.

## 18.3 `backend/src/services/chat.service.ts`

Responsibility:

- orchestrates solo AI chat
- injects project, memory, and insight context
- persists conversation messages
- triggers memory learning

## 18.4 `backend/src/services/memory.service.ts`

Responsibility:

- memory extraction
- ranking
- CRUD
- import/export

Key weakness:

- no semantic retrieval.

## 18.5 `backend/src/services/conversationInsights.service.ts`

Responsibility:

- generate and cache structured summaries for conversations and rooms.

Key strength:

- actually uses prompt templates.

## 18.6 `backend/src/services/promptCatalog.service.ts`

Responsibility:

- prompt template registry plus admin override path.

Key weakness:

- only some AI paths actually consume templates.

## 18.7 `backend/src/services/aiQuota.service.ts`

Responsibility:

- windowed AI quota using an in-memory map.

Key weakness:

- not distributed.

## 18.8 `backend/src/socket/index.ts`

Responsibility:

- realtime collaboration and room AI orchestration.

Key weakness:

- inline provider execution in socket path.

## 18.9 `backend/src/services/message.service.ts`

AI relevance:

- stores room AI output as messages with telemetry.

Key weakness:

- AI messages use the triggering user's identity fields.

## 18.10 `backend/src/services/room.service.ts`

AI relevance:

- initializes room AI history
- exposes room insight actions

Key weakness:

- initialized AI history is not rehydrated into prompt context later.

## 18.11 `backend/src/services/project.service.ts`

AI relevance:

- provides project context for solo chat.

## 18.12 Frontend AI files

- `AiChatPage.tsx` is the main AI workspace UI.
- `RoomsPage.tsx` provides slash-triggered room AI.
- `MemoryPageImpl.tsx` gives users control over extracted memory.
- `SettingsPage.tsx` exposes AI feature toggles.
- `uploads/api.ts` prepares attachment payloads for AI usage.

---

# 19. Tradeoffs

## 19.1 Simplicity vs scalability

Current choice:

- simple local memory maps
- simple synchronous provider calls
- simple JSON persistence for conversation messages

Benefit:

- fast to build
- easy to understand

Cost:

- limited scale
- weaker observability
- inconsistent multi-instance behavior

## 19.2 Accuracy vs latency

Current choice:

- compact prompt assembly
- limited history windows
- heuristic memory retrieval

Benefit:

- smaller requests
- lower latency

Cost:

- less grounded reasoning
- weaker long-context continuity

## 19.3 Reliability vs implementation effort

Current choice:

- deterministic fallbacks
- no circuit breaker
- no queue

Benefit:

- useful basic resilience quickly

Cost:

- hard failures are not deeply managed

---

# 20. Final Knowledge Section

## 20.1 LLM basics in the context of ChatSphere

An LLM is a next-token prediction engine.

In ChatSphere, the model is treated as:

- a chat responder
- a summarizer
- a classifier
- an extractor

## 20.2 Prompt engineering in this system

Prompt engineering in ChatSphere is currently mostly:

- context concatenation
- role-history injection
- task labeling through the `task` field

## 20.3 Context windows

Models can only process a limited amount of text.

ChatSphere deals with that by:

- taking last 18 conversation messages
- taking last 20 room messages
- summarizing prior context into insight
- summarizing memories into short strings

## 20.4 Token usage

ChatSphere currently estimates tokens heuristically instead of using provider-native token accounting.

That is enough for UI display.

It is not enough for strict cost management.

## 20.5 AI system design patterns visible here

ChatSphere already uses several recognizable AI patterns:

- router pattern
- retrieval augmentation
- durable derived state
- graceful degradation
- human-editable memory

## 20.6 Rebuild guidance

If rebuilding this AI system from scratch, implement in this order:

1. provider router with deterministic fallback
2. solo chat endpoint
3. conversation persistence
4. memory extraction and retrieval
5. insight generation
6. room AI socket path
7. prompt template registry
8. telemetry inspector
9. distributed quota and rate limiting
10. vector retrieval and streaming

## 20.7 Final assessment

ChatSphere's AI subsystem is a strong modular-monolith AI foundation.

It already combines:

- conversation UX
- room collaboration
- memory personalization
- insight caching
- multi-provider routing
- fallback resilience

Its next stage should focus on:

- correctness
- structured-output reliability
- true timeout enforcement
- real multimodal support
- distributed state
- observability

---

# Appendix A. Feature Exposure Matrix

| Capability | Backend implemented | Frontend visibly implemented | Notes |
|---|---|---|---|
| Solo AI chat | yes | yes | main AI page |
| Conversation insight | yes | yes | inspector and actions |
| Project context | yes | yes | model and project selector |
| Attachment-aware prompting | yes | yes | partial multimodal reality |
| Room AI slash prompt | yes | yes | `/ai` in room composer |
| Room insight | yes | yes | room inspector |
| Memory extraction | yes | indirect | automatic backend process |
| Memory management UI | yes | yes | memory page |
| Smart replies API | yes | not visibly surfaced | backend ahead of UI |
| Sentiment API | yes | not visibly surfaced | backend ahead of UI |
| Grammar API | yes | not visibly surfaced | backend ahead of UI |

# Appendix B. Highest-Impact Findings

1. `sendAiMessage()` is the right architectural center, but it now deserves a rename and decomposition.
2. Provider timeout enforcement is currently incomplete and should be fixed first.
3. Output JSON is expected by several features but not truly enforced.
4. Image attachments are not actually sent as multimodal image content.
5. Prompt templates exist as a real system, but most feature paths do not yet use them.
6. The memory system is strong for a heuristic implementation and worth extending rather than replacing.
7. AI quota and rate controls are not horizontally scalable in their current in-memory form.
8. Room AI identity should eventually be separated from the human trigger identity.
9. The frontend already offers a strong AI inspector experience for solo chat.
10. ChatSphere is well-positioned to add RAG, streaming, and vector retrieval without a total rewrite.

# Appendix C. Practical 30-Day Improvement Plan

## Week 1

- fix timeout enforcement
- use prompt templates for smart replies, sentiment, grammar, solo chat, and memory extraction
- add provider-native JSON mode where possible

## Week 2

- improve attachment handling
- support real image parts for multimodal-capable providers
- log AI run IDs and template versions

## Week 3

- move quota and rate controls to Redis
- add Socket.IO Redis adapter
- add provider health and circuit breaker state

## Week 4

- add streaming for solo chat
- add a room model selector
- surface smart replies, sentiment, and grammar in the website UI

# Appendix D. Detailed Failure Scenario Simulations

## Scenario 1. Solo chat with provider failure on the first model

### Inputs

- user opens `/app/ai`
- model selector is `auto`
- user sends a 900-character architecture prompt
- project context is selected
- conversation already exists

### Expected backend sequence

1. `/api/chat` request is authenticated.
2. `aiLimiter` allows the request.
3. `aiQuota` allows the request.
4. conversation is loaded.
5. project is loaded.
6. relevant memories are loaded.
7. existing insight is loaded.
8. `resolveTaskModel()` marks complexity as `medium` or `high` depending on size and keywords.
9. OpenRouter is tried first.
10. OpenRouter fails.
11. warning log is emitted.
12. Gemini is tried next.
13. Gemini succeeds.
14. conversation is updated.
15. memory extraction runs.
16. insight refresh is scheduled.
17. response returns with `fallbackUsed: true`.

### User-visible outcome

- the user still gets an answer
- the inspector shows successful completion
- fallback usage is visible only through telemetry, not through a user-facing warning

### Why this matters

This is the best-case resilience story in the current architecture.

## Scenario 2. Solo chat with all providers failing

### Inputs

- user sends a chat prompt
- provider credentials are misconfigured or upstreams are down

### Expected backend sequence

1. request reaches `sendAiMessage()`.
2. every provider attempt throws.
3. each throw produces a warning log.
4. the fallback generator runs.
5. a deterministic fallback sentence is returned.
6. conversation is still appended with that fallback assistant message.

### User-visible outcome

- the user sees a graceful but low-value assistant response
- the conversation does not disappear
- the product feels degraded rather than broken

### Operational note

This is good UX resilience.

It is not good semantic recovery.

## Scenario 3. Smart replies returns prose instead of JSON array

### Inputs

- client posts to `/api/ai/smart-replies`
- provider returns `Sure, here are three options: ...`

### Backend sequence

1. route validates request.
2. feature toggle passes.
3. AI router runs.
4. provider returns plain text.
5. JSON parse fails.
6. service returns `{ replies: [response.content] }`.

### User-visible outcome

- caller still receives a response
- shape remains valid
- semantics are weaker because the API contract becomes less strict than expected

## Scenario 4. Memory extraction provider failure

### Inputs

- user sends a solo chat message that includes preferences and deadlines
- provider fails during memory extraction

### Backend sequence

1. solo chat main answer may still succeed.
2. `extractAiCandidates()` fails or returns malformed JSON.
3. deterministic candidates still run.
4. preference and timeline heuristics may still produce memory entries.
5. memory learning becomes partial rather than absent.

### Why this matters

The memory system has a genuinely useful fallback path.

## Scenario 5. Room AI under quota exhaustion

### Inputs

- user repeatedly triggers `/ai` in rooms
- quota window is exceeded

### Backend sequence

1. socket event validates payload.
2. `consumeAiQuota()` returns `allowed: false`.
3. `socket_error` with `AI_QUOTA_EXCEEDED` is emitted.
4. no provider is called.
5. no room message is written.

### User-visible outcome

- toast error
- no thinking indicator remains active
- no AI message appears

## Scenario 6. Provider hangs instead of failing fast

### Inputs

- provider never returns promptly

### Backend reality today

The system intends to enforce `env.requestTimeoutMs`.

But because the abort signal is not wired into fetch, the request may remain stuck longer than intended.

### Why this matters operationally

- HTTP threads remain occupied longer
- room slash commands feel unresponsive
- retries may pile up
- load amplifies the problem

## Scenario 7. Attachment image uploaded to solo AI chat

### Inputs

- user uploads a PNG
- frontend reads base64
- backend receives attachment payload

### Actual current behavior

- attachment note says image payload is attached as base64
- provider request does not send the image as a multimodal part
- model does not truly inspect the image content

### User-visible risk

The user may assume vision support exists because the UI accepts the file and the catalog claims some models support images.

The actual result is weaker than expected.

# Appendix E. Route-by-Route AI Contract Reference

## `/api/chat`

### Preconditions

- bearer auth token must be valid
- rate limit must allow request
- AI quota must allow request
- message must be non-empty

### Side effects

- conversation JSON may be created or updated
- memory entries may be inserted or updated
- memory usage counts may be incremented
- insight generation may be refreshed

### Failure codes likely

- `UNAUTHORIZED`
- `AI_RATE_LIMITED`
- `AI_QUOTA_EXCEEDED`
- `VALIDATION_ERROR`
- `PROJECT_MISMATCH`
- `NOT_FOUND`

## `/api/ai/models`

### Preconditions

- auth required
- rate limit required
- quota required

### Side effects

- none

### Notes

This endpoint currently consumes quota even though it does not call a provider because the route is mounted behind `router.use(protect, aiLimiter, aiQuota)`.

That is a subtle product-policy choice.

It may or may not be desired.

## `/api/ai/smart-replies`

### Preconditions

- auth
- rate limit
- quota
- feature enabled in user settings

### Side effects

- none persisted

### Contract caveat

The response shape is stable.

The semantic structure of each reply is not guaranteed because provider JSON is not enforced.

## `/api/ai/sentiment`

### Preconditions

- auth
- rate limit
- quota
- feature enabled

### Side effects

- none persisted

### Contract caveat

Confidence is model-generated or fallback-generated, not calibrated statistically.

## `/api/ai/grammar`

### Preconditions

- auth
- rate limit
- quota
- feature enabled

### Side effects

- none persisted

### Contract caveat

No diff or edit explanation is returned.

Only the improved text is returned.

## `trigger_ai`

### Preconditions

- valid socket auth handshake
- socket flood limit pass
- AI quota pass
- room membership pass
- payload schema pass

### Side effects

- room AI message row inserted
- room `aiHistory` updated
- memory usage counts incremented
- room broadcast emitted

### Failure outputs

- `socket_error`
- no HTTP status because this is socket transport

# Appendix F. Rebuild Blueprint

## Phase 1. Core router

Build a shared AI execution service with:

- provider abstraction
- model catalog
- fallback chain
- standardized result envelope
- timing and usage telemetry

## Phase 2. Solo chat

Build:

- conversations table or JSON storage
- `/api/chat`
- history normalization
- model selector support
- telemetry return contract

## Phase 3. Memory

Build:

- memory schema
- deterministic extraction
- AI extraction
- retrieval ranking
- prompt injection
- memory management UI

## Phase 4. Insight engine

Build:

- cached summary table
- insight prompt template
- summarize, extract-tasks, extract-decisions actions

## Phase 5. Room AI

Build:

- socket auth
- room membership checks
- slash-triggered AI event
- room message persistence
- thinking indicator

## Phase 6. Reliability upgrades

Build:

- proper timeout cancellation
- provider-native structured output
- run ledger
- circuit breaker
- distributed quota and rate limiting

# Appendix G. Concrete Weaknesses and How to Upgrade Them

## Weakness: timeout enforcement is not real

### Current cause

`withTimeout()` does not pass `AbortSignal` into fetch and does not race the promise.

### Upgrade

- create controller
- pass `signal` to fetch
- race provider promise against timeout promise
- normalize timeout as its own category

## Weakness: image attachments are not truly multimodal

### Current cause

The frontend prepares base64 for images, but the backend only adds an attachment note.

### Upgrade

- detect provider multimodal capability
- convert image to provider-native part format
- send as image content, not text note
- fall back to OCR or captioning if provider is text-only

## Weakness: output JSON is not guaranteed

### Current cause

`outputJson` influences expectations but not provider configuration.

### Upgrade

- use JSON response mode where supported
- validate the parsed object against a schema
- if invalid, retry with stricter instruction once

## Weakness: prompt templates are underused

### Current cause

Templates exist but solo chat, memory extraction, smart replies, sentiment, and grammar mostly bypass them.

### Upgrade

- introduce task-specific prompt builders that always start from templates
- attach template key and version to telemetry

## Weakness: model catalog is env-only

### Current cause

Catalog refresh does not query provider APIs.

### Upgrade

- store admin-approved model registry in DB
- optionally fetch live availability asynchronously
- mark models enabled or disabled by policy

## Weakness: room AI identity is ambiguous

### Current cause

AI messages are stored using the triggering human `userId`.

### Upgrade options

- dedicated assistant user
- `actorType` field
- per-room assistant identity

# Appendix H. Suggested Test Matrix

## Unit tests

- `resolveTaskModel()` respects requested model override
- `estimateComplexity()` classifies short, medium, and long prompts correctly
- deterministic fallback returns task-appropriate shapes
- memory ranking boosts pinned and frequently used memories
- settings normalization handles partial JSON safely

## Integration tests

- `/api/chat` with valid auth creates a conversation
- `/api/chat` with project mismatch fails
- `/api/ai/smart-replies` returns valid shape when provider output is malformed
- `/api/ai/sentiment` falls back to neutral when JSON parse fails
- `/api/ai/grammar` returns trimmed input when provider path fails
- room `trigger_ai` rejects non-members
- room `trigger_ai` emits `message_created` on success
- AI quota rejects after limit

## End-to-end tests

- user starts solo chat, sees telemetry, and sees insight
- user selects a project and receives context-aware answer
- user triggers `/ai` in a room and sees room response
- user edits memory and sees it on the memory page

# Appendix I. Operational Dashboard Wishlist

## AI success dashboard

Track:

- requests by task
- success vs fallback rate
- provider distribution
- latency p50, p95, p99
- parse-failure rate for JSON tasks

## Memory dashboard

Track:

- memories created per day
- memories used per day
- pinned memories count
- stale memories count
- top retrieval score distributions

## Insight dashboard

Track:

- insight refresh success rate
- average insight generation latency
- percentage of deterministic fallback insights

## Provider dashboard

Track:

- provider error rates
- timeout rates
- credit exhaustion events
- model-specific empty-response counts

# Appendix J. AI File Ownership Matrix

| File | AI role | Direct provider call | Persistence side effect | Main risk |
|---|---|---|---|---|
| `backend/src/services/ai/gemini.service.ts` | core router | yes | no | timeout and structured output gaps |
| `backend/src/services/chat.service.ts` | solo chat orchestration | indirect | yes | prompt sprawl |
| `backend/src/services/memory.service.ts` | memory learning and retrieval | indirect | yes | lexical-only retrieval |
| `backend/src/services/conversationInsights.service.ts` | summary engine | indirect | yes | parse brittleness |
| `backend/src/services/aiFeature.service.ts` | utility endpoints | indirect | no | underused templates |
| `backend/src/socket/index.ts` | room AI orchestration | indirect | yes | inline latency |
| `backend/src/services/message.service.ts` | room AI persistence | no | yes | actor identity ambiguity |
| `backend/src/services/promptCatalog.service.ts` | prompt registry | no | yes | under-adoption |
| `backend/src/services/aiQuota.service.ts` | AI budget window | no | no | single-instance only |
| `frontend/src/features/ai-chat/AiChatPage.tsx` | solo AI UX | no | no | no streaming |
| `frontend/src/features/rooms/RoomsPage.tsx` | room AI UX | no | no | no model selector |
| `frontend/src/pages/internal/MemoryPageImpl.tsx` | memory control UI | no | no | no retrieval-explanation UI |
| `frontend/src/features/settings/SettingsPage.tsx` | feature policy UI | no | no | utility flows not visible yet |

# Appendix K. Recommended Next Refactor Cuts

## Cut 1. Rename and split the AI core

From:

- `services/ai/gemini.service.ts`

To:

- `services/ai/router.service.ts`
- `services/ai/catalog.service.ts`
- `services/ai/providers/openrouter.provider.ts`
- `services/ai/providers/gemini.provider.ts`
- `services/ai/providers/huggingface.provider.ts`
- `services/ai/fallback.service.ts`

## Cut 2. Centralize prompt building

Introduce:

- `services/ai/promptBuilders/soloChat.ts`
- `services/ai/promptBuilders/roomChat.ts`
- `services/ai/promptBuilders/memoryExtract.ts`
- `services/ai/promptBuilders/insight.ts`
- `services/ai/promptBuilders/smartReplies.ts`
- `services/ai/promptBuilders/sentiment.ts`
- `services/ai/promptBuilders/grammar.ts`

## Cut 3. Add AI run ledger

New table proposal:

- `AiRun`
- `AiRunStep`

Fields should include:

- task
- userId
- conversationId or roomId
- model requested
- model selected
- provider
- template key and version
- status
- startedAt
- completedAt
- failure category
- fallback used
- prompt token estimate
- completion token estimate

# Appendix L. Final Engineering Notes

- The current system is well beyond a demo and worth investing in.
- The memory design is a particularly good foundation for future RAG work.
- The biggest correctness fix is timeout enforcement.
- The biggest product-trust fix is honest multimodal support and structured output enforcement.
- The biggest scaling fix is removing in-memory control state from the critical AI paths.

<!-- END: 00_master_deep_dive.md -->


---

<!-- BEGIN: 01_overview.md -->

# Backend AI Documentation Overview

## Scope

This documentation set covers only backend files and backend behavior related to AI in ChatSphere.

It excludes non-AI product areas unless they directly affect AI execution, such as authentication, socket authorization, rate limiting, and persistence.

## What the backend AI system does

The ChatSphere backend embeds AI directly inside the main Node.js and TypeScript application.

It is not a separate microservice.

The AI layer currently supports:

- solo AI chat over `POST /api/chat`
- room AI invocation over the Socket.IO `trigger_ai` event
- model catalog listing through `/api/ai/models`
- utility endpoints for smart replies, sentiment, and grammar
- memory extraction and retrieval
- conversation and room insight generation
- project-aware prompt enrichment
- deterministic fallback when providers fail

## Primary backend files in scope

- `backend/src/services/ai/gemini.service.ts`
- `backend/src/services/aiFeature.service.ts`
- `backend/src/services/chat.service.ts`
- `backend/src/services/memory.service.ts`
- `backend/src/services/conversationInsights.service.ts`
- `backend/src/services/promptCatalog.service.ts`
- `backend/src/services/aiQuota.service.ts`
- `backend/src/socket/index.ts`
- `backend/src/routes/chat.routes.ts`
- `backend/src/routes/ai.routes.ts`
- `backend/src/routes/conversations.routes.ts`
- `backend/src/routes/memory.routes.ts`
- `backend/src/routes/rooms.routes.ts`
- `backend/src/middleware/aiQuota.middleware.ts`
- `backend/src/middleware/rateLimit.middleware.ts`
- `backend/src/middleware/auth.middleware.ts`
- `backend/src/middleware/socketAuth.middleware.ts`
- `backend/src/middleware/validate.middleware.ts`
- `backend/src/config/env.ts`
- `backend/prisma/schema.prisma`

## High-level architectural summary

ChatSphere uses a modular-monolith AI architecture.

The key design choice is that most AI features eventually flow into a single backend execution function: `sendAiMessage()`.

That function handles:

- model catalog use
- model routing
- provider selection
- provider fallback
- usage estimation
- telemetry creation
- deterministic fallback

The rest of the backend AI system prepares input for that router or consumes its output.

## Architecture map

```mermaid
graph TD
    CLIENT["Web client"] --> CHAT["/api/chat"]
    CLIENT --> AIR["/api/ai/*"]
    CLIENT --> CONV["/api/conversations/*"]
    CLIENT --> MEM["/api/memory/*"]
    CLIENT --> ROOMS["Socket trigger_ai"]

    CHAT --> CS["chat.service.ts"]
    AIR --> AFS["aiFeature.service.ts"]
    CONV --> CIS["conversationInsights + conversation service"]
    MEM --> MS["memory.service.ts"]
    ROOMS --> SOCK["socket/index.ts"]

    CS --> CORE["sendAiMessage()"]
    AFS --> CORE
    CIS --> CORE
    MS --> CORE
    SOCK --> CORE

    CS --> PRJ["project-backed context"]
    CS --> MEM2["memory.service.ts"]
    CS --> INS["conversationInsights.service.ts"]
    SOCK --> MEM2
    SOCK --> INS

    CORE --> PROVIDERS["OpenRouter / Gemini / HuggingFace / routed models"]
    CS --> DB["Prisma + PostgreSQL"]
    MS --> DB
    CIS --> DB
    SOCK --> DB
```

## Main backend AI capabilities

### Solo AI chat

`chat.service.ts` builds a context-rich prompt from:

- the user message
- prior conversation history
- project context
- relevant memories
- conversation insight

It then calls the shared AI router and stores both the user turn and assistant turn in the `Conversation.messages` JSON field.

### Room AI

`socket/index.ts` listens for `trigger_ai`.

It loads:

- recent room messages
- relevant memories for the triggering user
- room insight

It then calls the shared AI router and persists the answer as a `Message` row with AI metadata.

### Utility AI endpoints

`aiFeature.service.ts` provides:

- smart replies
- sentiment analysis
- grammar improvement
- model listing

These are backend-complete capabilities, even though the currently inspected frontend does not visibly expose dedicated UI flows for all of them.

### Memory and personalization

`memory.service.ts` does two jobs:

- extract durable user facts from text
- retrieve ranked memories for future prompts

### Insight generation

`conversationInsights.service.ts` compresses long histories into structured summaries that can later be reused as context.

## Backend AI data model summary

| Model | AI purpose |
|---|---|
| `Conversation` | stores solo AI chat threads |
| `ConversationInsight` | stores summary, intent, topics, decisions, and tasks |
| `MemoryEntry` | stores user memory used for personalization |
| `PromptTemplate` | stores editable prompt templates |
| `Project` | stores project context injected into prompts |
| `Message` | stores room chat and room AI outputs |
| `Room` | stores room-level AI history |
| `User.settings` | stores feature toggles for smart replies, sentiment, and grammar |

## Core backend AI strengths

- One reusable AI execution layer keeps logic centralized.
- Memory retrieval and insight injection make prompts more grounded than plain chat completion.
- The system already supports more than one provider.
- Provider failure does not automatically break user flows.
- AI metadata is persisted in useful places.

## Core backend AI weaknesses

- `gemini.service.ts` is actually a general router and now carries too much responsibility.
- JSON output is expected but not truly enforced at the provider level.
- Timeout handling is incomplete.
- Image attachment support is only partial.
- Quota and rate state are single-instance only.
- Some prompt templates exist but are not actually used by the corresponding services.

## Example of the shared AI call pattern

```ts
const response = await sendAiMessage({
  task: "chat",
  message: promptText,
  history,
  modelId,
  attachment,
});
```

## Key architectural takeaway

If someone needs to rebuild the backend AI system from scratch, the correct mental model is:

1. routes and socket handlers gather validated input
2. orchestration services assemble context
3. `sendAiMessage()` routes execution to a provider chain
4. the backend persists AI results into conversations, room messages, memories, and insights

<!-- END: 01_overview.md -->


---

<!-- BEGIN: 02_ai_integration.md -->

# AI Integration

## Purpose of this file

This file explains how the backend integrates with AI providers, how models are selected, how prompts are assembled, and how responses flow back into ChatSphere.

## The integration center: `sendAiMessage()`

The most important integration point in the backend is `backend/src/services/ai/gemini.service.ts`.

Despite its filename, it is not Gemini-specific anymore.

It acts as the shared AI router for all major backend AI features.

## Supported task types

The backend AI router supports these task labels:

- `chat`
- `memory`
- `insight`
- `smart-replies`
- `sentiment`
- `grammar`

## Model catalog design

The model catalog is built from environment variables.

The backend does not dynamically fetch model lists from providers.

Instead, it synthesizes a catalog from configured defaults and optional OpenRouter model rows.

## Catalog fields

Each model entry includes:

- `id`
- `provider`
- `label`
- `supportsImages`
- `supportsJson`

## Model routing logic

Routing is handled by `resolveTaskModel()`.

It considers:

- requested model override
- task type
- message complexity
- provider order

### Complexity estimation

The current backend uses a heuristic complexity classifier.

It marks a request as:

- `high` for long or architecture-style prompts
- `medium` for mid-sized prompts
- `low` for short prompts

That complexity only affects provider priority.

## Provider order

The current fallback order is:

1. OpenRouter
2. Gemini
3. Grok
4. Groq
5. Together
6. HuggingFace

## Important routing caveat

The code comments suggest Grok, Groq, and Together can be routed through OpenRouter.

However, the backend still uses `isProviderEnabled()` to require their own provider keys.

That means the routing story is only partially unified.

## AI integration diagram

```mermaid
flowchart TD
    A["Service builds AI input"] --> B["sendAiMessage()"]
    B --> C["estimateComplexity()"]
    C --> D["resolveTaskModel()"]
    D --> E["ordered model chain"]
    E --> F["call provider 1"]
    F --> G{"content valid?"}
    G -->|yes| H["return content + usage + telemetry"]
    G -->|no| I["try next provider"]
    I --> J{"models left?"}
    J -->|yes| F
    J -->|no| K["deterministic fallback"]
    K --> H
```

## Provider integrations

### OpenRouter

The backend sends a standard chat-completions request with:

- model ID
- history messages
- current user content

### Gemini

The backend sends a `generateContent` request with:

- `contents`
- mapped user and model turns

### HuggingFace

The backend sends:

- `inputs: message`

### Grok, Groq, Together

These are currently handled through the same OpenRouter-shaped call path instead of full provider-native integrations.

## Prompt construction in the backend

Prompt assembly is not fully centralized.

Different services build different prompt bodies before calling `sendAiMessage()`.

### Solo chat prompt construction

`chat.service.ts` builds a prompt from:

- user message
- project name
- project description
- project instructions
- project context
- relevant memory summaries
- existing conversation insight summary

### Room AI prompt construction

The `trigger_ai` socket path builds a prompt from:

- slash-command text
- memory summaries
- room insight summary

Recent room messages are passed as history rather than merged into the prompt text body.

### Insight prompt construction

`conversationInsights.service.ts` uses `promptCatalog.service.ts`.

This is one of the few places where prompt templating is properly wired into the backend AI path.

### Utility task prompt construction

`aiFeature.service.ts` sends raw user text directly into the AI router for:

- smart replies
- sentiment
- grammar

That means prompt templates defined for these tasks are currently underused.

## Prompt template system

The backend defines default templates for:

- solo chat
- group chat
- memory extraction
- conversation insight
- smart replies
- sentiment
- grammar

But current usage is uneven.

## Attachment integration

The AI router has attachment support, but it is important to understand what that means technically.

### What the backend does today

- adds attachment notes
- includes text content for some text-like file types
- notes when a PDF is attached
- notes when an image base64 payload exists

### What the backend does not do today

- send images as provider-native multimodal content
- parse PDF binary content server-side
- dereference uploaded URLs into provider context

## Response flow

Every successful AI response returns:

- `content`
- `model`
- `usage`
- `telemetry`

## Important implementation gap: output JSON

Several backend services expect JSON-like responses.

The current AI integration does not enforce JSON mode at the provider protocol layer.

## Important implementation gap: timeout enforcement

The backend has a `withTimeout()` helper.

However, the current implementation does not wire `AbortSignal` into the provider fetch calls and does not truly race the promise.

## Example integration snippet

```ts
const aiResponse = await sendAiMessage({
  task: "insight",
  message: prompt,
  outputJson: true,
});
```

## Recommended next-step integration improvements

- enforce structured output where providers support it
- move provider-specific logic into separate provider adapters
- make prompt-template usage consistent across all AI tasks
- support real multimodal image requests
- implement actual timeout cancellation

<!-- END: 02_ai_integration.md -->


---

<!-- BEGIN: 03_api_routes.md -->

# API Routes

## Purpose of this file

This file documents backend HTTP routes related to AI and AI-adjacent backend behavior.

## Route grouping in scope

Primary AI routes:

- `/api/chat`
- `/api/ai/*`

AI-adjacent routes that shape context or consume AI output:

- `/api/conversations/*`
- `/api/memory/*`
- `/api/rooms/:roomId/insights`
- `/api/rooms/:roomId/actions`
- `/api/settings`

## HTTP request lifecycle

```mermaid
sequenceDiagram
    participant C as Client
    participant APP as Express app
    participant MW as Middleware chain
    participant R as Route handler
    participant S as Service
    participant AI as AI router
    participant DB as Prisma/PostgreSQL

    C->>APP: HTTP request
    APP->>MW: requestContext, auth, limiter, quota, validation
    MW->>R: validated request
    R->>S: domain service call
    S->>AI: AI call when needed
    S->>DB: persistence or lookup
    AI-->>S: content + telemetry
    DB-->>S: data
    S-->>R: route result
    R-->>C: JSON response
```

## `POST /api/chat`

### Purpose

Primary solo AI chat endpoint.

### Middleware

- `protect`
- `aiLimiter`
- `aiQuota`
- `validateBody(chatBodySchema)`

### Request fields

| Field | Required | Notes |
|---|---|---|
| `message` | yes | 1 to 6000 chars |
| `conversationId` | no | existing conversation |
| `modelId` | no | provider model override |
| `projectId` | no | project context selector |
| `attachment` | no | optional uploaded file metadata and inline content |

### Main service

- `handleSoloChat()`

### Side effects

- may create or update a conversation
- may add user and assistant messages
- may create or update memories
- may refresh conversation insight

## `GET /api/ai/models`

### Purpose

Expose:

- `auto`
- available model catalog

### Main service

- `listAiModels()`

### Important note

This route is behind `aiQuota`, even though it does not directly call a provider.

## `POST /api/ai/smart-replies`

### Purpose

Generate short suggested replies.

### Middleware

- `protect`
- `aiLimiter`
- `aiQuota`
- request validation

### Main service

- `generateSmartReplies()`

### Additional policy

Checks `settings.aiFeatures.smartReplies`.

## `POST /api/ai/sentiment`

### Purpose

Classify sentiment with reason and confidence.

### Main service

- `analyzeSentiment()`

### Additional policy

Checks `settings.aiFeatures.sentiment`.

## `POST /api/ai/grammar`

### Purpose

Improve user text without changing intent.

### Main service

- `improveGrammar()`

### Additional policy

Checks `settings.aiFeatures.grammar`.

## Conversation AI routes

### `GET /api/conversations/:conversationId/insights`

Returns cached or newly generated conversation insight.

### `POST /api/conversations/:conversationId/actions`

Supports:

- `summarize`
- `extract-tasks`
- `extract-decisions`

## Memory routes

### `GET /api/memory`

Lists memory entries.

### `PUT /api/memory/:memoryId`

Allows editing summary, details, tags, pinned state, and scores.

### `DELETE /api/memory/:memoryId`

Deletes a memory entry.

### `POST /api/memory/import`

Supports preview mode and import mode.

### `GET /api/memory/export`

Supports JSON, Markdown, and adapter format.

## Room insight routes

### `GET /api/rooms/:roomId/insights`

Reads or refreshes room insight.

### `POST /api/rooms/:roomId/actions`

Supports summarize, extract-tasks, and extract-decisions.

## Settings route with AI significance

### `GET /api/settings`

Reads user settings including AI feature toggles.

### `PUT /api/settings`

Updates smart replies, sentiment, and grammar flags.

## Validation design

The AI route layer uses Zod extensively.

Benefits:

- bounded input size
- predictable payload shape
- clearer failure responses

## Common error responses

| Code | Meaning |
|---|---|
| `UNAUTHORIZED` | bearer token invalid or missing |
| `VALIDATION_ERROR` | payload shape invalid |
| `AI_RATE_LIMITED` | AI request burst limit exceeded |
| `AI_QUOTA_EXCEEDED` | AI budget window exceeded |
| `FEATURE_DISABLED` | per-user AI utility feature turned off |
| `NOT_FOUND` | referenced conversation, project, or memory does not exist |
| `PROJECT_MISMATCH` | conversation and requested project conflict |

## Example route handler snippet

```ts
router.post(
  "/",
  protect,
  aiLimiter,
  aiQuota,
  validateBody(chatBodySchema),
  asyncHandler(async (req, res) => {
    const result = await handleSoloChat({ userId: req.user!.userId, ...req.body });
    res.status(200).json({ success: true, data: result });
  })
);
```

<!-- END: 03_api_routes.md -->


---

<!-- BEGIN: 04_chat_and_socket_flow.md -->

# Chat and Socket Flow

## Purpose of this file

This file explains how backend chat and realtime socket flows connect to AI.

It covers:

- solo chat orchestration
- room AI triggering
- realtime message persistence
- event behavior

## Solo chat backend flow

The solo chat path is HTTP-based.

It lives primarily in:

- `chat.routes.ts`
- `chat.service.ts`
- `conversation.service.ts`
- `memory.service.ts`
- `conversationInsights.service.ts`
- `ai/gemini.service.ts`

## Solo chat sequence

```mermaid
sequenceDiagram
    participant UI as Client
    participant ROUTE as /api/chat
    participant CHAT as handleSoloChat()
    participant CONV as conversation.service
    participant MEM as memory.service
    participant INS as conversationInsights.service
    participant AI as sendAiMessage()
    participant DB as Prisma

    UI->>ROUTE: POST /api/chat
    ROUTE->>CHAT: validated payload
    CHAT->>CONV: load conversation
    CHAT->>DB: load project
    CHAT->>MEM: getRelevantMemories()
    CHAT->>INS: getInsight()
    CHAT->>AI: sendAiMessage()
    AI-->>CHAT: answer
    CHAT->>CONV: appendConversationMessages()
    CHAT->>MEM: upsertMemoriesFromUserMessage()
    CHAT->>MEM: markMemoriesUsed()
    CHAT->>INS: refreshConversationInsight() async
    CHAT-->>ROUTE: final response
```

## What `handleSoloChat()` actually does

1. trims the user message
2. rejects empty prompts
3. loads an existing conversation if `conversationId` is present
4. validates project ownership if `projectId` is present
5. rejects mismatched project and conversation combinations
6. loads relevant memories
7. loads existing conversation insight
8. normalizes prior conversation history
9. assembles the prompt body
10. calls the AI router
11. appends both turns to the conversation
12. extracts new memory from the user message
13. marks retrieved memories as used
14. refreshes insight asynchronously

## Room AI socket flow

The room AI path is event-driven and lives in:

- `socket/index.ts`
- `message.service.ts`
- `memory.service.ts`
- `conversationInsights.service.ts`
- `room.service.ts`
- `ai/gemini.service.ts`

## Socket AI trigger sequence

```mermaid
sequenceDiagram
    participant UI as Room client
    participant SOCK as socket/index.ts
    participant QUOTA as aiQuota.service
    participant MEM as memory.service
    participant INS as conversationInsights.service
    participant AI as sendAiMessage()
    participant MSG as message.service
    participant DB as Prisma

    UI->>SOCK: trigger_ai({roomId, prompt, modelId?})
    SOCK->>QUOTA: consumeAiQuota()
    SOCK->>DB: verify room membership
    SOCK-->>UI: ai_thinking true
    SOCK->>DB: fetch last 20 messages
    SOCK->>MEM: getRelevantMemories()
    SOCK->>INS: getInsight(ROOM)
    SOCK->>AI: sendAiMessage(task=chat)
    AI-->>SOCK: answer + telemetry
    SOCK->>MSG: sendRoomMessage(isAI=true)
    MSG->>DB: create Message row
    SOCK->>DB: update Room.aiHistory
    SOCK->>MEM: markMemoriesUsed()
    SOCK-->>UI: message_created
    SOCK-->>UI: ai_thinking false
```

## `trigger_ai` policy chain

Before a room AI call reaches the provider, the backend enforces:

- socket authentication
- socket flood limit
- payload validation
- AI quota
- room membership check

## Room history construction

Room AI does not use stored `Room.aiHistory` as the primary context source.

Instead, it rebuilds context from the last 20 non-deleted room messages.

Each message is mapped into:

- `assistant` role if `isAI` is true
- `user` role otherwise

And content becomes `username: message content`.

## Important room AI nuance

The saved AI room message is created with:

- `isAI: true`
- `triggeredBy: userId`
- `userId: triggering user`

So the backend treats it as AI content but stores it under the human user's identity.

## Room `aiHistory` behavior

The backend stores `Room.aiHistory` and trims it to the last 30 entries.

That history is useful as an audit-like trail.

But it is not the main source of prompt context during future room AI calls.

## Realtime UX support events

The backend emits room-AI-related socket events:

- `ai_thinking`
- `message_created`
- `socket_error`

## Example backend persistence snippet

```ts
const savedMessage = await sendRoomMessage({
  roomId: parsed.roomId,
  userId: user.userId,
  content: aiResponse.content,
  isAI: true,
  triggeredBy: user.userId,
  memoryRefs: memoryIds,
  model: {
    modelId: aiResponse.model.id,
    modelProvider: aiResponse.model.provider,
    telemetry: aiResponse.telemetry,
  },
});
```

## Failure behavior in chat versus socket paths

### Solo chat

Failure is returned through structured HTTP JSON error responses.

### Room AI

Failure is returned through `socket_error`.

This is a meaningful design difference.

<!-- END: 04_chat_and_socket_flow.md -->


---

<!-- BEGIN: 05_memory_and_context.md -->

# Memory and Context

## Purpose of this file

This file explains how the backend creates, stores, ranks, and injects memory and other contextual signals into AI prompts.

## Context sources used by the backend

The backend currently uses four major context sources:

- chat history
- project context
- personal memory
- conversation or room insight

## Memory system goals

The memory system tries to make future AI answers more personalized without requiring a full RAG stack.

It aims to:

- capture durable user facts
- avoid storing everything
- rank what matters most
- inject useful summaries into prompts
- let the user edit and control memory

## Memory extraction

Memory extraction happens in `memory.service.ts`.

It has two layers.

### Deterministic extraction

The backend scans user text for patterns like:

- preferences
- project context
- commitments
- deadlines

### AI-assisted extraction

The backend also calls the AI router with:

```ts
await sendAiMessage({
  task: "memory",
  message,
  outputJson: true,
});
```

It expects structured memory candidates in JSON form.

## Important extraction limitation

The backend defines a `memory-extract` prompt template.

The current memory extraction path does not actually use that template.

## Memory storage model

Relevant fields in `MemoryEntry`:

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

## Retrieval algorithm

The retrieval algorithm is lexical and score-based.

It uses:

- token overlap
- importance
- confidence
- recency
- pinned boost
- usage boost

## Retrieval flow

```mermaid
flowchart TD
    A["Prompt arrives"] --> B["Tokenize prompt"]
    B --> C["Load user memories"]
    C --> D["Tokenize memory summary/details"]
    D --> E["Compute overlap score"]
    E --> F["Add metadata boosts"]
    F --> G["Sort descending"]
    G --> H["Take top N"]
    H --> I["Inject summaries into prompt"]
```

## Strengths of current retrieval

- deterministic
- no external infrastructure needed
- easy to debug
- easy to explain

## Weaknesses of current retrieval

- no semantic embeddings
- synonym matching is weak
- lexical overlap may miss meaning
- quality will decline as data grows

## How memory is injected

### Solo chat

The prompt gets:

- `Relevant memory: memory1 | memory2 | ...`

### Room AI

The prompt gets:

- `Memories: memory1 | memory2 | ...`

## Project context

`chat.service.ts` can enrich solo chat with project data:

- project name
- description
- instructions
- context

This is one of the strongest context signals in the current backend AI design.

## Insight as context compression

The backend uses `ConversationInsight` as a compressed summary of longer history.

This is valuable because it reduces the amount of raw history the model must process repeatedly.

## Context engineering summary

The backend uses a practical context strategy:

1. keep recent raw history
2. compress older meaning into insight
3. inject relevant memory summaries
4. add structured project context where available

## Example prompt composition pattern

```ts
const promptParts = [userMessage];

if (projectContext) {
  promptParts.push(projectContext.name, projectContext.description ?? "");
}

if (relevantMemories.length > 0) {
  promptParts.push(`Relevant memory: ${relevantMemories.map((m) => m.summary).join(" | ")}`);
}

if (existingInsight) {
  promptParts.push(`Conversation insight: ${existingInsight.summary}`);
}
```

## Important memory lifecycle detail

In solo chat, the backend does both:

- retrieval before generation
- extraction after generation

That means the system simultaneously uses old context and learns new context from each user turn.

## Memory control plane

The memory routes let the user:

- inspect stored memories
- edit them
- pin them
- delete them
- import or export them

## Best next upgrades for context quality

- use the existing prompt-template system for memory extraction
- add memory categories
- add embedding-based retrieval
- store retrieval reasons for debugging
- include citations from `sourceReferences`

<!-- END: 05_memory_and_context.md -->


---

<!-- BEGIN: 06_security_and_rate_limiting.md -->

# Security and Rate Limiting

## Purpose of this file

This file documents backend protections that sit in front of AI behavior.

## Security layers relevant to AI

The backend AI path is protected by:

- bearer-token authentication for HTTP
- socket-token authentication for realtime events
- route-level validation
- AI-specific rate limiting
- AI-specific quota control
- room membership enforcement
- per-user AI feature toggles

## HTTP authentication

`auth.middleware.ts` checks:

- `Authorization: Bearer <token>`

If the token is missing or invalid, AI routes fail with `UNAUTHORIZED`.

## Socket authentication

`socketAuth.middleware.ts` checks:

- `socket.handshake.auth.token`
- or `Authorization` header on the handshake

Only authenticated sockets can reach `trigger_ai`.

## Input validation

AI routes and socket payloads use Zod.

Benefits:

- prevents malformed payloads
- bounds prompt length
- bounds attachment field size
- avoids unexpected shapes reaching service code

## `aiLimiter`

The backend uses `express-rate-limit` for AI request burst control.

Behavior:

- 60-second window
- max request count from `env.aiRateLimitPerMinute`
- keyed by user ID when available, otherwise IP

## `aiQuota`

The backend uses `aiQuota.service.ts` for a separate AI budget window.

Defaults:

- 15-minute window
- 20 requests

This is conceptually different from burst rate limiting.

## Socket flood control

The backend also protects sockets with an event flood limiter:

- 10-second window
- 60 events max per socket

## Security flow for room AI

```mermaid
flowchart TD
    A["Socket event trigger_ai"] --> B["socket auth already passed"]
    B --> C["flood limit"]
    C --> D["payload validation"]
    D --> E["AI quota"]
    E --> F["room membership check"]
    F --> G["AI provider call"]
```

## Per-user feature toggles

The backend stores AI feature flags in `User.settings.aiFeatures`.

These currently gate:

- smart replies
- sentiment
- grammar

## Logging and redaction

`helpers/logger.ts` redacts sensitive fields such as:

- tokens
- secrets
- authorization
- cookies
- API keys

## Security strengths

- AI routes are authenticated
- socket AI is authenticated
- validation is strong
- room membership is enforced before room AI execution
- quota and rate controls exist
- logs redact secrets

## Security weaknesses

### Single-instance control state

`aiQuota` and socket flood state are in memory.

In multi-instance deployment, limits can become inconsistent.

### Attachment download exposure

Uploaded files are accessible through `/api/uploads/:filename` without auth checks.

### Prompt-injection surface

Project context, memory summaries, and user content are concatenated into prompts with no dedicated prompt-injection defense layer.

### No output moderation layer

The backend currently saves AI output directly without a post-generation moderation pass.

## Example limiter snippet

```ts
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.aiRateLimitPerMinute,
  keyGenerator: resolveIdentity,
});
```

## Recommended upgrades

- move AI quota and rate state to Redis
- add upload access control or signed URLs
- add prompt-injection hardening for project and memory context
- add AI output moderation where room AI is user-visible

<!-- END: 06_security_and_rate_limiting.md -->


---

<!-- BEGIN: 07_failure_handling.md -->

# Failure Handling

## Purpose of this file

This file explains backend AI error handling, fallback behavior, and recovery patterns.

## Failure philosophy

The backend prefers graceful degradation over total AI-path failure.

This is especially visible in the shared AI router.

## Major failure categories

- provider returns error
- provider returns empty content
- provider hangs
- structured output is malformed
- quota or rate limit blocks request
- validation fails
- persistence fails after generation

## Provider fallback chain

When a provider call fails:

1. the backend logs a warning
2. fallback is marked as used
3. the next model in the chain is tried
4. if all providers fail, deterministic fallback is returned

## Failure flow diagram

```mermaid
flowchart TD
    A["AI request starts"] --> B["select first model"]
    B --> C["call provider"]
    C --> D{"error or empty output?"}
    D -->|no| E["return success"]
    D -->|yes| F["log warning"]
    F --> G{"more models?"}
    G -->|yes| H["try next model"]
    H --> C
    G -->|no| I["deterministic fallback"]
    I --> E
```

## Deterministic fallback behavior

### Smart replies

Returns a generic array of safe reply suggestions.

### Sentiment

Returns neutral with a confidence and fallback reason.

### Grammar

Returns the original trimmed input.

### Generic chat

Returns a plain provider-unavailable sentence.

## Structured-output failures

Several backend services expect JSON-like output:

- smart replies
- sentiment
- memory extraction
- insight generation

The backend tries to parse JSON, but does not enforce schema-constrained output at the provider layer.

## Timeout weakness

The backend intends to support AI request timeouts.

But the current timeout helper does not fully cancel provider fetches.

That means a provider hang may last longer than the configured timeout suggests.

## Persistence-after-generation failure

If the provider succeeds but a database write fails afterward:

- the AI work is already spent
- the backend has no replay ledger
- the answer may be lost from product state

## Background failure handling

`refreshConversationInsight()` is triggered asynchronously in solo chat.

If it fails:

- the backend logs a warning
- the main chat request still succeeds

## Recovery guidance

### For provider failures

- inspect warning logs
- confirm API keys
- confirm provider status
- inspect fallback telemetry

### For malformed JSON

- review prompt construction
- add stricter prompt templates
- add provider-native JSON mode

### For hanging requests

- fix abort handling
- add timeout metrics
- add provider circuit breaking

## Example fallback snippet

```ts
if (input.task === "grammar") {
  return input.message.trim();
}
```

## Recommended backend improvements

- implement real timeout cancellation
- add AI run ledger for recovery
- add provider health circuit breaker
- enforce schema-checked structured output

<!-- END: 07_failure_handling.md -->


---

<!-- BEGIN: 08_scalability_and_performance.md -->

# Scalability and Performance

## Purpose of this file

This file explains the main backend AI bottlenecks, multi-instance risks, and practical scaling strategies.

## Current scaling posture

The backend AI system is suitable for:

- single-instance deployment
- small to moderate traffic
- early-stage product growth

It is not yet optimized for large multi-instance AI traffic.

## Main bottlenecks

### 1. Provider latency

Provider call latency dominates:

- solo chat
- room AI
- memory extraction
- insight generation

### 2. Inline orchestration

The backend performs AI work inline in:

- HTTP handlers
- socket event handlers

### 3. Multiple DB operations per request

A solo chat request can involve:

- conversation lookup
- project lookup
- memory lookup
- insight lookup
- conversation append
- memory upsert
- memory usage update
- async insight refresh

### 4. In-memory control state

The following backend state is local-only:

- AI quota map
- socket flood state
- user socket presence map
- express-rate-limit memory store

## Performance diagram

```mermaid
graph TD
    A["Incoming AI request"] --> B["auth + validation + policy"]
    B --> C["DB lookups"]
    C --> D["prompt assembly"]
    D --> E["provider latency"]
    E --> F["DB persistence"]
    F --> G["response"]
```

## Performance strengths

- prompt sizes are bounded
- history windows are bounded
- insight refresh in solo chat is async after the main result
- model catalog is cached

## Performance weaknesses

- no streaming
- no queue-based AI execution
- no request cancellation
- inline room AI can block event responsiveness
- no provider health cache

## Multi-instance problems

### Quota inconsistency

`aiQuota` is stored in a local map.

Across multiple instances, users may effectively get extra quota.

### Rate limit inconsistency

`express-rate-limit` uses memory store by default.

### Socket fragmentation

Presence and flood control are local to a backend process.

Without a shared adapter, realtime behavior diverges across instances.

## Scaling roadmap

### Phase 1

- move AI quota to Redis
- move rate limiting to Redis
- add Socket.IO Redis adapter

### Phase 2

- extract provider logic into adapters
- add provider health metrics
- add circuit breaker state

### Phase 3

- introduce AI work queue
- move long-running tasks to workers
- add streaming for user-facing latency improvement

### Phase 4

- add embeddings and vector retrieval
- add dedicated AI run analytics

## Suggested horizontal architecture

```mermaid
graph TD
    LB["Load balancer"] --> APP1["API instance 1"]
    LB --> APP2["API instance 2"]
    LB --> APP3["API instance 3"]

    APP1 --> REDIS["Redis"]
    APP2 --> REDIS
    APP3 --> REDIS

    APP1 --> PG["PostgreSQL"]
    APP2 --> PG
    APP3 --> PG

    APP1 --> QUEUE["AI queue"]
    APP2 --> QUEUE
    APP3 --> QUEUE
    QUEUE --> WORKERS["AI workers"]
```

## Key scaling recommendation

The first backend AI scaling win is not vector search or agents.

It is making quota, rate limits, socket state, and provider health distributed and observable.

<!-- END: 08_scalability_and_performance.md -->


---

<!-- BEGIN: 09_code_walkthrough.md -->

# Code Walkthrough

## Purpose of this file

This file gives a backend file-by-file walkthrough of the most important AI-related services, middleware, routes, and schema elements.

## `backend/src/services/ai/gemini.service.ts`

### Responsibility

- model catalog
- model routing
- provider execution
- attachment note generation
- usage estimation
- telemetry generation
- deterministic fallback

### Why it matters

This is the backbone of the backend AI system.

### Main weakness

The file name now hides its true scope and it carries too many responsibilities.

## `backend/src/services/aiFeature.service.ts`

### Responsibility

- list models
- smart replies
- sentiment
- grammar

### Notable behavior

It enforces user feature toggles before calling the router.

## `backend/src/services/chat.service.ts`

### Responsibility

- solo chat orchestration
- conversation loading
- project validation
- memory retrieval
- insight loading
- AI call
- persistence

### Notable strength

This file creates the richest backend prompt in the system.

## `backend/src/services/memory.service.ts`

### Responsibility

- deterministic memory extraction
- AI-assisted memory extraction
- memory ranking
- memory CRUD
- memory import and export

### Notable strength

It combines AI-assisted learning with non-AI fallback heuristics.

## `backend/src/services/conversationInsights.service.ts`

### Responsibility

- build structured summaries for conversations and rooms
- upsert them into `ConversationInsight`

### Notable strength

This is one of the few places where prompt templates are used consistently.

## `backend/src/services/promptCatalog.service.ts`

### Responsibility

- define default prompt templates
- load active DB overrides
- interpolate variables
- seed initial room AI history

### Notable weakness

Prompt templates exist, but several live AI services bypass them.

## `backend/src/services/aiQuota.service.ts`

### Responsibility

- maintain in-memory AI request counters per time window

### Notable weakness

This design does not scale across multiple backend instances.

## `backend/src/routes/chat.routes.ts`

### Responsibility

- expose solo AI chat
- apply auth, rate limit, quota, and validation

## `backend/src/routes/ai.routes.ts`

### Responsibility

- expose model list
- expose utility AI endpoints

## `backend/src/routes/conversations.routes.ts`

### Responsibility

- expose AI-derived conversation insight and actions

## `backend/src/routes/memory.routes.ts`

### Responsibility

- expose memory control plane for personalization

## `backend/src/routes/rooms.routes.ts`

### AI relevance

- exposes room insight reads and actions

The actual room AI generation path is socket-based, not HTTP-based.

## `backend/src/socket/index.ts`

### Responsibility

- authenticate sockets
- manage room membership events
- handle `trigger_ai`
- persist AI room messages
- emit realtime state

### Why it matters

This is the backend bridge between realtime collaboration and AI.

## `backend/src/services/message.service.ts`

### AI relevance

- stores room AI outputs in `Message`
- records model metadata and memory references

## `backend/src/services/room.service.ts`

### AI relevance

- seeds room AI history
- exposes room-level AI action helpers built on insights

## `backend/src/middleware/aiQuota.middleware.ts`

### Responsibility

- enforce AI quota on HTTP routes

## `backend/src/middleware/rateLimit.middleware.ts`

### AI relevance

- `aiLimiter` protects AI HTTP endpoints

## `backend/src/middleware/socketAuth.middleware.ts`

### AI relevance

- protects room AI before any socket event is accepted

## `backend/src/config/env.ts`

### AI relevance

Defines:

- provider API keys
- default models
- AI timeout
- AI rate limits
- AI quota window

## `backend/prisma/schema.prisma`

### AI-relevant models

- `Conversation`
- `ConversationInsight`
- `MemoryEntry`
- `PromptTemplate`
- `Message`
- `Room`
- `Project`
- `User.settings`

## Example walkthrough snippet

```ts
const relevantMemories = await getRelevantMemories(input.userId, userMessage, 6);
const existingInsight = input.conversationId
  ? await getInsight("CONVERSATION", input.conversationId)
  : null;
const aiResponse = await sendAiMessage({ task: "chat", message: prompt, history });
```

## Best way to read the backend AI code

Recommended order:

1. `ai/gemini.service.ts`
2. `chat.service.ts`
3. `memory.service.ts`
4. `conversationInsights.service.ts`
5. `socket/index.ts`
6. routes and middleware
7. schema

<!-- END: 09_code_walkthrough.md -->


---

<!-- BEGIN: 10_future_improvements.md -->

# Future Improvements

## Purpose of this file

This file describes backend AI improvements that would move ChatSphere from a strong early-stage implementation toward a more scalable and reliable AI platform.

## 1. Fix timeout enforcement first

This is the most important backend correctness improvement.

The backend already tries to support request timeouts.

It needs to:

- pass `AbortSignal` to fetch
- race provider calls against an explicit timeout
- classify timeouts distinctly from generic failures

## 2. Enforce structured output

Several backend services expect JSON-shaped results.

Upgrade the backend to:

- use provider-native structured output where available
- validate output against schemas
- retry once with a stricter instruction if parse fails

## 3. Use prompt templates consistently

The backend already has a prompt catalog.

Extend usage so that:

- solo chat uses `solo-chat`
- memory extraction uses `memory-extract`
- smart replies uses `smart-replies`
- sentiment uses `sentiment`
- grammar uses `grammar`

## 4. Add a real AI run ledger

Introduce a new backend model for AI execution tracking.

Suggested fields:

- task
- userId
- roomId or conversationId
- requested model
- selected model
- provider
- fallback used
- prompt template version
- status
- startedAt
- completedAt
- failure category

## 5. Improve multimodal support

Current backend attachment support is only partial.

Upgrade by:

- sending provider-native image parts
- adding optional OCR or document extraction
- supporting real PDF and image context, not just notes

## 6. Add vector retrieval

The backend memory layer is currently lexical.

The next major capability step is:

- embeddings
- vector search
- hybrid ranking

## 7. Add streaming

Backend streaming would improve both UX and perceived performance.

Targets:

- SSE or chunked responses for solo chat
- socket chunk events for room AI

## 8. Make AI state distributed

Move these backend concerns to shared infrastructure:

- AI quota
- rate limiting
- socket presence and coordination
- provider circuit-breaker state

## 9. Add circuit breakers and provider health

The backend should remember recent provider failures and temporarily skip unhealthy providers.

Benefits:

- lower latency under outage
- fewer cascading failures
- better fallback behavior

## 10. Improve identity model for room AI

The backend should eventually stop storing AI room messages under the human trigger identity.

Possible designs:

- dedicated assistant user
- `actorType` field
- room-scoped virtual assistant identity

## 11. Add citation and grounding support

Backend AI answers should eventually be able to cite:

- memory entries
- project files
- retrieved document chunks
- prior decisions from insight

## 12. Add evaluation and regression testing

Backend AI features should have:

- prompt regression tests
- JSON schema conformance tests
- fallback-path tests
- provider-failure simulation tests

## Future-state architecture sketch

```mermaid
graph TD
    API["Backend API and Socket Layer"] --> ORCH["AI orchestration services"]
    ORCH --> ROUTER["Provider router"]
    ORCH --> RETR["Retriever"]
    ORCH --> RUNS["AI run ledger"]
    ORCH --> CB["Circuit breaker state"]

    RETR --> MEM["Memory store"]
    RETR --> VDB["Vector DB"]
    ROUTER --> PROV["Providers"]
    CB --> REDIS["Redis/shared state"]
    RUNS --> PG["PostgreSQL"]
```

## Practical upgrade order

1. fix timeout enforcement
2. enforce structured output
3. standardize prompt-template use
4. move quota and rate state to Redis
5. add AI run ledger
6. add true multimodal support
7. add vector retrieval
8. add streaming

## Closing recommendation

The backend AI foundation is already good enough to justify serious investment.

It should be evolved incrementally rather than replaced wholesale.

<!-- END: 10_future_improvements.md -->


---

<!-- BEGIN: 11_backend_file_reference.md -->

# Backend File Reference

## Purpose

This appendix is a backend-first reference map for the AI-related code.

It is organized by file.

Each section explains:

- why the file exists
- what part of the AI system it influences
- the main logic inside the file
- key dependencies
- risks and implementation notes

## 1. `backend/src/server.ts`

### Role

This file boots the backend process.

### AI significance

It is where the backend decides that AI is part of normal startup, not an optional sidecar process.

### Key behaviors

- runs startup checks
- creates the Express app
- attaches Socket.IO
- starts listening
- installs process-level error handlers

### AI-relevant dependencies

- `runStartupChecks()`
- `initializeSocketServer()`

### Why it matters for AI

If startup checks fail, AI never becomes available.

If socket initialization fails, room AI disappears even if HTTP AI still works.

### Small snippet

```ts
await runStartupChecks();
const app = createApp();
const server = http.createServer(app);
initializeSocketServer(server);
```

### Main risks

- no special AI readiness gate beyond startup checks
- no process restart strategy for provider degradation

## 2. `backend/src/app.ts`

### Role

Builds the Express middleware chain.

### AI significance

Every HTTP AI route depends on this middleware assembly order.

### Key behaviors

- request context installation
- security headers
- CORS
- body parsing
- cookie parsing
- Passport initialization
- global API limiter
- route registration
- error handling

### AI-relevant effects

- AI routes inherit request IDs
- AI routes inherit body size limits
- AI routes inherit generic API rate limiting before AI-specific limits

### Important sequence

1. `requestContext`
2. `helmet`
3. `cors`
4. JSON parser
5. URL-encoded parser
6. cookies
7. Passport
8. `apiLimiter`
9. route registration
10. error handlers

### Main risks

- if body limits are too low, attachment metadata flows can break
- if CORS is wrong, frontend AI calls fail before reaching service logic

## 3. `backend/src/config/env.ts`

### Role

Central environment configuration.

### AI significance

This file defines almost every AI runtime switch.

### AI-related fields

- `requestTimeoutMs`
- `aiContextMessageLimit`
- `aiQuotaWindowMs`
- `aiQuotaMaxRequests`
- `aiRateLimitPerMinute`
- `defaultAiModel`
- `openRouterApiKey`
- `openRouterDefaultModel`
- `openRouterModels`
- `geminiApiKey`
- `geminiModel`
- `grokApiKey`
- `grokModel`
- `groqApiKey`
- `groqModel`
- `togetherApiKey`
- `togetherModel`
- `huggingFaceApiKey`
- `huggingFaceModel`
- `socketFloodWindowMs`
- `socketFloodMaxEvents`

### Important observation

`aiContextMessageLimit` exists as config, but the backend currently hardcodes some history window sizes instead of using it consistently.

### Main risks

- env drift across instances causes routing inconsistency
- invalid or missing provider keys lead to fallback-heavy behavior

## 4. `backend/src/config/startup.ts`

### Role

Performs startup validation and warm-up tasks.

### AI significance

This file refreshes prompt catalog state and model catalog state during backend boot.

### AI-related startup steps

- validate startup env
- connect Prisma
- refresh prompt catalog
- refresh model catalog

### Why it matters

The backend begins serving AI requests with cached prompt and model metadata already loaded.

### Main risks

- prompt refresh failures are only warnings
- model refresh failures are only warnings
- the backend can come up in a degraded AI state without a hard startup stop

## 5. `backend/src/middleware/auth.middleware.ts`

### Role

Bearer-token authentication for HTTP routes.

### AI significance

All HTTP AI routes rely on this middleware.

### Main logic

- read `Authorization` header
- verify access token
- attach `req.user`

### AI routes protected by it

- `/api/chat`
- `/api/ai/*`
- conversations insight routes
- memory routes
- settings routes

### Main risks

- no AI-specific role differentiation
- all authenticated users have the same baseline AI access, subject only to quota and settings

## 6. `backend/src/middleware/socketAuth.middleware.ts`

### Role

Socket.IO authentication at handshake time.

### AI significance

Room AI depends on this file before any `trigger_ai` event can be processed.

### Main logic

- read token from handshake auth or header
- verify access token
- attach `socket.data.user`

### Main risks

- if handshake auth fails, realtime AI disappears entirely for that client
- socket errors are less trace-friendly than HTTP request errors

## 7. `backend/src/middleware/validate.middleware.ts`

### Role

Shared Zod validation middleware.

### AI significance

It is the backend safety boundary for prompt payloads.

### Key behaviors

- parse body
- parse params
- parse query
- replace request values with validated data

### Why it matters for AI

Without this middleware, oversized prompts and malformed attachment metadata would leak into service code.

## 8. `backend/src/middleware/rateLimit.middleware.ts`

### Role

Defines API, auth, and AI rate limiters.

### AI significance

`aiLimiter` is the first AI-specific anti-abuse layer on HTTP.

### AI-specific behavior

- one-minute window
- user-or-IP keyed
- structured JSON error response with `retryAfterMs`

### Main risks

- default in-memory store does not scale horizontally
- current limits are per instance rather than global

## 9. `backend/src/middleware/aiQuota.middleware.ts`

### Role

Applies long-window AI quota to HTTP routes.

### AI significance

This is the budget gate rather than the burst gate.

### Main logic

- derive quota key from user or IP
- consume quota
- reject with `AI_QUOTA_EXCEEDED` if necessary

### Main risks

- in-memory only
- not tied to actual cost or token usage

## 10. `backend/src/routes/chat.routes.ts`

### Role

Exposes the solo AI chat endpoint.

### AI significance

This is the main backend entry point for personal AI conversations.

### Request schema highlights

- required `message`
- optional `conversationId`
- optional `modelId`
- optional `projectId`
- optional attachment object

### Delegated service

- `handleSoloChat()`

### Why it matters

This route is where AI becomes a first-class product feature rather than a hidden utility.

## 11. `backend/src/routes/ai.routes.ts`

### Role

Exposes AI utility endpoints and the model catalog.

### Endpoints

- `GET /models`
- `POST /smart-replies`
- `POST /sentiment`
- `POST /grammar`

### AI significance

This file defines the backend's utility-AI surface area.

### Main risks

- route group currently consumes quota even for `/models`
- utilities depend on best-effort structured output but do not enforce it protocol-side

## 12. `backend/src/routes/conversations.routes.ts`

### Role

Exposes conversation read, delete, insight, and action endpoints.

### AI significance

The route itself does not always call providers directly, but it is the read and action layer over AI-generated conversation summaries.

### Key AI-related endpoints

- `GET /:conversationId/insights`
- `POST /:conversationId/actions`

### Why it matters

These routes let product UI consume AI-derived artifacts separately from primary chat generation.

## 13. `backend/src/routes/memory.routes.ts`

### Role

Memory CRUD, import, and export.

### AI significance

These routes are the backend control plane for personalization.

### Why it matters

They let users review and correct the same memory layer that future prompts depend on.

### Main risks

- memory quality can drift if extraction logic overfits or underfits
- no semantic retrieval metadata is shown here yet

## 14. `backend/src/routes/rooms.routes.ts`

### Role

Room CRUD, room message APIs, insight routes, and room actions.

### AI significance

This file handles room insight reads and actions, even though actual room AI generation is socket-based.

### Key AI-adjacent endpoints

- `GET /:roomId/insights`
- `POST /:roomId/actions`

## 15. `backend/src/services/ai/gemini.service.ts`

### Role

Shared AI router and provider abstraction.

### Responsibilities

- parse model catalog
- refresh model catalog
- estimate complexity
- resolve model chain
- build attachment note
- call provider adapters
- normalize provider failures
- generate deterministic fallback
- estimate usage
- return telemetry

### Why it matters most

This is the central backend AI execution layer.

### Key functions

- `refreshModelCatalog()`
- `getModelCatalog()`
- `resolveTaskModel()`
- `sendAiMessage()`
- provider call helpers
- `deterministicFallback()`

### Main design strength

One router gives the backend a consistent AI response envelope across multiple product features.

### Main design weaknesses

- file name no longer matches responsibility
- timeout implementation is incomplete
- output JSON is not strongly enforced
- multimodal image support is only partial

### Example snippet

```ts
const { complexity, chain } = await resolveTaskModel(
  input.task,
  input.message,
  input.modelId
);
```

## 16. `backend/src/services/aiFeature.service.ts`

### Role

Backend utility-AI orchestration layer.

### Responsibilities

- read AI feature flags from user settings
- list models
- generate smart replies
- analyze sentiment
- improve grammar

### Strengths

- narrow and readable
- feature flags are enforced server-side

### Weaknesses

- prompt templates exist but are mostly not used here
- utility endpoints are backend-ready but not deeply surfaced in the inspected frontend

## 17. `backend/src/services/chat.service.ts`

### Role

Solo AI chat orchestration.

### Responsibilities

- validate prompt content
- load existing conversation
- validate project ownership
- load project context
- retrieve relevant memories
- load conversation insight
- normalize history
- build prompt body
- call `sendAiMessage()`
- append conversation messages
- learn new memory
- mark memory usage
- refresh insight asynchronously

### Why it matters

This file is where ChatSphere turns plain chat completion into context-aware, personalized AI conversation.

### Main strength

It combines project context, memory, history, and insight in a single flow.

### Main weakness

The prompt body is assembled through concatenation rather than through a fully standardized prompt builder.

## 18. `backend/src/services/memory.service.ts`

### Role

Memory extraction, retrieval, lifecycle management, and import-export.

### Responsibilities

- deterministic candidate extraction
- AI-based candidate extraction
- upsert by fingerprint
- rank memories by overlap and metadata
- update usage counters
- list, update, delete, import, export

### Why it matters

This file gives the backend a personalization system that survives across chat sessions.

### Strengths

- deterministic fallback exists
- user-editable storage exists
- ranking is explainable

### Weaknesses

- no embeddings
- no semantic search
- `memory-extract` template is defined but not used in the core extraction path

## 19. `backend/src/services/conversationInsights.service.ts`

### Role

Summary and insight generation for conversations and rooms.

### Responsibilities

- normalize message collections
- build prompt from template
- request AI-generated structured summary
- parse JSON response
- fall back to deterministic summary if needed
- upsert `ConversationInsight`

### Main strength

This is one of the best-governed AI flows in the backend because it already uses prompt templates.

### Main weakness

It still relies on best-effort JSON output from the provider.

## 20. `backend/src/services/promptCatalog.service.ts`

### Role

Prompt registry and override system.

### Responsibilities

- define default templates
- refresh active templates from DB
- interpolate variables
- seed initial room AI history
- list and upsert prompt templates

### AI significance

This file is the backend's foundation for prompt governance.

### Main weakness

Its adoption is incomplete across the rest of the AI stack.

## 21. `backend/src/services/aiQuota.service.ts`

### Role

In-memory quota accounting.

### Responsibilities

- maintain time-window counters
- calculate allowance
- expose retry timing
- derive user or IP quota keys

### Main weakness

This design is not distributed or cost-aware.

## 22. `backend/src/services/conversation.service.ts`

### Role

Conversation persistence and AI-summary access.

### AI significance

Solo AI chat stores messages here, and conversation insight flows depend on it.

### Responsibilities

- list conversations
- read one conversation
- delete conversation
- append conversation messages
- expose conversation insight and actions

### Important implementation choice

Conversation messages are stored as JSON rather than relational message rows.

### Tradeoff

- simple to append and serialize
- weaker for queryability and analytics

## 23. `backend/src/services/room.service.ts`

### Role

Room lifecycle and room-level insight actions.

### AI significance

- seeds `Room.aiHistory`
- exposes room AI-adjacent actions
- returns room insight in room detail payloads

### Important nuance

`Room.aiHistory` is maintained, but the main room AI prompt path rebuilds history from recent messages instead of relying on this stored field.

## 24. `backend/src/services/message.service.ts`

### Role

Room message creation and mutation.

### AI significance

Room AI output becomes a standard message through this service.

### Responsibilities in AI context

- persist AI room message
- attach memory references
- attach model ID
- attach model provider
- attach model telemetry

### Main weakness

AI room messages are stored under the triggering user's `userId`, which blurs actor identity.

## 25. `backend/prisma/schema.prisma`

### Role

Defines the backend persistence model.

### AI-relevant models

- `Conversation`
- `ConversationInsight`
- `MemoryEntry`
- `PromptTemplate`
- `Project`
- `Message`
- `Room`
- `User`

### Why it matters

The schema shows what the backend believes AI state actually is.

### Important backend AI design decisions visible in schema

- solo AI chats live in `Conversation.messages` JSON
- room AI outputs live in relational `Message` rows
- summaries are cached in `ConversationInsight`
- personal memory is first-class and relational
- prompt templates are editable through the database

## Cross-file dependency map

```mermaid
graph TD
    CHATROUTE["chat.routes.ts"] --> CHATSVC["chat.service.ts"]
    AIRROUTE["ai.routes.ts"] --> AIFEAT["aiFeature.service.ts"]
    CHATSVC --> AIRTR["ai/gemini.service.ts"]
    CHATSVC --> MEMSVC["memory.service.ts"]
    CHATSVC --> INSSVC["conversationInsights.service.ts"]
    CHATSVC --> CONVSVC["conversation.service.ts"]
    AIFEAT --> AIRTR
    MEMSVC --> AIRTR
    INSSVC --> AIRTR
    INSSVC --> PROMPTSVC["promptCatalog.service.ts"]
    SOCKET["socket/index.ts"] --> AIRTR
    SOCKET --> MEMSVC
    SOCKET --> INSSVC
    SOCKET --> MSGSVC["message.service.ts"]
    SOCKET --> QUOTASVC["aiQuota.service.ts"]
```

## File-reference takeaway

If a new engineer only reads five backend files first, they should be:

1. `backend/src/services/ai/gemini.service.ts`
2. `backend/src/services/chat.service.ts`
3. `backend/src/services/memory.service.ts`
4. `backend/src/services/conversationInsights.service.ts`
5. `backend/src/socket/index.ts`

<!-- END: 11_backend_file_reference.md -->


---

<!-- BEGIN: 12_schema_and_payload_reference.md -->

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

<!-- END: 12_schema_and_payload_reference.md -->


---

<!-- BEGIN: 13_operations_and_scenarios.md -->

# Operations and Scenarios

## Purpose

This appendix provides operational runbooks, scenario simulations, debugging procedures, and backend production-readiness notes for the AI system.

## 1. Operational mental model

When debugging backend AI, think in four stages:

1. admission
2. context assembly
3. provider execution
4. persistence and fanout

### Admission

Questions to ask:

- did auth pass?
- did validation pass?
- did rate limits pass?
- did quota pass?

### Context assembly

Questions to ask:

- did conversation lookup work?
- did project lookup work?
- did room membership validation work?
- were memories returned?
- did insight retrieval succeed?

### Provider execution

Questions to ask:

- which model was selected?
- did fallback happen?
- was output empty?
- was output malformed?
- did the provider hang?

### Persistence and fanout

Questions to ask:

- was conversation state saved?
- was room message saved?
- was `aiHistory` updated?
- did `message_created` broadcast?

## 2. Core log messages to watch

- `Incoming request`
- `Request completed`
- `Request failed`
- `AI model catalog refreshed`
- `AI provider call failed`
- `Conversation insight refresh failed`
- `trigger_ai failed`
- `Socket authentication failed`

## 3. Runbook: solo chat failure

### Symptom

User says the AI page is not responding or always failing.

### Step-by-step investigation

1. check HTTP response code from `/api/chat`
2. inspect returned error code
3. confirm bearer token validity
4. confirm request body shape
5. confirm AI quota has not been exhausted
6. inspect logs for provider failure warnings
7. inspect whether the selected project exists and belongs to the user
8. inspect whether the conversation ID belongs to the user
9. inspect whether memory retrieval threw an exception
10. inspect whether conversation persistence succeeded

### Likely codes

- `UNAUTHORIZED`
- `VALIDATION_ERROR`
- `AI_RATE_LIMITED`
- `AI_QUOTA_EXCEEDED`
- `PROJECT_MISMATCH`
- `NOT_FOUND`

## 4. Runbook: room AI failure

### Symptom

User types `/ai ...` in a room and sees no answer.

### Step-by-step investigation

1. confirm socket handshake succeeded
2. confirm the client joined the room
3. confirm the emitted event was `trigger_ai`
4. check `socket_error` payload
5. confirm quota state for the user
6. confirm room membership in the database
7. confirm recent room messages query returned data
8. inspect provider logs
9. confirm `sendRoomMessage()` wrote a row
10. confirm the room received `message_created`

## 5. Scenario simulation: provider 429 on first model

### Input

- solo chat request
- `auto` model selection
- OpenRouter returns 429

### Expected backend sequence

1. route admission succeeds
2. `resolveTaskModel()` chooses provider order
3. OpenRouter call fails
4. error is normalized as rate limit
5. warning is logged
6. Gemini is tried next
7. Gemini succeeds
8. response is returned with `fallbackUsed: true`

### Operational takeaway

Fallback is already product-grade enough to preserve user experience in many first-provider failure cases.

## 6. Scenario simulation: all providers unavailable

### Expected backend sequence

1. every provider attempt fails
2. each failure logs a warning
3. deterministic fallback is returned
4. persistence still happens if later writes succeed

### User-facing effect

The user gets a degraded answer instead of a raw internal error.

## 7. Scenario simulation: malformed JSON from provider

### Affected features

- smart replies
- sentiment
- memory extraction
- insight generation

### Current backend behavior

- try JSON parse
- if parse fails, use task-specific fallback behavior

### Risk

The backend preserves contract shape more reliably than semantic quality.

## 8. Scenario simulation: provider hang

### Current reality

The backend intends to use timeouts.

The implementation does not fully cancel requests.

### Operational effect

- long latency spikes
- resource retention under upstream hangs
- room AI appears frozen longer than expected

## 9. Scenario simulation: persistence failure after generation

### Example

- provider returns a valid answer
- conversation update fails because the database is unavailable

### Current backend effect

- AI work is already spent
- no replay log exists
- the result may be lost from durable product state

### Recommended fix

Introduce an `AiRun` ledger and split generation state from product persistence state.

## 10. Retry guidance

### Generally safe retries

- `GET /api/ai/models`
- `GET insight routes`
- `POST /api/ai/sentiment`
- `POST /api/ai/grammar`

### Retry with caution

- `POST /api/chat`
- socket `trigger_ai`

Because cost may already be incurred even if persistence failed later.

## 11. Monitoring metrics worth adding

### Request metrics

- AI requests by task
- AI requests by route
- success rate by task
- failure rate by code
- fallback rate by task

### Latency metrics

- p50, p95, p99 total latency
- provider latency by provider and model
- persistence latency after generation

### Quality metrics

- malformed JSON parse rate
- empty response rate
- deterministic fallback rate
- memory retrieval hit rate

### Cost-control metrics

- requests per user per day
- estimated tokens per user per day
- provider distribution by task

## 12. Alert suggestions

- provider failure rate above threshold
- timeout rate above threshold
- fallback rate spike
- room AI message creation failures
- quota rejection spike across many users
- memory extraction parse failures above threshold

## 13. Circuit breaker proposal

### Why it is needed

When one provider is unhealthy, the backend should stop wasting time on repeated failures.

### Minimum breaker fields

- provider
- model
- rolling failure count
- rolling timeout count
- state: closed, open, half-open
- open-until timestamp

### Where to store it

- Redis for shared state

## 14. Logging upgrades

### Good current state

- structured JSON logs
- redaction of sensitive fields

### Needed next improvements

- explicit AI run ID in logs
- prompt-template key and version in logs
- selected model and requested model in every AI log line
- parse-failure counters for structured-output tasks

## 15. Production-readiness checklist

### Admission controls

- auth enforced
- validation enforced
- AI rate limit enforced
- AI quota enforced

### Reliability controls

- deterministic fallback exists
- provider fallback chain exists
- async insight refresh isolates some non-critical work

### Missing controls

- real timeout cancellation
- distributed quota and rate limits
- provider circuit breaker
- AI run ledger
- streaming
- structured-output enforcement

## 16. Backend deployment readiness scorecard

| Area | Current state | Readiness |
|---|---|---|
| Auth and policy | strong | good |
| Prompt context assembly | good | good |
| Provider routing | practical | moderate |
| Structured output reliability | weak | low |
| Timeout handling | incomplete | low |
| Personalization | good | moderate to good |
| Multi-instance scaling | weak | low |
| Observability | moderate | moderate |
| Recovery and replay | weak | low |

## 17. Suggested SLOs for backend AI

### Availability SLO

- percentage of AI requests that return a syntactically valid response envelope

### Latency SLO

- p95 solo AI chat response under agreed threshold
- p95 room AI response under agreed threshold

### Quality SLO proxy

- malformed structured-output rate below threshold
- deterministic fallback rate below threshold

## 18. Release checklist for provider changes

1. verify env keys in staging
2. verify model ID names
3. test smart replies parse behavior
4. test sentiment parse behavior
5. test grammar fallback behavior
6. test solo chat with project context
7. test room slash AI
8. inspect logs for selected model and fallback behavior

## 19. Release checklist for prompt-template changes

1. confirm template key matches consuming code
2. test insight generation parse rate
3. verify no prompt variable placeholder remains unfilled
4. compare fallback rate before and after change
5. capture example outputs for regression review

## 20. Failure-mode table

| Failure mode | Detection | Current handling | Better future handling |
|---|---|---|---|
| invalid bearer token | HTTP 401 | reject request | keep |
| invalid socket token | socket auth error | reject socket | keep |
| malformed request body | Zod validation | reject request | keep |
| AI rate burst exceeded | limiter response | 429 with retry hint | keep with Redis |
| quota exceeded | quota middleware/service | 429 or socket error | keep with distributed store |
| provider 429 | warning log + fallback chain | try next model | add breaker |
| provider timeout | long latency or failure | best effort, incomplete timeout | real cancellation + breaker |
| empty provider content | error path | try next model | keep |
| malformed JSON response | parse fail | task-specific fallback | add structured output mode |
| DB failure after generation | request failure | no replay | add run ledger |

## 21. Sample operator workflow: high fallback spike

### Symptoms

- many successful responses but poor answer quality
- telemetry shows `fallbackUsed: true` frequently

### Investigation path

1. group logs by provider
2. inspect provider-specific warnings
3. confirm recent env changes
4. test `/api/ai/models` catalog contents
5. run manual requests against each provider path in staging
6. determine whether outage is provider-side or config-side

### Short-term mitigation

- change default model to the healthiest provider
- disable broken provider if necessary

## 22. Sample operator workflow: room AI lag complaints

### Symptoms

- users report `/ai` in rooms takes too long

### Investigation path

1. inspect socket event rate and flood-state logs
2. inspect provider latency metrics
3. inspect DB latency for message creation
4. inspect whether fallbacks are causing chain retries
5. inspect message volume in active rooms

### Likely fixes

- fix timeout behavior
- add breaker
- add streaming or intermediate progress reporting

## 23. Sample operator workflow: memory feels stale

### Symptoms

- users say AI keeps repeating old preferences or irrelevant facts

### Investigation path

1. inspect ranked memories for recent prompts
2. inspect pinned entries
3. inspect usage counts and recency values
4. inspect whether old memories dominate due to pinned or usage boost

### Likely fixes

- decay recency over time
- expose retrieval reasons
- add memory categories
- add better ranking logic

## 24. Backend operational conclusion

The backend AI system is operationally usable today.

It is not yet operationally mature enough for high-scale, high-availability AI workloads.

The biggest improvements should focus on:

- real timeout control
- distributed state
- structured-output guarantees
- observability and replayability

<!-- END: 13_operations_and_scenarios.md -->


---

<!-- BEGIN: 14_glossary_rebuild_and_examples.md -->

# Glossary, Rebuild Checklist, and Example Catalog

## Purpose

This appendix exists to make the backend AI system easier to onboard into, reason about, and rebuild.

## Glossary

### AI router

The shared backend service that selects a model, calls a provider, and returns normalized result data.

In ChatSphere, this is implemented in `backend/src/services/ai/gemini.service.ts`.

### Model catalog

The in-memory list of configured model entries used for selection and routing.

### Deterministic fallback

A non-provider response generated entirely by backend code when providers fail.

### Insight

A structured summary stored in `ConversationInsight` and used both for UI display and future context compression.

### Memory entry

A durable user fact or preference stored in `MemoryEntry`.

### Project context

Structured metadata stored in `Project` and injected into solo AI prompts.

### Utility AI endpoint

A backend route that provides a focused AI function instead of a full chat experience.

Examples:

- smart replies
- sentiment
- grammar

### Room AI

The backend AI flow triggered through Socket.IO in a room context.

### Solo AI chat

The backend AI flow triggered through `POST /api/chat` and persisted in `Conversation.messages`.

### Structured-output task

A task where the backend expects machine-readable output such as JSON.

Examples:

- memory extraction
- insight generation
- smart replies
- sentiment

## Rebuild checklist

### Phase 1. Core platform

- create Node and TypeScript backend
- wire Express
- wire Socket.IO
- wire Prisma and PostgreSQL
- add request context logging

### Phase 2. Authentication and admission

- bearer auth middleware
- socket auth middleware
- request validation middleware
- generic API rate limiter
- AI-specific limiter and quota

### Phase 3. Shared AI execution layer

- provider adapter abstraction
- model catalog
- model selection logic
- deterministic fallback
- telemetry envelope
- usage envelope

### Phase 4. Solo chat

- route `POST /api/chat`
- conversation persistence
- project context lookup
- conversation history normalization

### Phase 5. Memory

- `MemoryEntry` schema
- deterministic extraction
- AI-assisted extraction
- retrieval ranking
- usage tracking

### Phase 6. Insight engine

- `ConversationInsight` schema
- prompt template system
- conversation summary generation
- room summary generation

### Phase 7. Room AI

- socket `trigger_ai`
- room membership checks
- room message persistence with AI metadata
- room thinking signal

### Phase 8. Utility AI routes

- smart replies
- sentiment
- grammar
- model list

### Phase 9. Production hardening

- real timeout cancellation
- structured-output enforcement
- provider breaker state
- distributed quota and rate limiting
- AI run ledger

## Example: solo chat prompt assembly

### Inputs

- user prompt
- prior messages
- project context
- top memories
- conversation insight

### Backend result

A prompt body that includes:

- raw user goal
- explicit project context lines
- summarized memory lines
- insight summary line

## Example: room AI prompt assembly

### Inputs

- slash prompt
- recent room history
- user-specific memories
- room insight

### Backend result

A prompt body with memory and room insight plus chronological room history passed separately.

## Example: smart replies backend behavior

### Ideal provider output

JSON array of strings.

### Current backend tolerance

If the provider returns malformed prose, the backend still returns an array, but may wrap the raw text as a single item.

## Example: sentiment backend behavior

### Ideal provider output

```json
{
  "label": "negative",
  "confidence": 0.84,
  "reason": "Language shows concern and uncertainty."
}
```

### Current fallback behavior

```json
{
  "label": "neutral",
  "confidence": 0.5,
  "reason": "Fallback sentiment classifier used"
}
```

## Example: grammar backend behavior

### Ideal provider output

Polished text.

### Current fallback behavior

The original trimmed input is returned unchanged.

## Example: memory extraction candidate

```json
{
  "summary": "I prefer concise technical documentation.",
  "details": "Preference extracted from user message",
  "tags": ["preference"],
  "confidence": 0.75,
  "importance": 0.65
}
```

## Example: conversation insight payload

```json
{
  "title": "Architecture discussion",
  "summary": "The team compared provider routing and timeout handling trade-offs.",
  "intent": "System design review",
  "topics": ["AI routing", "timeouts"],
  "decisions": ["Keep one shared AI router"],
  "actionItems": ["Implement real timeout cancellation"],
  "messageCount": 18
}
```

## Example: room AI storage metadata

### Stored with message

- `isAI: true`
- `triggeredBy: userId`
- `memoryRefs`
- `modelId`
- `modelProvider`
- `modelTelemetry`

## Edge-case handling quick reference

### Empty prompt

Handled by validation and service-level trim check.

### Empty provider response

Handled as a provider failure and routed to next model.

### Provider outage

Handled through fallback chain and deterministic fallback.

### Malformed JSON

Handled by parse fallback in the calling service.

### Quota exceeded

Handled before AI provider call.

### Room non-member triggering AI

Handled before AI provider call.

## Backend rebuild priorities if starting tomorrow

1. preserve response envelopes
2. preserve persistence model for conversations, insights, memories, and room messages
3. preserve task-specific fallback behavior
4. preserve per-user feature flags
5. preserve socket room AI semantics
6. improve provider internals under the same contracts

## New-developer onboarding path

### Day 1

- read `01_overview.md`
- read `02_ai_integration.md`
- read `09_code_walkthrough.md`

### Day 2

- trace `/api/chat`
- trace `trigger_ai`
- inspect `MemoryEntry` and `ConversationInsight`

### Day 3

- make a small prompt-template improvement
- test smart replies or insight generation
- inspect fallback logs

## Final onboarding note

The easiest mistake when joining this backend is to treat AI as one route or one provider.

The correct view is:

- AI is a reusable backend capability
- the shared router is the technical center
- memory and insight are what make the system product-specific
- realtime room AI is where operational complexity rises fastest

<!-- END: 14_glossary_rebuild_and_examples.md -->

