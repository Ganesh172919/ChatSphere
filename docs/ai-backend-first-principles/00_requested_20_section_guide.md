# ChatSphere AI Backend First-Principles Guide

This file is the front door to the new documentation folder.

The folder already contains the expanded backend AI deep-dive set copied into this location so the documentation stays source-grounded and comfortably exceeds the requested minimum length.

This guide reorganizes that material into the exact 20-section structure you asked for and points you to the strongest files for each topic.

Use it like a syllabus.

Read this file first.

Then jump into the linked deep-dive files.

The strongest master file in this folder is:

- [15_complete_backend_ai_documentation.md](./15_complete_backend_ai_documentation.md)

The most implementation-dense supporting files are:

- [11_backend_file_reference.md](./11_backend_file_reference.md)
- [12_schema_and_payload_reference.md](./12_schema_and_payload_reference.md)
- [09_code_walkthrough.md](./09_code_walkthrough.md)
- [04_chat_and_socket_flow.md](./04_chat_and_socket_flow.md)
- [05_memory_and_context.md](./05_memory_and_context.md)

The live backend files that matter most for AI are:

- `backend/src/services/ai/gemini.service.ts`
- `backend/src/services/chat.service.ts`
- `backend/src/services/memory.service.ts`
- `backend/src/services/aiFeature.service.ts`
- `backend/src/services/conversationInsights.service.ts`
- `backend/src/services/promptCatalog.service.ts`
- `backend/src/services/aiQuota.service.ts`
- `backend/src/socket/index.ts`
- `backend/prisma/schema.prisma`

## 1. Executive Summary (Deep)

Read:

- [15_complete_backend_ai_documentation.md](./15_complete_backend_ai_documentation.md)
- [01_overview.md](./01_overview.md)

Core implementation truth:

- The AI system is an embedded backend capability, not a separate AI microservice.
- All major AI features converge on `sendAiMessage()` in `backend/src/services/ai/gemini.service.ts`.
- Solo AI chat is handled over HTTP in `backend/src/routes/chat.routes.ts` and `backend/src/services/chat.service.ts`.
- Room AI is handled over Socket.IO in `backend/src/socket/index.ts`.
- Memory is stored in the `MemoryEntry` Prisma model and retrieved through `backend/src/services/memory.service.ts`.
- Insights are stored in `ConversationInsight` and built in `backend/src/services/conversationInsights.service.ts`.

First-principles reading:

- The system is a context compiler.
- The system is a provider router.
- The system is a persistence loop.
- The system is not yet a distributed AI platform.

Reality check:

- Strong at feature integration.
- Moderate at reliability.
- Weak at horizontal scalability.
- Weak at strict structured output.
- Moderate at observability.

Immediate maturity assessment:

- Product-ready for small to moderate scale.
- Not ready for serious multi-instance scale without Redis-backed coordination and worker offloading.

## 2. Complete Backend Architecture

Read:

- [15_complete_backend_ai_documentation.md](./15_complete_backend_ai_documentation.md)
- [02_ai_integration.md](./02_ai_integration.md)
- [03_api_routes.md](./03_api_routes.md)
- [04_chat_and_socket_flow.md](./04_chat_and_socket_flow.md)

Architecture map in plain language:

- Routes admit and validate requests.
- Middleware authenticates and rate-limits them.
- Services gather domain context.
- The AI core chooses a model chain and executes provider requests.
- Prisma persists AI outputs and supporting artifacts.
- Socket.IO mirrors the same logic for room AI.

Layer inventory:

- Route layer: `chat.routes.ts`, `ai.routes.ts`, `conversations.routes.ts`, `memory.routes.ts`, `rooms.routes.ts`.
- Middleware layer: `auth.middleware.ts`, `rateLimit.middleware.ts`, `aiQuota.middleware.ts`, `validate.middleware.ts`, `requestContext.middleware.ts`, `socketAuth.middleware.ts`.
- Service layer: `chat.service.ts`, `memory.service.ts`, `aiFeature.service.ts`, `conversationInsights.service.ts`, `conversation.service.ts`, `message.service.ts`, `room.service.ts`, `project.service.ts`, `settings.service.ts`.
- AI core: `services/ai/gemini.service.ts`.
- Persistence layer: Prisma client plus `schema.prisma`.
- Transport layer: `app.ts`, `server.ts`, `socket/index.ts`.

