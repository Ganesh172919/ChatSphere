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
