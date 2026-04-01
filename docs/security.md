# Security Model

An overview of ChatSphere's security architecture and best practices.

## Authentication

### Dual Strategy
ChatSphere supports two authentication methods, both converging into JWT:

| Strategy | Flow |
|----------|------|
| **Local (Email/Password)** | Register → bcrypt hash → store → login → verify → issue JWT |
| **Google OAuth2** | Redirect to Google → consent → callback → find/create user → issue JWT |

### JWT Token Architecture

```
┌─────────────────┐     ┌──────────────────┐
│  Access Token   │     │  Refresh Token   │
│  (Short-lived)  │     │  (Long-lived)    │
│  In Auth Header │     │  In Request Body │
└────────┬────────┘     └────────┬─────────┘
         │                       │
         ▼                       ▼
   API + Socket.IO         POST /api/auth/refresh
   Authorization           → New Access Token
                           → New Refresh Token (rotation)
```

- **Access Token**: Attached to every API request via `Authorization: Bearer <token>` and Socket.IO handshake auth
- **Refresh Token**: Used to obtain new access tokens without re-login; stored in MongoDB with TTL auto-expiry
- **Token Rotation**: Each refresh generates a new refresh token and invalidates the old one, limiting the window of token theft

### Password Security
- **Algorithm**: bcrypt
- **Salt Rounds**: 12 (strong resistance against brute-force)
- **Storage**: Only the hash is stored (`passwordHash` field); passwords are never stored in plaintext
- **Pre-save hook**: Mongoose middleware auto-hashes on modification

---

## Authorization

### Platform-Level
- **Admin Flag**: `User.isAdmin` boolean determines platform admin access
- **Admin Middleware**: `/api/admin` routes use dual middleware: `authMiddleware` (JWT) → `adminCheck` (verifies `isAdmin: true`)

### Room-Level
Hierarchical role system within rooms:

| Role | Permissions |
|------|------------|
| **Creator** | All actions: delete room, assign any role, kick any member |
| **Admin** | Assign moderator/member roles, kick non-admins |
| **Moderator** | Kick members (not admins) |
| **Member** | Send messages, react, vote on polls |

Role changes are validated server-side:
- Only creators can assign admin role
- Moderators cannot kick admins
- The creator's role cannot be changed

---

## Input Validation

### Request Body Validation
- String length limits enforced on all user inputs (username: 3–30, bio: 200, room name: 50, poll question: 500, etc.)
- Enum validation for fields like `authProvider`, `onlineStatus`, `targetType`, `reason`, `status`
- Type checking for booleans, numbers, and arrays
- Hex color validation with regex: `/^#[0-9a-fA-F]{6}$/`

### Content Limits
- Request body limit: `5mb` (set via `express.json({ limit: '5mb' })`)
- Avatar size limit: ~375KB (base64)
- AI history trimmed to 42 entries per room to prevent unbounded growth
- Search results capped at configurable page sizes (default 20, max 50)

### Self-Action Prevention
- Users cannot report themselves
- Users cannot block themselves
- Duplicate pending reports on the same target are rejected (409 Conflict)

---

## Socket.IO Security

- **Connection Auth**: Every Socket.IO connection is validated via `socketAuth.js` middleware before any events are processed
- **Token in Handshake**: JWT is passed in the Socket.IO `auth` object during the handshake
- **Per-Event Validation**: Room existence is verified before joining; message content is checked for emptiness
- **Automatic Cleanup**: On disconnect, user is removed from all rooms and typing states are cleared

---

## Data Protection

- **Sensitive Field Removal**: `User.toSafeObject()` strips `passwordHash`, `googleId`, and other sensitive fields from API responses
- **TTL Indexes**: Refresh tokens automatically expire and are deleted by MongoDB TTL index
- **CORS**: Backend only accepts requests from the configured `CLIENT_URL`

---

## Recommendations for Production

> [!IMPORTANT]
> The following are recommended security enhancements for production deployments:

### Rate Limiting
Add rate limiting middleware (e.g., `express-rate-limit`) to prevent:
- Brute-force login attempts
- API abuse
- AI endpoint overuse (Gemini API costs)

```js
// Example: Apply to auth routes
const rateLimit = require('express-rate-limit');
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
app.use('/api/auth/login', authLimiter);
```

### HTTPS
- Always use HTTPS in production (most PaaS providers handle this automatically)
- Set `Secure` and `HttpOnly` flags on any cookies

### Environment Variables
- Never commit `.env` files to version control (`.gitignore` already excludes them)
- Use platform-provided secret management (Render secrets, Railway variables, etc.)
- Generate unique, cryptographically strong JWT secrets per environment

### Content Security
- Consider adding `helmet` middleware for HTTP security headers
- Implement input sanitization for HTML/XSS prevention in message content
- Add file type validation if file uploads are added in the future

### Monitoring
- Log authentication failures for anomaly detection
- Monitor failed report submissions for potential abuse patterns
- Set up alerts for unusual API usage patterns