Critical architectural nuance:

- The model catalog is in memory.
- Prompt templates are in memory plus database overlay.
- Quota is in memory.
- Socket flood control is in memory.
- Presence maps are in memory.
- That means the architecture assumes one process unless upgraded.

## 3. AI Core System (CRITICAL)

Read:

- [15_complete_backend_ai_documentation.md](./15_complete_backend_ai_documentation.md)
- [02_ai_integration.md](./02_ai_integration.md)
- [09_code_walkthrough.md](./09_code_walkthrough.md)
- [11_backend_file_reference.md](./11_backend_file_reference.md)

Functions to study in order:

- `refreshModelCatalog()`
- `getModelCatalog()`
- `estimateComplexity()`
- `resolveTaskModel()`
- `callOpenRouter()`
- `callGemini()`
- `callHuggingFace()`
- `callProviderModel()`
- `sendAiMessage()`

What `sendAiMessage()` actually does:

- Accepts a task type, prompt text, optional history, optional requested model, optional attachment, and optional JSON hint.
- Estimates complexity from message length and a few keywords.
- Resolves a provider chain using catalog order and simple filtering.
- Tries providers one by one.
- Logs normalized warnings on failure.
- Computes rough token estimates from string lengths.
- Emits telemetry.
- Falls back deterministically if all providers fail.

Important implementation details:

- JSON output is not guaranteed.
- Timeout logic is incomplete because the abort controller is not threaded into `fetch`.
- Grok, Groq, and Together are logical catalog entries but operationally route through the OpenRouter call path when invoked.
- Attachment support is metadata-oriented, not true multimodal transport.

## 4. Prompt Engineering System

Read:

- [15_complete_backend_ai_documentation.md](./15_complete_backend_ai_documentation.md)
- [05_memory_and_context.md](./05_memory_and_context.md)
- [11_backend_file_reference.md](./11_backend_file_reference.md)

Prompt construction sources:

- Solo chat prompt assembly in `chat.service.ts`.
- Room AI prompt assembly in `socket/index.ts`.
- Insight template use in `conversationInsights.service.ts`.
- Prompt definitions in `promptCatalog.service.ts`.

Key truth:

- Prompt templates exist for more features than currently use them.

Examples:

- `conversation-insight` is actively used.
- `group-chat` is used to seed `room.aiHistory`.
- `smart-replies`, `sentiment`, `grammar`, `memory-extract`, and `solo-chat` exist but are not consistently used by their runtime services.

Prompt risk profile:

- Memory summaries are injected as plain text.
- Project instructions are injected as plain text.
- Insight summaries are injected as plain text.
- Uploaded text content can become plain prompt text.
- There is no trust boundary or escaping layer between trusted context and untrusted user-supplied content.

## 5. Memory System Deep Dive

Read:

- [15_complete_backend_ai_documentation.md](./15_complete_backend_ai_documentation.md)
- [05_memory_and_context.md](./05_memory_and_context.md)
- [12_schema_and_payload_reference.md](./12_schema_and_payload_reference.md)

Study these implementation pieces:

- `extractDeterministicCandidates()`
- `extractAiCandidates()`
- `upsertMemoryCandidates()`
- `upsertMemoriesFromUserMessage()`
- `getRelevantMemories()`
- `markMemoriesUsed()`

Memory design in first principles:

- Extraction asks what the user said that might still matter later.
- Storage turns that candidate fact into a durable record.
- Retrieval scores how useful that fact is for the current prompt.
- Usage tracking feeds back into future ranking.

The current ranking system is scalar, not semantic:

- Overlap score.
- Importance score.
- Confidence score.
- Recency score.
- Pin boost.
- Usage boost.

Why this matters:

- It is easy to reason about.
- It is cheap to run.
- It will eventually lose quality compared to embeddings and vector retrieval.

