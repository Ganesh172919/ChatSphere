# Error Handling and Logging

## Why This Chapter Exists
Backend systems do not become production-ready when they stop failing. They become production-ready when they fail **predictably**, **observably**, and **recoverably**.

That is what error handling and logging are for.

If a request breaks and nobody can tell:

- what happened
- where it happened
- whether the user should retry
- whether data is still consistent

then the system is hard to trust, even if the underlying code is mostly correct.

ChatSphere takes a structured approach:

- errors are normalized through middleware
- request-level context is attached early
- logs are emitted in structured JSON
- sensitive values are redacted
- known validation and database failures are mapped to stable API responses

Think of this chapter as the backend's incident-response guide. It explains how the application turns unexpected situations into behavior that developers and clients can work with.

## The Philosophy Behind Error Handling
Good error handling answers three different audiences at once:

### The client needs a safe, actionable response
The frontend should know whether to:

- show a validation message
- redirect to login
- retry later
- present a generic failure state

### The developer needs debugging context
The engineer needs details such as:

- request ID
- route
- stack trace in non-production environments
- known error code classification

### The system needs stability
The backend must avoid cascading damage. A single route failure should not corrupt the entire process or return malformed responses.

That is why ChatSphere uses middleware and structured helpers instead of ad hoc `try/catch` behavior everywhere.

## Request Context: The Foundation of Observability
The first important piece is [requestContext.middleware.ts](../../backend/src/middleware/requestContext.middleware.ts).

This middleware runs early and attaches request-scoped metadata, including a request ID. If the incoming request already includes `x-request-id`, the backend uses it. Otherwise it generates a UUID.

Why does this matter?

Because when something goes wrong, the request ID becomes the tracking number for the entire interaction. It lets engineers connect:

- client-reported failure
- server logs
- database timing
- proxy or platform logs

Without a request ID, debugging distributed systems becomes much more guesswork-heavy.

### Start and completion logs
The middleware also logs the beginning and completion of requests, including duration. That turns every request into an observable event rather than a silent black box.

## The `AppError` Pattern
Custom application errors live in [errors.ts](../../backend/src/helpers/errors.ts).

The idea is simple but powerful:

- not every failure is an unstructured exception
- many failures are expected domain errors
- expected domain errors should carry stable metadata

An `AppError` includes:

- human-readable message
- HTTP status
- stable error code
- optional details

This matters because it lets the backend distinguish between:

- "the client sent an invalid request"
- "the resource does not exist"
- "the user is unauthorized"
- "the system hit an unexpected internal problem"

That distinction is essential for both frontend behavior and operator understanding.

## Centralized Error Middleware
The primary formatter is [error.middleware.ts](../../backend/src/middleware/error.middleware.ts).

Centralizing error handling is one of the most important architecture decisions in the backend.

Instead of every route deciding its own failure shape, the middleware catches thrown errors and produces a consistent envelope. This keeps API behavior stable across modules.

### What it handles
The middleware knows how to interpret:

- `AppError`
- `ZodError`
- Prisma known request errors
- generic unknown errors

### Prisma-specific mapping
Some database errors are common enough to deserve explicit translation.

For example:

- `P2002` becomes a conflict-style response
- `P2025` becomes a not-found-style response

That is a strong choice because raw ORM/database errors are not good client contracts. The client should not need to know Prisma error codes to behave correctly.

### Environment-aware stack traces
The middleware includes stack traces outside production, but not in production. This is a classic and appropriate balance:

- developers get visibility while building and debugging
- production users do not receive internal stack details

## Response Envelope Design
The backend uses a consistent response style shaped around:

- `success`
- `data` on success
- `error` on failure

With failure payloads, the backend can include:

- `error.code`
- `error.message`
- `error.requestId`
- optional `error.details`
- optional `error.retryAfterMs`

This is a very practical contract because it supports better client behavior.

Examples:

- `UNAUTHORIZED` can trigger login handling
- `AI_RATE_LIMITED` can trigger countdown UI
- `NOT_FOUND` can show a missing-resource state
- validation details can map to form errors

The more consistent the error envelope is, the less special-case frontend code the team needs.

## Validation Errors
Validation is one of the healthiest places for a backend to fail.

Why? Because it means the system rejected bad input before performing dangerous work.

ChatSphere uses schema validation and a validation middleware that normalizes request body, params, and query values. When Zod validation fails, the error middleware converts that failure into a stable response shape.

This is good backend hygiene because it keeps invalid inputs from traveling deeper into services where failures become harder to reason about.

## Authentication and Authorization Errors
Authentication errors usually surface as `401` responses, while authorization or forbidden behavior may surface differently depending on the domain rule.

Important auth-related failure points include:

- missing bearer token
- invalid access token
- expired access token
- invalid refresh token
- revoked refresh session
- unauthorized room access

The important design point is that these failures become predictable codes and messages, not random thrown strings.

That is what allows the frontend to implement meaningful flows such as:

- silent refresh on `401`
- logout and redirect when refresh fails
- toasts for room permission failures

## Rate Limiting Errors
Rate limiting is handled in [rateLimit.middleware.ts](../../backend/src/middleware/rateLimit.middleware.ts).

This file defines separate limiters for:

- authentication endpoints
- AI endpoints
- general API traffic

