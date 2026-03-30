# Security Best Practices

## Why This Chapter Exists
Security is not a single feature in a backend. It is the combined effect of dozens of design choices:

- how requests are authenticated
- how authorization is enforced
- how secrets are stored
- how uploads are handled
- how errors are exposed
- how logs are written
- how rate limits are applied
- how data boundaries are respected

ChatSphere already contains several strong security patterns, but it also has areas where future hardening would be wise. Good documentation should describe both.

This chapter is intentionally practical. Its goal is not to recite generic security theory. Its goal is to explain how this backend protects itself today, where the important trust boundaries are, and what engineers should be careful not to break when extending the system.

Think of security like the rules of a secure building. Locks, badges, cameras, visitor logs, and emergency procedures all matter. A building with strong front doors but open side windows is not truly secure. Backend systems work the same way.

## Security Principle: Trust Boundaries First
The most useful way to read backend security is to ask:

"What should the client be allowed to decide, and what must only the server decide?"

In ChatSphere, the server should be the source of truth for:

- who the user is
- whether they belong to a room
- whether they may edit or delete a message
- whether a refresh token is still valid
- whether an AI feature is enabled
- what files are acceptable to upload

Whenever those decisions drift toward the client, security weakens.

## Authentication Security
Authentication is covered in detail in [06-authentication.md](./06-authentication.md), but from a security perspective several design choices stand out.

### Strong current choices
- access tokens and refresh tokens are separated
- refresh tokens are stored in HTTP-only cookies
- refresh tokens are hashed before being stored in the database
- secure-cookie behavior is environment-aware
- auth endpoints are rate-limited

These are meaningful security decisions, not cosmetic ones.

### Why hashed refresh tokens matter
If raw refresh tokens were stored in the database, a database leak could instantly become an account takeover event. Hashing them creates a safer failure mode, similar to password hashing philosophy.

### Why HTTP-only cookies matter
Refresh tokens should not be casually readable by frontend JavaScript. Keeping them in HTTP-only cookies reduces exposure to client-side token theft.

## Authorization Security
Authentication answers "who are you?" Authorization answers "what are you allowed to do?"

The service layer is where most of ChatSphere's authorization decisions live.

Examples include:

- room membership checks before sending messages
- role checks before room management actions
- ownership checks before editing or deleting content
- user-scoped queries for conversations, projects, and memories

This is good design because authorization belongs close to business rules, not scattered across frontend assumptions.

### Why user scoping matters so much
A huge percentage of backend vulnerabilities come from missing ownership filters.

For example:

- loading a conversation by ID without also filtering by `userId`
- allowing message edits without verifying sender ownership
- exposing room data without checking membership

The current service design generally respects these boundaries, which is one of the backend's strongest qualities.

## Input Validation as a Security Tool
Validation is often discussed as a correctness concern, but it is also a security boundary.

When the backend validates input early, it reduces risks like:

- unexpected control flow
- malformed payload exploitation
- downstream service assumptions breaking
- oversized or abusive payloads causing instability

ChatSphere uses schema validation and middleware-driven normalization of body, params, and query inputs. That improves consistency and narrows the space of surprising request shapes the rest of the system must handle.

## Rate Limiting as Abuse Protection
Rate limiting is one of the most direct protective measures in the backend.

Current limiters cover:

- auth endpoints
- AI endpoints
- general API traffic
- socket flood behavior

This matters because abuse rarely looks identical across all routes. Login brute force, AI quota abuse, and generic API flooding are different problems and need different controls.

### Socket flood protection
Realtime systems are especially vulnerable to event spam because a single open connection can emit many actions quickly. The in-memory socket flood limiter is a good first line of defense.

### Current limitation
The socket flood limiter is process-local. That is acceptable for a single backend instance, but distributed deployments will need shared enforcement if abuse protection must remain consistent across nodes.

## Secure Error Exposure
The backend does a good job of avoiding raw, uncontrolled error leaks.

Important practices include:

- standardized error envelopes
- stack traces hidden in production
- request IDs for support and debugging
- database errors translated into client-safe application errors

This matters because security is not only about blocking attacks. It is also about avoiding unnecessary disclosure of internal implementation details.

## Sensitive Data Handling in Logs
One of the strongest operational security choices in the backend is log redaction.

The logger masks fields associated with:

- passwords
- tokens
- secrets
- authorization headers
- cookies
- API keys

This is critical because logs often travel through dashboards, storage systems, incident channels, and team workflows. A secret leaked to logs is still a secret leak.

## Upload Security
Uploads are a common source of backend risk because they cross several trust boundaries:

- the client chooses the file
- the backend stores it
- other users may later download it

ChatSphere already applies useful controls in [upload.middleware.ts](../../backend/src/middleware/upload.middleware.ts):

- file size limit
- extension allow-list
- filename normalization with `path.basename`

These are all good steps.

### Important caveat
The upload retrieval route serves files publicly by filename. That may be acceptable for the current product if uploaded files are intended to be broadly accessible and filenames are not guessable in practice, but it is a security decision worth documenting clearly.

If uploads are meant to be user-private or room-private, a future hardened design should add authorization checks or signed access URLs.

