# Authentication

## Why This Chapter Exists
Authentication is one of the first systems developers touch and one of the easiest to misunderstand.

At a surface level, it seems simple: users log in, receive a token, and make authenticated requests. In a production backend, though, authentication is really a chain of related concerns:

- proving identity
- issuing credentials
- refreshing expired access
- revoking sessions
- protecting routes
- supporting external login providers
- ensuring tokens are useful without becoming dangerous

ChatSphere implements authentication as a combination of:

- short-lived **access tokens**
- database-backed, cookie-delivered **refresh tokens**
- route middleware that protects private endpoints
- optional Google OAuth flows through Passport and an exchange-code handoff

If the database is the archive room, authentication is the building's badge system. The access token is a short-lived badge that lets you move through doors quickly. The refresh token is the secure session record in the building office that can issue a new badge when the old one expires.

## High-Level Authentication Strategy
ChatSphere does **not** rely on a single forever-valid JWT stored in local storage. Instead, it uses a layered model:

### Access token
- signed JWT
- short lifetime
- sent in the `Authorization: Bearer <token>` header
- used by the API and Socket.IO handshake

### Refresh token
- long-lived credential
- set in an HTTP-only cookie
- stored hashed in the database
- rotated when refresh occurs

This is a strong compromise between performance and control.

Why not use only sessions?
Pure server-side sessions would also work, but JWT access tokens make API and socket authentication lightweight and stateless for the hottest request path.

Why not use only access tokens?
Because long-lived bearer tokens are dangerous. If stolen, they act like reusable keys. The refresh-token design reduces that risk and allows server-side revocation.

## The Main Authentication Entry Points
The primary route file is [auth.routes.ts](../../backend/src/routes/auth.routes.ts).

The backend exposes flows for:

- registration
- login
- refresh
- logout
- current-user hydration (`/me`)
- forgot password
- reset password
- Google OAuth redirect flow
- Google callback flow
- Google exchange-code flow for frontend handoff

This is a healthy sign in the architecture. Auth is not a single controller action. It is an entire subsystem with explicit lifecycle routes.

## Request Lifecycle: Register
Registration is a good first example because it shows how validation, service logic, token issuance, and persistence work together.

### Step 1. The client submits registration data
The request usually includes email, password, and profile fields such as display name.

### Step 2. The route validates input
Validation ensures the payload has the expected shape before the service layer runs. This prevents service code from being polluted with low-level input parsing concerns.

### Step 3. The auth service creates the user
`auth.service.ts` handles the real work:

- verify the user does not already exist
- hash the password
- create the user record
- issue an access token
- issue a refresh token
- hash and store the refresh token in the `RefreshToken` table

### Step 4. The refresh token is set as a cookie
The route uses a helper to set the refresh token cookie with:

- `httpOnly: true`
- `sameSite: "lax"`
- `secure: env.secureCookies`
- a multi-day expiration

### Step 5. The access token and public user data are returned
The response includes the access token and a safe user payload for frontend hydration.

This split is important:

- the access token is readable by the frontend because it must be attached to API and socket requests
- the refresh token is intentionally not readable by frontend JavaScript

## Request Lifecycle: Login
Login is similar to registration, but the service first verifies credentials against the stored password hash.

At a conceptual level, login has three responsibilities:

1. prove identity
2. create a new authenticated session
3. return enough information for the frontend to continue immediately

The login flow in ChatSphere does all three.

### Why login writes to the database
Some developers assume JWT authentication means "no database session state." That is only partly true.

ChatSphere still writes refresh-token session state to the database because it needs:

- revocation
- rotation
- expiration cleanup
- visibility into active refresh credentials

This is one of the most important distinctions for junior developers to learn:

**stateless access tokens can still coexist with stateful refresh-session management**

## Access Token Design
The access token is generated in [token.service.ts](../../backend/src/services/token.service.ts).

The token includes identity claims needed by the application to recognize the user. Because it is signed, the server can verify it without consulting the database on every request.

That makes the hot path efficient:

1. request arrives with bearer token
2. middleware verifies signature and expiry
3. request proceeds with `req.user` populated

This is much faster than looking up session state in the database for every protected request.