### Why separate rate limits matter
Not all endpoints have equal risk.

Auth endpoints are attractive brute-force targets.
AI endpoints are costly and should guard both abuse and quota burn.
General APIs need platform protection but not necessarily the same thresholds.

### AI-specific failure shape
The AI limiter returns an error code such as `AI_RATE_LIMITED` and includes `retryAfterMs`.

That is excellent contract design because it transforms rate limiting from a vague block into a usable piece of user experience. The frontend can show a countdown instead of a generic failure.

## Logging Strategy
ChatSphere uses a structured logger in [logger.ts](../../backend/src/helpers/logger.ts).

The logger emits JSON-shaped logs instead of loose console strings. This is an important production habit because structured logs are much easier to:

- search
- aggregate
- filter by field
- connect to monitoring tools

For example, it is much more useful to search for:

- `requestId=...`
- `level=error`
- `route=/api/chat`

than to parse arbitrary prose logs.

## Sensitive Data Redaction
One of the strongest details in the logger implementation is key-based redaction.

The logger redacts fields whose names imply sensitive content, including patterns related to:

- password
- token
- secret
- authorization
- cookie
- API key

This matters a lot. Logs are often copied into dashboards, shared across infrastructure, and read by multiple humans. Logging secrets is one of the easiest ways to turn a manageable bug into a real security incident.

A useful rule to remember:

**logs should explain failures, not leak credentials**

## Request Flow Example: Validation Failure
Consider a malformed request to `POST /api/chat`.

### Step 1. Request arrives
The request gets a request ID from request-context middleware.

### Step 2. Validation runs
The payload fails schema validation because a required field is missing or incorrectly typed.

### Step 3. An error is thrown
Zod raises a validation error.

### Step 4. Error middleware formats the response
The client receives a structured failure response with a stable shape.

### Step 5. The request is logged
The request completion log includes duration and the request can be correlated by request ID.

Notice what did **not** happen:

- no service logic ran
- no database writes occurred
- no malformed partial response leaked out

This is what a healthy rejection path looks like.

## Request Flow Example: Database Conflict
Suppose a user tries to create a resource that violates a unique constraint.

### Step 1. Service reaches Prisma write
The application attempts to insert a record.

### Step 2. Prisma throws a known request error
For example, duplicate key behavior maps to `P2002`.

### Step 3. Error middleware translates the failure
Instead of a raw ORM error, the client receives a conflict-oriented error envelope.

### Step 4. Frontend can react meaningfully
The UI can show "already exists" rather than "internal server error."

This is a great example of why translation layers matter. Databases speak in database terms. Clients need product terms.

## Socket Errors
Error handling is also relevant in realtime flows.

Socket events can fail for reasons such as:

- invalid authentication
- non-membership in a room
- rate-limit violations
- malformed event payloads
- attempts to edit or delete disallowed content

The backend emits `socket_error` events for client-visible realtime failure handling. This is the socket equivalent of the structured HTTP error envelope.

That symmetry matters. A backend with both REST and realtime behavior should still feel like one system, not two unrelated applications.

## Process-Level Failure Handling
The runtime entry point in [server.ts](../../backend/src/server.ts) also addresses process-level failures:

- `SIGINT`
- `SIGTERM`
- `unhandledRejection`
- `uncaughtException`

This is important because not every failure happens inside a request lifecycle. Some failures happen at process scope, and a production backend needs a plan for those too.

Graceful shutdown logic helps the server stop accepting work cleanly and close resources instead of crashing mid-operation.

## Practical Tradeoffs
Good error handling always involves balance.

### More detail vs less exposure
Developers want rich debugging data.
Security wants minimal leakage.
The current design balances this with request IDs, internal logs, and environment-aware stack visibility.

### Centralization vs special handling
Centralized middleware is excellent for consistency, but some features still require local domain-specific failure handling before errors reach the global formatter. That is normal.

### Structured logs vs simplicity
JSON logs are more useful operationally, but they require better tooling and discipline than casual `console.log` usage.

## Pseudo-Code Example: Consistent Error Translation

```ts
try {
  const result = await service.run(input);
  res.json({ success: true, data: result });
} catch (error) {
  next(error);
}
```

```ts
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        requestId: req.requestId,
        details: err.details,
      },
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        requestId: req.requestId,
        details: err.flatten(),
      },
    });
  }

  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong",
      requestId: req.requestId,
    },
  });
}
```

This pattern is one of the quiet strengths of the backend. It makes the failure path readable, consistent, and extensible.

## How to Extend This System Safely
If you add new features, keep these rules in mind:

1. Throw `AppError` for expected domain failures.
2. Let validation failures happen before service logic.
3. Preserve `requestId` in responses and logs.
4. Never log tokens, passwords, or cookies directly.
5. Prefer stable error codes over fragile string matching.
6. Include retry metadata when the client can use it.

These practices help the backend stay understandable even as it grows more complex.

## Key Takeaways
ChatSphere's error-handling and logging strategy is designed to make failure understandable rather than mysterious.

The most important ideas are:

- every request gets traceable context
- expected failures are modeled explicitly
- unexpected failures are normalized safely
- logs are structured and redacted
- clients receive stable contracts they can act on

That combination is what turns a backend from "it usually works" into "it can be operated confidently in the real world."
