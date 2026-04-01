# ChatSphere Roadmap

A forward-looking guide for ChatSphere's evolution — organized by priority and effort.

---

## 🟢 Short-Term (Next Release)

High-impact features that build on the existing architecture with minimal complexity.

### File & Image Sharing
- Upload and share images, documents, and files in group rooms and solo chats
- Image previews inline in message bubbles with lightbox zoom
- File size limits and type validation
- Cloud storage integration (e.g., AWS S3, Cloudinary)

### Message Editing & Deletion
- Edit sent messages within a time window (e.g., 15 minutes)
- Delete own messages (soft delete with "message deleted" placeholder)
- Admin/moderator ability to delete any message in their room
- Edit history tracking with "edited" indicator

### Email Notifications
- Leverage existing `nodemailer` dependency for transactional emails
- Welcome email on registration
- Password reset flow (forgot password → email link → reset)
- Optional digest emails for unread mentions and replies

### Rate Limiting & Abuse Prevention
- `express-rate-limit` on auth routes (login, register, refresh)
- Per-user AI request throttling (prevent Gemini API cost runaway)
- Socket.IO event rate limiting (prevent message flooding)
- Captcha on registration (optional)

### Improved Search
- Search within solo conversations (currently only group messages)
- Search by file type, AI messages, or pinned messages
- Recent search history and saved searches

---

## 🟡 Medium-Term (v3.0)

Significant features that require architectural extensions.

### Voice & Video Chat
- WebRTC-based peer-to-peer voice and video calls within rooms
- Screen sharing for collaborative work
- Audio-only rooms for casual voice chat
- Recording capabilities (opt-in)

### End-to-End Encryption (E2EE)
- Optional E2EE for solo AI chats and direct messages
- Client-side encryption/decryption with key exchange
- Encrypted message storage (server cannot read content)
- Key rotation and device management

### Push Notifications
- Web Push API for desktop browser notifications
- Service worker for background notification delivery
- Notification preferences per room (mute, mentions-only, all)
- Mobile push via FCM (Firebase Cloud Messaging) for future mobile app

### Direct Messages (DMs)
- Private 1-on-1 conversations between users (separate from AI solo chat)
- Online status and typing indicators in DMs
- DM-specific notification settings
- Block integration (blocked users cannot send DMs)

### Room Categories & Discovery
- Categorize rooms (Technology, Social, Gaming, Education, etc.)
- Featured/trending rooms on the dashboard
- Room search by name, tags, or category
- Room invite links (shareable URLs)

### Notification Center
- Centralized notification inbox (mentions, replies, room invites, report updates)
- Mark as read/unread, notification grouping
- Notification badges on sidebar navigation

---

## 🔴 Long-Term (v4.0+)

Ambitious features requiring significant engineering investment.

### Plugin / Bot System
- Bot API for third-party integrations (GitHub, Jira, Slack-style webhooks)
- Custom bot accounts with dedicated tokens
- Slash commands (`/remind`, `/poll`, `/translate`)
- Marketplace for community-built plugins

### Multi-Language Support (i18n)
- Full UI internationalization with language switching
- AI responses in the user's preferred language
- RTL (right-to-left) layout support for Arabic, Hebrew, etc.
- Community-contributed translations

### Mobile Application
- React Native cross-platform app (iOS + Android)
- Push notifications via APNs/FCM
- Offline message queueing with sync on reconnect
- Biometric authentication (fingerprint, Face ID)

### SSO & Enterprise Auth
- SAML 2.0 integration for enterprise SSO
- LDAP/Active Directory support
- SCIM user provisioning
- Organization-level admin controls

### AI Enhancements
- Multi-model support (GPT-4, Claude, Llama alongside Gemini)
- AI personas with customizable system prompts per room
- RAG (Retrieval-Augmented Generation) with room document context
- AI-generated conversation summaries and meeting notes
- Image generation within chat (`@ai generate image of...`)

---

## 🛠️ DevOps & Infrastructure

Parallel improvements to developer experience and operational reliability.

### CI/CD Pipeline
- GitHub Actions for automated linting, testing, and deployment
- Separate staging and production environments
- Automated dependency updates (Dependabot/Renovate)

### Testing
- Backend: Jest + Supertest for API integration tests
- Frontend: Vitest + React Testing Library for component tests
- E2E: Playwright for full user flow testing
- Socket.IO: Dedicated real-time event test suite

### Docker & Containerization
- `Dockerfile` for backend and frontend
- `docker-compose.yml` for local development stack (app + MongoDB + Redis)
- Container orchestration ready (Kubernetes/ECS)

### Monitoring & Observability
- Structured logging (Winston/Pino) replacing `console.log`
- APM integration (Prometheus + Grafana or Datadog)
- Error tracking (Sentry)
- Socket.IO connection monitoring dashboard

### Database Optimization
- Redis caching layer for hot data (online users, room metadata, session data)
- MongoDB read replicas for analytics queries
- Database migration tooling for schema changes
- Automated backup and point-in-time recovery

---

## Contributing to the Roadmap

Have an idea? Open an issue with the `[feature-request]` tag describing:
1. **Problem**: What user pain point does this solve?
2. **Proposal**: How should it work?
3. **Impact**: Who benefits and how often?

See [Contributing Guide](docs/contributing.md) for more details.