### Tradeoff
The tradeoff is that access tokens remain valid until they expire, even if the backend would prefer to revoke them instantly. That is why they should be relatively short-lived and why refresh control matters so much.

## Refresh Token Design
The refresh-token design is the more security-sensitive part of the system.

### Why refresh tokens are hashed in the database
The project stores a hash of the refresh token rather than the raw token. This is similar to password storage philosophy.

If an attacker steals a database backup, raw refresh tokens would behave like active credentials. Hashed refresh tokens reduce that risk.

### Why refresh is cookie-based
The refresh token is sent via cookie because:

- it avoids exposing the token to normal frontend JavaScript
- browsers automatically include it with the refresh request when credentials are enabled
- the backend can manage rotation without asking the frontend to persist secrets

This design works especially well with the frontend's centralized API client, which sends `credentials: "include"` on all requests.

### Refresh flow in practice
When the access token expires:

1. The frontend receives a `401`.
2. The API client calls `/api/auth/refresh`.
3. The backend reads the refresh-token cookie.
4. The auth service verifies the token, checks the hashed session record, rotates it, and issues a new access token.
5. The route sets a new refresh cookie.
6. The frontend retries the original request once.

This is one of the most important end-to-end flows in the whole stack because it keeps sessions smooth without forcing constant re-login.

## Logout
Logout is more than deleting frontend state.

In ChatSphere, logout also needs to invalidate the refresh session on the backend side. Otherwise, a stale cookie could potentially continue refreshing access.

The logout service therefore:

- locates the refresh session
- revokes or removes it
- clears the refresh cookie
- returns a safe confirmation response

This matters because true logout is a **server-side state transition**, not just a client-side UI event.

## Route Protection With Middleware
The main protection middleware is [auth.middleware.ts](../../backend/src/middleware/auth.middleware.ts).

Its job is straightforward but critical:

1. read the `Authorization` header
2. ensure it uses the `Bearer` format
3. verify the JWT
4. attach the authenticated user identity to the request object
5. reject unauthorized requests with a structured error if verification fails

That lets route handlers stay focused on business behavior rather than repeating token parsing logic.

In other words, middleware is the badge scanner at the secure door. If a request reaches a protected route, the badge check has already happened.

## Current-User Hydration With `/me`
The `/api/auth/me` endpoint is easy to overlook, but it is one of the most important practical routes in modern frontend-backend systems.

Why?

Because after refresh or page reload, the frontend often needs an authoritative answer to:

"Who is the currently authenticated user according to the backend right now?"

The backend answers that with `/me`, typically returning:

- user ID
- email
- display name
- avatar
- provider
- settings

This route is what turns token possession into hydrated application state.

## Forgot Password and Reset Password
Password reset is a separate authentication lifecycle from login.

Its purpose is not just convenience. It is also part of account recovery and support operations.

In ChatSphere, the auth service exposes methods to:

- request a password reset
- validate a reset token or reset flow
- update the password

Even if the exact mail delivery or token transport changes later, the architecture already separates this flow from ordinary login logic. That is good design because password reset has different abuse risks, user experience requirements, and expiry semantics.

### Why rate limiting matters here
Auth endpoints are especially sensitive to abuse. The backend includes dedicated auth rate limiting, which is important for endpoints like login and forgot password where brute force and enumeration risks are higher.

## Google OAuth Flow
ChatSphere supports Google login through Passport configuration in [passport.ts](../../backend/src/config/passport.ts) plus auth-service helpers.

This is useful because OAuth login changes who proves identity:

- in password login, the backend verifies credentials directly
- in OAuth login, Google proves identity and the backend accepts that trusted claim

### The broad flow
1. User clicks Google login in the frontend.
2. Backend redirects to Google's consent screen.
3. Google redirects back to the backend callback route.
4. The backend finds or creates the corresponding user.
5. The backend creates a short-lived exchange code.
6. The frontend completes the flow using a controlled exchange endpoint.

### Why use an exchange code
The exchange-code step gives the frontend a safer and more structured handoff point. Instead of placing all session details directly into a redirect URL, the backend can issue a temporary code, then the frontend exchanges it for the normal authenticated session response.

