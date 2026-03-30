# Ashish - Data Platform, Governance APIs, Observability, and Delivery Readiness

## Overview
Ashish should own the backend's platform and data-quality track. This includes the schema and migration layer, search correctness, analytics performance, moderation/admin surfaces, uploads hardening, observability foundations, and CI/CD readiness.

This scope is intentionally broad but still coherent: it covers the parts of the backend that make the product operable, measurable, governable, and safe to evolve. It is the right place to drive the cross-cutting improvements that the application needs before it can scale confidently.

## Core Responsibilities
- Prisma schema stewardship, index strategy, and safe migrations
- Search correctness and database-backed performance improvements
- Analytics, moderation, and admin domain hardening
- Upload security and storage abstraction
- Structured observability, metrics, readiness checks, and slow-query insight
- Backend delivery tooling, CI/CD readiness, and release safety

## Detailed Tasks

### High Priority
1. Fix search authorization and performance at the data-access layer.
   Work:
   - Update `search.service.ts` so explicit `roomId` filters are intersected with the caller's actual room membership instead of bypassing it.
   - Review search filters for blocked-user handling, pagination bounds, and query-cost ceilings.
   - Add tests for unauthorized room filters, blocked-user cases, and large search result sets.
   Why this matters:
   - Search is one of the clearest current correctness risks in the backend.
   Done when:
   - Search never returns data outside the caller's allowed scope.
   - Search behavior is covered by regression tests.

2. Establish an index and migration plan for core read paths.
   Work:
   - Review the Prisma schema against current query patterns for messages, conversations, search, reports, imports, and analytics.
   - Add safe composite indexes where they materially improve room timelines, admin screens, or query-heavy filters.
   - Document migration sequencing so schema changes can ship safely with active traffic.
   Why this matters:
   - As the product grows, data-access quality becomes a first-order backend concern.
   Done when:
   - Index additions are backed by real query paths.
   - Migration notes exist for each schema-level change.

3. Build the first real observability foundation for the backend.
   Work:
   - Standardize structured log fields across services: request ID, route, user ID when safe, room ID when relevant, latency, and error code.
   - Add metrics hooks for request latency, error rates, socket churn, AI usage, and admin/moderation workflows.
   - Separate liveness from readiness checks and improve `/api/health` so operators can tell whether the app is merely alive or actually ready.
   Why this matters:
   - The app has good request IDs and logs already, but it still lacks the broader observability needed for production operations.
   Done when:
   - The backend emits consistent logs and basic metrics.
   - Health and readiness semantics are explicit.

4. Make the backend CI/CD-ready instead of build-only.
   Work:
   - Add backend scripts for linting, testing, and smoke validation where missing.
   - Define a backend-focused pipeline sequence: install, generate Prisma client, type check, test, build, migration validation, Docker smoke check.
   - Ensure environment validation failures surface early in automated pipelines.
   Why this matters:
   - The current backend package scripts are minimal and there is no first-party test harness wired for CI.
   Done when:
   - The backend can be validated end-to-end in automation, not just built manually.

### Medium Priority
5. Refactor analytics away from application-memory heavy patterns.
   Work:
   - Review `analytics.service.ts`, which currently loads large result sets and aggregates in process for daily counts.
   - Replace this with more database-efficient aggregation or a precomputed/materialized pattern suitable for real growth.
   - Add bounds and timing instrumentation so analytics endpoints cannot quietly become expensive.
   Why this matters:
   - Analytics is exactly the kind of domain that often works in development and degrades badly later.
   Done when:
   - Analytics endpoints are more scalable and measurable.

6. Harden moderation and admin workflows.
   Work:
   - Review report lifecycle rules, admin list pagination, prompt-template governance, and moderation idempotency.
   - Add audit-friendly fields or logs where moderation state changes need traceability.
   - Ensure admin-only routes behave consistently with centralized auth and error contracts.
   Why this matters:
   - Governance features are often under-tested but become critical once the product has real users and abuse scenarios.
   Done when:
   - Report review and admin screens have predictable paging, filtering, and auditability.

7. Secure and future-proof uploads.
   Work:
   - Add MIME validation alongside extension checks.
   - Abstract storage so local disk remains the default but object storage can be added cleanly later.
   - Review whether the current public file-serving behavior matches product intent; if not, design signed or authorized access.
   Why this matters:
   - Uploads are both a security surface and an infrastructure scaling concern.
   Done when:
   - Upload validation is stronger.
   - Storage strategy is no longer tightly coupled to local disk.

### Low Priority
8. Create platform ADRs and operational guidance for long-term scalability.
   Work:
   - Capture decisions around schema/index changes, readiness semantics, observability conventions, storage abstraction, and CI sequencing.
   - Document microservices-readiness seams without prematurely splitting the application.
   Why this matters:
   - Good platform work is easier to preserve when decisions are written down, not rediscovered repeatedly.
   Done when:
   - Key platform decisions are traceable and reusable for future engineers.

## File/Folder Ownership
Ashish should be the primary owner of:

```text
backend/prisma/schema.prisma
backend/src/routes/search.routes.ts
backend/src/routes/analytics.routes.ts
backend/src/routes/moderation.routes.ts
backend/src/routes/admin.routes.ts
backend/src/routes/uploads.routes.ts
backend/src/routes/health.routes.ts
backend/src/services/search.service.ts
backend/src/services/analytics.service.ts
backend/src/services/moderation.service.ts
backend/src/services/admin.service.ts
backend/src/middleware/requestContext.middleware.ts
backend/src/middleware/error.middleware.ts
backend/src/middleware/rateLimit.middleware.ts
backend/src/middleware/upload.middleware.ts
backend/src/helpers/logger.ts
backend/src/helpers/errors.ts
backend/src/config/startup.ts
backend/src/config/prisma.ts
backend/src/app.ts
backend/src/server.ts
backend/Dockerfile
backend/docker-entrypoint.sh
backend/package.json
docker-compose.yml
```

## Dependencies
- Depends on Ganesh for auth-specific logging fields, secret conventions, and admin-access policy alignment.
- Depends on Harsha for message/room query patterns, Redis-readiness decisions, and socket metric names.
- Depends on Jagadesh for AI metrics, queue/cache seams, and schema needs coming from AI telemetry or async processing.
- Depends on Hari for operational runbooks, smoke scripts, and documentation of pipeline and incident workflows.

## Deliverables
- Safer, membership-aware search
- Better index coverage and migration discipline
- First real observability baseline with logs, metrics, and readiness checks
- Backend CI/CD validation path
- Scalable analytics endpoints
- Hardened admin, moderation, and upload surfaces

## Priority Levels
- High: search fix, schema/index review, observability foundation, CI/CD readiness
- Medium: analytics refactor, moderation/admin hardening, upload security and storage abstraction
- Low: platform ADRs and long-term scalability documentation once the operational baseline is in place