## 6. AI Request Lifecycle (VERY DETAILED)

Read:

- [04_chat_and_socket_flow.md](./04_chat_and_socket_flow.md)
- [15_complete_backend_ai_documentation.md](./15_complete_backend_ai_documentation.md)
- [13_operations_and_scenarios.md](./13_operations_and_scenarios.md)

Three lifecycles matter:

- Solo chat lifecycle.
- Room AI lifecycle.
- Utility API lifecycle.

Solo chat path:

- Route validates input.
- Middleware enforces auth and AI policy.
- Chat service loads conversation, project, memory, and optional insight.
- AI core executes provider routing.
- Conversation service appends messages.
- Memory service extracts new memories.
- Insight service refreshes summary asynchronously.

Room AI path:

- Socket auth verifies token.
- Flood control caps event rate.
- `trigger_ai` validates payload and consumes quota.
- Recent room messages become history.
- Personal memories and room insight become extra prompt context.
- AI result is persisted as a room message.
- `room.aiHistory` is updated.
- Event broadcast completes the room loop.

Utility API path:

- Feature flag check.
- AI call.
- Best-effort JSON parse.
- Fallback normalization if parsing fails.

## 7. Service-by-Service Breakdown

Read:

- [11_backend_file_reference.md](./11_backend_file_reference.md)
- [09_code_walkthrough.md](./09_code_walkthrough.md)

Service order that best teaches implementation:

1. `gemini.service.ts`
2. `chat.service.ts`
3. `memory.service.ts`
4. `conversationInsights.service.ts`
5. `promptCatalog.service.ts`
6. `aiFeature.service.ts`
7. `aiQuota.service.ts`
8. `socket/index.ts`

What to focus on in each file:

- Responsibility.
- Inputs and outputs.
- Data dependencies.
- Failure behavior.
- Persisted side effects.
- Hidden assumptions.

Most important hidden assumptions by file:

- `gemini.service.ts`: timeout cancellation is intended but not truly implemented.
- `chat.service.ts`: project context and memory are appended as plain text.
- `memory.service.ts`: lexical ranking substitutes for semantic retrieval.
- `conversationInsights.service.ts`: summary generation is synchronous on cache miss.
- `promptCatalog.service.ts`: template usage is partial and cache refresh is coarse.
- `aiFeature.service.ts`: backend feature flags exist even if UI exposure is limited.
- `aiQuota.service.ts`: single-process assumption.
- `socket/index.ts`: room AI authorship and concurrency semantics are underspecified.

## 8. API Layer Deep Dive

Read:

- [03_api_routes.md](./03_api_routes.md)
- [12_schema_and_payload_reference.md](./12_schema_and_payload_reference.md)
- [11_backend_file_reference.md](./11_backend_file_reference.md)

AI-specific HTTP routes:

- `POST /api/chat`
- `GET /api/ai/models`
- `POST /api/ai/smart-replies`
- `POST /api/ai/sentiment`
- `POST /api/ai/grammar`
- `GET /api/conversations/:conversationId/insights`
- `POST /api/conversations/:conversationId/actions`
- `GET /api/memory`
- `PUT /api/memory/:memoryId`
- `DELETE /api/memory/:memoryId`
- `POST /api/memory/import`
- `GET /api/memory/export`
- `GET /api/rooms/:roomId/insights`
- `POST /api/rooms/:roomId/actions`

AI-relevant socket events:

- `trigger_ai`
- `message_created`
- `ai_thinking`
- `socket_error`

Implementation truth:

- HTTP and socket flows share core AI execution but not transport behavior.
- Route validation is strong because Zod schemas are explicit.
- Output schemas are weaker because AI-generated JSON is parsed permissively.

## 9. Rate Limiting & AI Quota System

Read:

- [06_security_and_rate_limiting.md](./06_security_and_rate_limiting.md)
- [07_failure_handling.md](./07_failure_handling.md)
- [11_backend_file_reference.md](./11_backend_file_reference.md)

There are three policy layers:

