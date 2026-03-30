# Jagadesh - AI Platform, Conversations, Memory, and Knowledge Workflows

## Overview
Jagadesh should own the backend's AI and knowledge layer. This domain includes solo chat orchestration, conversation persistence, model routing, prompt-template management, memory extraction and ranking, conversation insights, AI utility endpoints, project context, and import/export paths that feed AI workflows.

This is one of the deepest parts of the backend because it mixes product logic, external provider integration, data persistence, cost controls, and asynchronous enrichment. The current code already supports rich behavior, but it is also carrying orchestration complexity that will become harder to manage without clearer boundaries and better background processing.

## Core Responsibilities
- Solo AI chat and conversation continuation
- Conversation storage and transcript lifecycle
- Conversation insights and post-processing
- Memory extraction, deduplication, ranking, and export/import
- AI utility endpoints such as smart replies, sentiment, and grammar
- Prompt catalog, model catalog, provider integration, quota logic, and AI telemetry
- Project context loading for AI workflows

## Detailed Tasks

### High Priority
1. Refactor AI orchestration into cleaner layers.
   Work:
   - Break `chat.service.ts` into smaller units for context building, provider invocation, persistence, memory updates, and insight refresh triggers.
   - Keep `handleSoloChat` as the entry point, but move heavy logic into reusable helpers so room AI and utility features can share patterns.
   - Define a stable internal contract for AI responses: content, model metadata, usage, telemetry, memory refs, and insight payloads.
   Why this matters:
   - The current AI flow works, but it is carrying too many responsibilities in one orchestration path.
   Done when:
   - Chat orchestration is decomposed into named modules with clear responsibilities.
   - The output contract is consistent across AI entry points.

2. Replace in-memory AI quota and ephemeral AI state with pluggable infrastructure-ready abstractions.
   Work:
   - Move quota counting behind a cache/storage abstraction instead of raw in-memory maps.
   - Preserve the current behavior while making Redis or another shared backend possible later.
   - Align quota errors and retry metadata across HTTP and socket AI paths.
   Why this matters:
   - In-memory quota works for one process but is not safe for horizontally scaled AI traffic.
   Done when:
   - Quota logic has a clear storage seam.
   - AI quota behavior is consistent for `/api/ai`, `/api/chat`, and room-level AI triggers.

3. Move expensive AI-derived enrichment onto a job-ready asynchronous path.
   Work:
   - Define background-job seams for conversation insight refresh, deeper memory extraction, and large import processing.
   - Keep the current synchronous fallback path where necessary, but make queue dispatch the preferred mechanism.
   - Add idempotency rules so retries do not duplicate memories or insights.
   Why this matters:
   - AI enrichment should not make the request path slower or less reliable than it needs to be.
   Done when:
   - Insight refresh and heavy enrichment can be dispatched asynchronously.
   - Retry behavior is safe and idempotent.

4. Standardize AI telemetry, model metadata, and failure semantics.
   Work:
   - Normalize how usage, provider name, model ID, latency, and fallback indicators are returned and stored.
   - Make AI utility endpoints return the same telemetry shape as main chat wherever reasonable.
   - Define stable error codes for provider timeout, quota exhaustion, invalid model selection, and provider parse failures.
   Why this matters:
   - The AI domain is already broad enough that inconsistency will become a maintenance problem quickly.
   Done when:
   - Telemetry and model metadata are consistent across AI services.
   - Provider failures are easier for frontend and operators to interpret.

### Medium Priority
5. Improve memory quality, performance, and predictability.
   Work:
   - Review memory extraction heuristics, ranking signals, and deduplication fingerprints for edge cases.
   - Add explicit payload-size and context-size budgets when loading relevant memories into prompts.
   - Add tests for duplicate memories, pinned-memory priority, relevance scoring, and export/import stability.
   Why this matters:
   - Memory quality directly shapes how intelligent the AI experience feels over time.
   Done when:
   - Memory ranking and dedup behavior are documented in tests and more predictable under edge cases.

6. Harden project-context loading and conversation import/export flows.
   Work:
   - Validate project attachments and context sizes before they enter AI prompts.
   - Improve import dedup logic beyond simple title matching so repeated imports behave safely.
   - Add partial-failure reporting so imports can skip duplicates while still telling the caller exactly what happened.
   Why this matters:
   - Project context and imports are both high-value features that can quietly become messy if their constraints are weak.
   Done when:
   - Import/export responses are explicit and safe.
   - Project context loading has clear limits and validation.

7. Strengthen prompt and model catalog management.
   Work:
   - Add clearer active-version rules for prompt templates.
   - Introduce cache invalidation or TTL refresh rules for prompt and model catalogs.
   - Prepare the provider layer so future model providers can be added without rewriting the AI domain.
   Why this matters:
   - This is the clean-architecture seam that makes the AI subsystem maintainable instead of provider-specific.
   Done when:
   - Prompt/model catalogs have predictable refresh behavior.
   - Provider wiring is easier to extend.

### Low Priority
8. Build an AI-domain regression suite.
   Work:
   - Add tests for conversation continuation, insight fallback behavior, memory extraction/dedup, AI quota exceeded flows, project-context loading, import preview, and import idempotency.
   - Include socket-triggered room AI tests where practical.
   Why this matters:
   - AI features are some of the least deterministic parts of the system, so guardrails matter more here than almost anywhere else.
   Done when:
   - Core AI workflows can be validated automatically with provider calls mocked or stabilized.

## File/Folder Ownership
Jagadesh should be the primary owner of:

```text
backend/src/routes/chat.routes.ts
backend/src/routes/conversations.routes.ts
backend/src/routes/ai.routes.ts
backend/src/routes/projects.routes.ts
backend/src/routes/memory.routes.ts
backend/src/routes/export.routes.ts
backend/src/routes/import.routes.ts
backend/src/services/chat.service.ts
backend/src/services/conversation.service.ts
backend/src/services/conversationInsights.service.ts
backend/src/services/memory.service.ts
backend/src/services/aiFeature.service.ts
backend/src/services/aiQuota.service.ts
backend/src/services/project.service.ts
backend/src/services/importExport.service.ts
backend/src/services/promptCatalog.service.ts
backend/src/services/ai/gemini.service.ts
backend/prisma/schema.prisma
```

## Dependencies
- Depends on Ashish for queue/cache/metrics infrastructure, schema migrations, and slow-query observability.
- Depends on Ganesh when AI feature toggles or account settings affect AI access and quota enforcement.
- Depends on Harsha for room-level AI trigger behavior and consistency between solo AI and in-room AI flows.
- Depends on Hari for AI regression fixtures, prompt-template documentation, and smoke coverage after the refactor settles.

## Deliverables
- Cleaner AI orchestration modules with reusable internal contracts
- Quota logic that is no longer tied to single-process memory
- Queue-ready background path for insight and memory enrichment
- Consistent telemetry and error semantics across AI endpoints
- Safer project-context loading and import/export behavior
- Automated AI-domain regression coverage

## Priority Levels
- High: orchestration refactor, durable quota abstraction, async enrichment seams, telemetry/error standardization
- Medium: memory-quality improvements, project/import hardening, prompt/model catalog cleanup
- Low: additional regression depth and provider-extensibility polish after the core refactor is stable