## CORS and Cookie Security
Because the frontend and backend communicate across configured origins, CORS and cookie settings matter a lot.

Important environment-driven controls include:

- `CLIENT_URL`
- `SERVER_URL`
- `CORS_CREDENTIALS`
- `SECURE_COOKIES`

These settings directly affect whether:

- refresh cookies are sent properly
- browsers allow authenticated cross-origin requests
- production traffic remains protected by HTTPS-only cookie behavior

This is a good example of security depending on both code and deployment configuration. Even a strong auth design can be weakened by sloppy origin or cookie settings.

## Realtime Security
Socket.IO introduces special security considerations because connections stay alive and users can emit privileged actions continuously.

### Good current protections
- socket handshake authentication exists
- room join operations verify membership
- room AI trigger operations verify membership
- socket flood limits reduce spam risk

### Important caveat: typing events
The current typing event flow broadcasts `typing_start` and `typing_stop` without the same membership verification used in some other room events. That is a smaller issue than unauthorized message sending, but it still represents an authorization gap worth fixing.

Security documentation should preserve details like this because small realtime gaps are easy to forget and hard to rediscover later.

## Data Ownership and Query Security
One of the most important backend habits is to always join identity to data access.

In practice, that means asking questions like:

- is this room query filtered by the authenticated user's membership?
- is this conversation fetched by both `id` and `userId`?
- is this project update scoped to the project owner?
- is this memory mutation restricted to the correct user?

This pattern appears throughout the backend and is one of its strongest security foundations.

### Important caveat: search filtering
The current search implementation includes a documented caveat around `roomId` filtering behavior. When a specific `roomId` filter is supplied, the logic does not fully intersect that filter with membership-derived room access the way a stricter design ideally would.

That does not automatically mean a critical exploitable bug in every deployment context, but it is a real authorization-risk area and should be treated as a future hardening priority.

## Content Integrity and Sanitization
User-generated content is central to ChatSphere:

- messages
- room content
- AI prompts
- project notes
- memory summaries

The backend should treat all of it as untrusted input.

Important backend responsibilities include:

- validating structure
- avoiding dangerous HTML assumptions
- storing text safely
- returning content in predictable formats

The frontend also plays a role here, especially when rendering user text, but the backend should never assume content is inherently safe just because it came from an authenticated user.

## Message Editing and Deletion Security
Editing and deletion features are not just UX conveniences. They are permissioned state transitions.

Current service logic includes:

- time-bounded message edits through `MESSAGE_EDIT_WINDOW_MINUTES`
- ownership-focused update and delete rules
- soft delete behavior rather than immediate hard deletion

These choices are helpful because they make destructive actions more controlled and more reviewable.

### Important caveat: reply target integrity
The current reply validation checks that the reply target exists and certain block conditions are respected, but it does not fully verify that the reply target belongs to the same room. That is another good example of a subtle but meaningful integrity gap to prioritize in future hardening work.

## Password and Secret Hygiene
A secure codebase must be paired with secure operational habits.

For this backend, important expectations include:

- never commit secrets to source control
- rotate token secrets when necessary
- use distinct secrets by environment
- protect OAuth credentials
- protect AI provider keys

The typed environment configuration supports this, but it does not enforce good secret-management processes by itself. Teams still need disciplined handling outside the codebase.

## Database Security
Database security is broader than schema design.

Important practices include:

- using least-privilege database credentials
- protecting backups
- applying migrations deliberately
- monitoring access
- hashing sensitive session artifacts like refresh tokens

The current backend already benefits from Prisma, which reduces direct SQL-string handling and therefore lowers some injection risk surfaces. But safe ORM use is not an excuse to stop thinking about authorization or query scope.

## Defense in Depth
One of the best ways to describe the current backend is that it uses **defense in depth**:

- middleware validates and authenticates
- services enforce ownership and domain rules
- the database enforces constraints
- logs and request IDs improve incident response
- rate limiting reduces abuse

That layering matters because no single defense is perfect. Good security comes from overlapping controls.

## Practical Security Checklist for New Engineers
When adding a new backend feature, ask:

1. Who is allowed to call this?
2. What ownership or membership checks are required?
3. Is the input validated before service logic runs?
4. Could the result expose data across users or rooms?
5. Are errors safe and structured?
6. Could this route or event be abused at high volume?
7. Are any secrets or sensitive fields at risk of being logged?
8. Does this feature behave safely over both HTTP and sockets?

If you cannot answer those questions clearly, the feature is probably not ready yet.

## Key Takeaways
ChatSphere already demonstrates many strong backend security practices:

- layered authentication
- revocable refresh sessions
- service-level authorization
- input validation
- structured, safe error handling
- rate limiting
- log redaction

At the same time, the documentation should preserve current hardening opportunities honestly:

- typing events need stronger membership enforcement
- room-scoped search filtering should be tightened
- reply target validation should confirm same-room integrity
- upload access policy may need stricter authorization depending on product intent

That combination of strengths and candid gaps is what good security documentation should provide. It helps the next engineer protect what already works and improve what still needs attention.
