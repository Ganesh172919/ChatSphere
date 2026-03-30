# Hari - Backend Quality Support, Documentation, and Lightweight Reliability Work

## Overview
Hari should have a deliberately lighter workload than the other four teammates. The best fit is a backend quality-support track: documentation, smoke and regression coverage, logging consistency follow-ups, health-check polish, and smaller bug fixes that help the larger workstreams land safely.

This is still important work. The current backend has rich functionality but very little first-party automated coverage and not enough operator-facing guidance. Hari's job is to reduce release friction, improve clarity, and catch regressions without owning the heaviest architecture changes.

## Core Responsibilities
- Backend runbooks and implementation documentation
- Smoke tests and lightweight regression coverage
- Response-envelope and error-code consistency review
- Health-check and startup-behavior documentation/polish
- Minor backend bug fixes that unblock feature owners
- Release checklists and support validation across domains

## Detailed Tasks

### High Priority
1. Create backend smoke-test coverage for the most important flows.
   Work:
   - Add a lightweight smoke suite that verifies `/api/health`, auth login/refresh, one protected route, one room-message flow, and one AI route.
   - Keep the suite fast enough to run locally and in CI after the main owners finish their changes.
   - Coordinate test data and setup with the platform owner.
   Why this matters:
   - The backend currently lacks a reliable first-party safety net.
   Done when:
   - The smoke suite can detect obvious backend breakage quickly after every major merge.

2. Write operator-friendly backend runbooks.
   Work:
   - Create or expand markdown runbooks for local backend startup, migration deployment, rollback basics, auth failure triage, socket failure triage, and AI provider outage handling.
   - Keep the runbooks grounded in the actual files and commands used by this repository.
   Why this matters:
   - A backend is easier to maintain when common incidents already have a playbook.
   Done when:
   - New engineers can follow the runbooks without reverse engineering the repo.

3. Audit response-envelope and error-code consistency across routes.
   Work:
   - Review routes for mismatches in `success`, `data`, `message`, and `error` response shapes.
   - Fix only smaller inconsistencies directly.
   - Raise clear follow-up notes for the relevant owner when a fix belongs to a larger domain refactor.
   Why this matters:
   - Consistent backend contracts reduce frontend conditionals and make debugging easier.
   Done when:
   - Common routes follow the same response and error-shape conventions.

### Medium Priority
4. Improve health-check and readiness documentation and small implementation gaps.
   Work:
   - Document what `/api/health` currently guarantees and what it should guarantee after Ashish's readiness work lands.
   - Add any small missing metadata or route comments that make health behavior clearer without taking ownership of the larger platform refactor.
   Why this matters:
   - Health checks are often used constantly and understood poorly.
   Done when:
   - Health and readiness expectations are clear to developers and operators.

5. Add regression support tests for completed team workstreams.
   Work:
   - After Ganesh, Harsha, Jagadesh, and Ashish land their major changes, add focused regression tests around the riskiest happy-path flows.
   - Prioritize auth refresh, room send/edit/delete, AI quota error handling, and search authorization.
   Why this matters:
   - Hari can multiply the value of the other engineers' work by turning their fixes into durable regression coverage.
   Done when:
   - Each major workstream has at least one follow-up regression test.

### Low Priority
6. Handle minor backend consistency bugs and cleanup items.
   Work:
   - Fix small validation mismatches, route-message wording inconsistencies, or log-field naming issues that do not require domain-level redesign.
   - Keep these fixes scoped and avoid drifting into ownership of the other engineers' larger tracks.
   Why this matters:
   - Small paper cuts accumulate and make the backend feel less polished than it really is.
   Done when:
   - Minor inconsistencies are reduced without pulling Hari into major refactor work.

7. Maintain the backend documentation set as the team executes.
   Work:
   - Update backend docs and task notes as APIs, services, and operational behavior change.
   - Keep implementation notes synchronized with the real source of truth.
   Why this matters:
   - Documentation becomes stale fastest during active backend improvement work.
   Done when:
   - The docs remain useful after the other teammates finish their changes.

## File/Folder Ownership
Hari should be the primary owner of:

```text
docs/backend/
task-division/
backend/src/routes/health.routes.ts
backend/src/middleware/error.middleware.ts
backend/src/helpers/logger.ts
backend/src/helpers/errors.ts
backend/package.json
```

Hari should contribute secondary test and support changes across:

```text
backend/src/routes/
backend/src/services/
backend/src/socket/
```

## Dependencies
- Depends on Ganesh for final auth/session contract details before writing runbooks and auth smoke tests.
- Depends on Harsha for room/socket flows before locking collaboration smoke coverage.
- Depends on Jagadesh for AI endpoint behaviors and quota/error semantics before documenting them.
- Depends on Ashish for CI integration, health/readiness direction, and shared observability conventions.

## Deliverables
- Lightweight backend smoke suite
- Runbooks for startup, migrations, rollback basics, auth incidents, socket issues, and AI outage handling
- Smaller response/error consistency fixes
- Health/readiness documentation updates
- Follow-up regression tests for completed workstreams
- Ongoing backend documentation maintenance

## Priority Levels
- High: smoke tests, runbooks, response-envelope consistency audit
- Medium: health/readiness docs, follow-up regression coverage
- Low: minor backend cleanup and documentation maintenance after the main feature work lands