That is cleaner, easier to reason about, and often better for frontend application state management.

## Socket Authentication
Authentication does not stop at HTTP routes. Real-time features also need identity checks.

ChatSphere handles socket authentication in [socketAuth.middleware.ts](../../backend/src/middleware/socketAuth.middleware.ts). The client supplies the access token in the socket handshake `auth` payload.

This is important because socket connections can emit privileged room events:

- join room
- send message
- mark read
- trigger AI
- edit or delete content

Without socket authentication, realtime would become a side door around the main API security model.

### Why the same access token works well here
Using the same access token for both REST requests and socket connection setup keeps the client model simple. The frontend already knows how to refresh and attach the token, so the socket layer can reuse that mechanism.

## Error Handling in Authentication
Authentication failures must be precise without leaking sensitive information.

The backend uses structured `AppError` responses and middleware-based error formatting so auth errors can return consistent shapes like:

- `UNAUTHORIZED`
- `CONFLICT`
- validation-related errors

That consistency matters for the frontend because it needs deterministic behavior:

- redirect to login when refresh fails
- show friendly auth error toasts
- retry only when the failure is refreshable

## Pseudo-Code: Refresh Logic
This simplified example captures the intent of the refresh flow:

```ts
async function refreshSession(refreshTokenFromCookie: string) {
  const payload = verifyRefreshToken(refreshTokenFromCookie);
  const hashed = hash(refreshTokenFromCookie);

  const session = await prisma.refreshToken.findFirst({
    where: {
      userId: payload.userId,
      tokenHash: hashed,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!session) {
    throw new AppError("Refresh token is invalid", 401, "UNAUTHORIZED");
  }

  const nextAccessToken = generateAccessToken(payload.userId);
  const nextRefreshToken = generateRefreshToken(payload.userId);

  await rotateStoredRefreshToken(session.id, hash(nextRefreshToken));

  return { nextAccessToken, nextRefreshToken };
}
```

The important lesson is that refresh is both cryptographic and stateful:

- the token signature must verify
- the server-side session record must also still be valid

## Security Properties of This Design
Several strong choices are visible in the current implementation.

### Good choices
- refresh tokens are not stored in frontend storage
- refresh tokens are hashed in the database
- access and refresh responsibilities are separated
- auth-specific rate limiting exists
- secure cookie settings are environment-aware
- socket authentication uses the same user identity model as HTTP

### Remaining realities
No auth system is perfect. The current design still depends on careful frontend handling, strong secret management, and short-lived access tokens. OAuth flows also add operational complexity and more environment configuration.

That is normal. Production authentication is never "finished"; it is continuously maintained.

## Alternatives the Team Could Have Chosen

### Session-only authentication
Using opaque server-side sessions would simplify revocation logic and centralize control, but it would make horizontally scaled API and socket authentication less elegant unless a shared session store were introduced.

### Access-token-only JWT authentication
This would reduce database session storage, but it would make revocation and long-lived authentication much weaker.

### Third-party auth platform
A dedicated identity provider could handle many of these flows, but it would reduce direct control and add external dependency costs and constraints.

For a product like ChatSphere, the current in-house hybrid design is a practical middle path.

## How to Extend This Authentication System Safely
If a future engineer needs to add new auth features, these are good rules to follow:

1. Put input parsing and HTTP concerns in routes and middleware.
2. Put identity and session rules in `auth.service.ts`.
3. Put signing and verification details in `token.service.ts`.
4. Keep refresh-token storage revocable and server-controlled.
5. Reuse structured errors so frontend behavior stays consistent.

Examples of safe future additions include:

- email verification flows
- multi-factor authentication
- session management pages
- device-level session tracking

## Key Takeaways
ChatSphere authentication is built around a clear principle:

**fast bearer-token access for normal requests, server-controlled refresh sessions for durable login**

That principle gives the project a strong balance of usability and control:

- requests stay lightweight
- sessions can be refreshed smoothly
- logout and revocation remain meaningful
- OAuth can plug into the same user model

For anyone learning backend engineering, this chapter is worth revisiting often. Authentication is where application security, user experience, infrastructure, and frontend integration all meet in one place.