- `aiLimiter` for minute-level route throttling.
- `aiQuota` for broader fixed-window AI budgets.
- Socket flood control for event spam resistance.

Why this design is good early:

- Very cheap.
- Very simple.
- Easy to debug.

Why it fails later:

- It is not shared across instances.
- It resets on restart.
- It cannot produce durable analytics.

## 10. Failure Handling System

Read:

- [07_failure_handling.md](./07_failure_handling.md)
- [15_complete_backend_ai_documentation.md](./15_complete_backend_ai_documentation.md)

Failure families:

- Provider failure.
- Timeout failure.
- Empty output failure.
- JSON parse failure.
- DB write failure.
- Socket delivery failure.

Current philosophy:

- Try another provider.
- If all fail, degrade gracefully.
- Preserve user-facing continuity.

Critical downside:

- Soft failure can hide real reliability degradation unless telemetry and logs are actively monitored.

## 11. Stability Analysis

Read:

- [08_scalability_and_performance.md](./08_scalability_and_performance.md)
- [13_operations_and_scenarios.md](./13_operations_and_scenarios.md)
- [15_complete_backend_ai_documentation.md](./15_complete_backend_ai_documentation.md)

Main latency sources:

- Provider round trip.
- Conversation and memory queries.
- Room message fetches.
- Synchronous insight generation on demand.
- Post-generation persistence.

Likely breaking points:

- Concurrent room AI.
- Multi-instance deployment without shared limiter state.
- Heavy prompt assembly with large attachments or project context.

## 12. Scaling Architecture

Read:

- [08_scalability_and_performance.md](./08_scalability_and_performance.md)
- [10_future_improvements.md](./10_future_improvements.md)

What to scale first:

- Quota and limiter state.
- Socket presence and room fanout coordination.
- AI execution off the request path.

Future architecture direction:

- Redis for shared coordination.
- Queue-backed AI workers.
- Schema-enforced outputs.
- Vector retrieval for memory and project context.

## 13. API Keys & Provider Management

Read:

- [02_ai_integration.md](./02_ai_integration.md)
- [11_backend_file_reference.md](./11_backend_file_reference.md)

Where provider configuration lives:

- `backend/src/config/env.ts`
- Environment variables.

What startup does:

- Validates required non-AI environment keys.
- Connects Prisma.
- Refreshes prompt catalog.
- Refreshes model catalog.

Important operational truth:

- The server can boot without valid AI provider keys.
- AI routes will still exist.
- Real provider calls will then fall into the configured fallback behavior.

## 14. Edge Cases (VERY IMPORTANT)

Read:

- [13_operations_and_scenarios.md](./13_operations_and_scenarios.md)
- [15_complete_backend_ai_documentation.md](./15_complete_backend_ai_documentation.md)

High-value edge cases to study:

- Concurrent room AI triggers.
- Duplicate solo chat retries.
- Unknown `modelId`.
- Malformed AI JSON.
- Missing or stale insight.
- Memory duplication by paraphrase.
- Attachment format mismatch.
- User disconnect during room AI execution.

## 15. How to Fix Failures (Practical Guide)

Read:

- [07_failure_handling.md](./07_failure_handling.md)
- [13_operations_and_scenarios.md](./13_operations_and_scenarios.md)
- [15_complete_backend_ai_documentation.md](./15_complete_backend_ai_documentation.md)

Start here when debugging:

- Confirm auth.
- Confirm rate-limit versus quota failure.
- Check request payload size.
- Inspect provider failure logs.
- Inspect telemetry attached to assistant messages.
- Inspect conversation or message persistence.
- Inspect memory usage and insight refresh side effects.

Immediate code-level fixes worth prioritizing:

- Real abortable provider timeouts.
- Redis-backed counters.
- Queue-backed room AI.
- Strong JSON schema validation.
- Better room AI authorship semantics.

## 16. Beyond Code (CRITICAL THINKING)

Read:

- [10_future_improvements.md](./10_future_improvements.md)
- [14_glossary_rebuild_and_examples.md](./14_glossary_rebuild_and_examples.md)

Evolution directions:

