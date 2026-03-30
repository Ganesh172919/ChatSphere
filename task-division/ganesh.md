# Ganesh - Identity, Access, and Session Security

## Overview
Ganesh should own the backend's identity and access boundary. This area touches every protected request, every socket handshake, every refresh cycle, and every user-facing account flow. It is a good principal-owner track because it combines architecture work, security hardening, API refinement, and cross-module coordination without overlapping heavily with the chat, AI, or platform domains.

The current backend already has a solid auth base with JWT access tokens, hashed refresh tokens, cookie-based refresh, Passport-based Google OAuth, and route protection. The biggest next step is to make the auth subsystem more production-ready, easier to operate, and safer to extend.

## Core Responsibilities
- Authentication routes and session lifecycle
- Token generation, refresh rotation, and revocation logic
- OAuth handoff and external identity integration
- Authorization helpers and admin access guardrails
- User profile and settings ownership for account-scoped concerns
- Auth audit events, security logging, and auth-focused test coverage

## Detailed Tasks

### High Priority
1. Harden refresh-session lifecycle and make sessions inspectable.
   Work:
   - Extend the refresh-token model to store `lastUsedAt`, `createdByIp`, `lastUsedIp`, `userAgent`, and `revokedReason`.
   - Add `GET /api/auth/sessions` and `DELETE /api/auth/sessions/:sessionId` so users can inspect and revoke active sessions.
   - Update `rotateRefreshToken` to refresh `lastUsedAt` and replace the old token record atomically.
   Why this matters:
   - The current refresh flow is secure enough for basic use, but it is difficult to audit or manage across devices.
   Done when:
   - Prisma migration is added.
   - Session-list and session-revoke endpoints work.
   - Token rotation updates usage metadata and revocation reason.

2. Replace the in-memory Google exchange-code handoff with an expiring durable store.
   Work:
   - Move the Google exchange-code store out of in-memory process state and into a database-backed or cache-backed temporary record.
   - Add TTL cleanup behavior and one-time-use enforcement.
   - Preserve the current frontend contract so the change is backend-only.
   Why this matters:
   - The current in-memory store is fragile across restarts and not ready for multi-instance deployment.
   Done when:
   - Exchange codes survive process restarts only through valid persistence.
   - Reuse attempts fail deterministically.
   - Expired codes are cleaned up automatically.

3. Harden password-reset and forgot-password flows for abuse resistance.
   Work:
   - Store password reset tokens hashed rather than plain.
   - Add reset-expiry enforcement, replay protection, and auth-rate-limit tuning for reset endpoints.
   - Use `email.service.ts` to centralize reset email composition and delivery paths, even if delivery is mocked in non-production.
   Why this matters:
   - Password recovery is one of the highest-risk auth flows and should behave like a first-class security feature.
   Done when:
   - Reset tokens are hashed and expire correctly.
   - Used or expired reset tokens cannot be replayed.
   - Endpoint behavior is covered by tests.

4. Standardize authorization helpers across HTTP and socket entry points.
   Work:
   - Introduce shared helpers for admin checks, authenticated-user extraction, and future role policies.
   - Remove scattered auth/role assumptions from route-level code where reusable policy checks make more sense.
   - Define a clear pattern for where authorization lives: middleware for identity, services for domain rules.
   Why this matters:
   - The backend is consistent today, but future growth will make ad hoc authorization harder to reason about.
   Done when:
   - Shared authorization helpers exist.
   - `admin.middleware.ts`, `auth.middleware.ts`, and auth-adjacent routes follow the same policy style.

### Medium Priority
5. Consolidate user-profile and account-settings ownership under a cleaner account domain contract.
   Work:
   - Refactor `users.routes.ts`, `user.service.ts`, `settings.routes.ts`, and `settings.service.ts` so account-scoped data behaves consistently.
   - Validate profile fields and settings merges in one place.
   - Add a safe contract for future preferences such as privacy, locale, or session alerts.
   Why this matters:
   - Account state currently works, but it is spread across adjacent files with slightly different validation and update behaviors.
   Done when:
   - Profile and settings updates follow consistent validation and error handling.
   - The service layer clearly owns merge logic and defaults.

6. Add auth audit logging and incident-grade traceability.
   Work:
   - Emit structured logs for login success/failure, logout, refresh failure, password reset request, password reset completion, and admin access denial.
   - Include request ID, user ID when known, auth provider, and safe failure code without logging secrets.
   - Coordinate with the platform owner so auth logs fit the broader observability format.
   Why this matters:
   - Security events are difficult to support or investigate without clear audit-grade logs.
   Done when:
   - Auth events appear in structured logs with stable fields.
   - Sensitive data never appears in auth logs.

### Low Priority
7. Prepare the auth subsystem for cleaner future externalization.
   Work:
   - Document and codify seams between token issuance, OAuth provider integration, email delivery, and session persistence.
   - Reduce direct coupling so this domain can later move toward an identity provider or dedicated auth service if the product grows that way.
   Why this matters:
   - This is a microservices-readiness improvement, not an immediate extraction project.
   Done when:
   - Service boundaries are clearer and extension points are documented in code comments or an ADR.

8. Build backend test coverage for the auth and account domain.
   Work:
   - Add tests for registration, login, refresh rotation, session revocation, Google exchange, password reset, profile update, and settings update.
   - Include both happy paths and abusive/invalid flows.
   Why this matters:
   - The backend currently has no meaningful first-party automated test coverage.
   Done when:
   - Core auth/account flows are covered by automated tests and can run in CI.

## File/Folder Ownership
Ganesh should be the primary owner of:

```text
backend/src/routes/auth.routes.ts
backend/src/routes/users.routes.ts
backend/src/routes/settings.routes.ts
backend/src/services/auth.service.ts
backend/src/services/token.service.ts
backend/src/services/user.service.ts
backend/src/services/settings.service.ts
backend/src/services/email.service.ts
backend/src/config/passport.ts
backend/src/middleware/auth.middleware.ts
backend/src/middleware/admin.middleware.ts
backend/src/types/auth.ts
backend/src/types/express.d.ts
backend/src/config/env.ts
backend/prisma/schema.prisma
```

## Dependencies
- Depends on Ashish for CI/CD wiring, secret-management conventions, and platform-level observability fields.
- Depends on Hari for smoke tests, auth runbooks, and regression documentation once the APIs stabilize.
- Coordinates with Jagadesh when user settings affect AI feature gates.
- Coordinates with Harsha for socket-auth handshake rules and shared authorization helpers.

## Deliverables
- Production-ready session-management flow with inspect/revoke endpoints
- Durable Google OAuth exchange implementation
- Hardened password-reset subsystem
- Cleaner account/profile/settings service boundaries
- Structured auth audit logging
- Automated tests for auth and account flows

## Priority Levels
- High: session lifecycle hardening, durable OAuth handoff, password-reset security, shared authorization helpers
- Medium: account-domain cleanup, auth audit logging
- Low: future externalization seams and architectural documentation, extra refactor polish after tests are stable