- RAG system.
- Vector-backed memory.
- Project-file retrieval.
- Streaming tokens.
- Agent-style tool use.

The key design principle:

- Do not jump straight to agents.
- First make context retrieval, output schemas, and transport reliability strong.

## 17. Full System Flow (MASTER DIAGRAM)

Read:

- [00_master_deep_dive.md](./00_master_deep_dive.md)
- [04_chat_and_socket_flow.md](./04_chat_and_socket_flow.md)
- [15_complete_backend_ai_documentation.md](./15_complete_backend_ai_documentation.md)

The full path is:

- User action.
- Frontend route or socket event.
- Backend auth and policy.
- Context gathering.
- AI provider execution.
- Persistence.
- Response or broadcast.
- Future-context feedback loop through memory and insights.

The most important implementation insight:

- Memory and insight are both outputs of prior execution and inputs to future execution.

That makes the system recursive at the product layer even though it is not agentic.

## 18. Code Snippets (MANDATORY)

Read:

- [09_code_walkthrough.md](./09_code_walkthrough.md)
- [11_backend_file_reference.md](./11_backend_file_reference.md)

Prioritize these snippets:

- `sendAiMessage()` provider loop and fallback logic.
- `handleSoloChat()` prompt assembly and persistence.
- `getRelevantMemories()` ranking logic.
- `buildInsightPayload()` and `parseInsightJson()`.
- `trigger_ai` in `socket/index.ts`.
- `aiLimiter` and `aiQuota`.

## 19. Tradeoffs Analysis

Read:

- [08_scalability_and_performance.md](./08_scalability_and_performance.md)
- [10_future_improvements.md](./10_future_improvements.md)
- [15_complete_backend_ai_documentation.md](./15_complete_backend_ai_documentation.md)

Main tradeoffs:

- Simplicity vs scalability.
- String concatenation vs structured prompt objects.
- JSON columns vs rigid schemas.
- Soft fallback vs explicit failure.
- Integrated monolith vs dedicated AI service platform.

## 20. Final Engineering Assessment

Read:

- [15_complete_backend_ai_documentation.md](./15_complete_backend_ai_documentation.md)

Short verdict:

- The backend AI implementation is good enough to teach from and extend safely if you understand its assumptions.
- It is especially strong as a feature-integrated AI monolith.
- It is not yet strong as a production-scale distributed AI system.

What is good:

- Central AI kernel.
- Clear route-service separation.
- Strong enough persistence model for debugging and replay reasoning.
- Useful memory and insight loops.

What must be fixed soon:

- True timeout cancellation.
- Shared limiter and quota state.
- Queue-based room AI.
- Stronger output schemas.
- Clear AI identity model for room messages.

What can scale:

- Solo chat with moderate hardening.
- Memory with retrieval upgrades.
- Insight generation once queued and cached correctly.

What will break first:

- Realtime room AI under concurrency.
- Multi-instance quota correctness.
- Provider reliability visibility when fallback hides upstream failure.

## Recommended Reading Order

If you want to understand the AI backend in the fastest correct order, use this sequence:

1. [00_requested_20_section_guide.md](./00_requested_20_section_guide.md)
2. [15_complete_backend_ai_documentation.md](./15_complete_backend_ai_documentation.md)
3. [11_backend_file_reference.md](./11_backend_file_reference.md)
4. [12_schema_and_payload_reference.md](./12_schema_and_payload_reference.md)
5. [04_chat_and_socket_flow.md](./04_chat_and_socket_flow.md)
6. [05_memory_and_context.md](./05_memory_and_context.md)
7. [07_failure_handling.md](./07_failure_handling.md)
8. [08_scalability_and_performance.md](./08_scalability_and_performance.md)
9. [10_future_improvements.md](./10_future_improvements.md)

## Folder Purpose

This folder is now the AI-backend-only documentation set.

It contains:

- the original expanded deep-dive files,
- a new exact-structure guide aligned to your requested 20 sections,
- and enough total material to function as blueprint, onboarding guide, debugging reference, scaling plan, and architecture roadmap.
