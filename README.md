# ChatSphere — High-Reasoning AI Chat Application

A production-grade full-stack AI chat application with solo and group conversations powered by Google Gemini, backed by MongoDB Atlas, with Google OAuth authentication.

## ✦ Features

- **Deep Reasoning AI** — Structured, multi-angle analysis powered by Gemini 1.5 Flash
- **Solo Chat** — Private conversations with markdown rendering, code highlighting, and persistent history
- **Group Rooms** — Create/join rooms, chat with others, summon AI with `@ai`
- **Real-time** — Socket.IO messaging, emoji reactions (👍🔥🤯💡), threaded replies, live presence
- **Polls** — Create polls in rooms with multiple-choice voting, anonymous mode, and auto-expiry
- **AI-Powered Tools** — Smart reply suggestions, sentiment analysis, grammar checking
- **Dashboard** — Personal stats overview, activity feed, recent rooms at a glance
- **Search** — Full-text message search with filters (room, user, date range, pagination)
- **User Profiles** — Customizable display name, bio, and avatar
- **Settings** — Theme (dark/light/system), accent color, notification preferences, AI feature toggles
- **Data Export** — Download solo conversations or room histories as JSON
- **Moderation** — Report users/messages (spam, harassment, hate speech), block/unblock users
- **Admin Panel** — Platform-wide stats, report review & resolution, user management
- **Analytics** — Messages per day, active users, top rooms — charted over 30–90 days
- **Message Features** — Pinned messages, read receipts, delivery status, typing indicators
- **Google OAuth** — One-click sign-in with Google alongside email/password auth
- **MongoDB Atlas** — All data persisted: conversations, rooms, messages, users, polls, reports
- **JWT Auth** — Access + refresh token pattern with automatic rotation
- **Premium UI** — Dark mode, grain texture, glow effects, Framer Motion animations

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+
- **MongoDB** — local instance or [MongoDB Atlas](https://cloud.mongodb.com) cluster
- **Google Gemini API key** — from [Google AI Studio](https://aistudio.google.com/apikey)
- **Google OAuth credentials** — from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)

### Backend

```bash
cd backend
npm install

# Edit .env — set your GEMINI_API_KEY at minimum
# Other credentials are pre-configured

node index.js
# → ✦ MongoDB connected
# → ✦ ChatSphere server running on port 3000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### Open the app

Navigate to [http://localhost:5173](http://localhost:5173)

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS, Zustand, Framer Motion |
| Backend | Node.js, Express, Socket.IO, Passport.js |
| Database | MongoDB (Mongoose ODM) |
| AI | Google Gemini 1.5 Flash |
| Auth | JWT (Access + Refresh tokens), Google OAuth2, bcryptjs |
| Real-time | Socket.IO (WebSocket + polling) |

## 📁 Project Structure

```
/backend
  config/db.js              → Mongoose connection to MongoDB Atlas
  config/passport.js        → Google OAuth2 strategy
  models/
    User.js                 → User schema (profile, settings, blocked users, admin flag)
    Room.js                 → Room schema (members, roles, AI history, pinned messages)
    Message.js              → Group message schema (reactions, replies, pins, read receipts)
    Conversation.js         → Solo chat persistence
    RefreshToken.js         → Token with TTL auto-expiry
    Poll.js                 → Poll schema (options, votes, anonymous, expiry)
    Report.js               → Moderation report schema (target, reason, status)
  middleware/
    auth.js                 → JWT middleware (Express)
    socketAuth.js           → JWT middleware (Socket.IO)
  routes/
    auth.js                 → Register, login, refresh, logout, Google OAuth
    chat.js                 → Solo AI chat
    conversations.js        → Conversation CRUD
    rooms.js                → Room CRUD + join/leave
    dashboard.js            → User dashboard stats & activity
    users.js                → Profile update, public profile view
    search.js               → Full-text message search
    ai.js                   → AI tools (smart replies, sentiment, grammar)
    settings.js             → User preference management
    polls.js                → Poll CRUD + voting
    groups.js               → Room member & role management
    moderation.js           → Reporting & user blocking
    export.js               → Data export (conversations, room messages)
    admin.js                → Admin stats, report review, user listing
    analytics.js            → Message trends, active users, top rooms
  services/gemini.js        → Gemini AI service
  index.js                  → Express + Socket.IO server

/frontend/src
  api/                      → Axios instance + API modules (auth, chat, conversations, rooms)
  store/                    → Zustand stores (auth, chat, room)
  hooks/                    → Custom hooks (useSocket, useChat)
  context/                  → Theme context
  components/               → 19 UI components
    AnalyticsCharts         → Chart visualizations for analytics data
    CodeBlock               → Syntax-highlighted code rendering
    CreateRoomModal         → Room creation form modal
    GrammarSuggestion       → AI grammar check display
    MarkdownRenderer        → Markdown content rendering
    MemberManagement        → Room member/role management UI
    MessageBubble           → Chat message display with reactions
    Navbar                  → Top navigation bar
    PinnedMessages          → Pinned messages panel
    PollComponents          → Poll creation, voting, results UI
    ProtectedRoute          → Auth route guard
    ReadReceipt             → Message read receipt indicators
    ReportModal             → User/message reporting form
    RoomCard                → Room preview card
    SentimentBadge          → AI sentiment analysis badge
    Sidebar                 → Navigation sidebar
    SmartReplies            → AI-generated reply suggestions
    TypingIndicator         → Real-time typing indicator
    UserList                → Online users list
  pages/                    → 13 route pages
    Landing                 → Marketing landing page
    Login / Register        → Auth forms
    GoogleCallback          → OAuth redirect handler
    Dashboard               → User stats & activity feed
    SoloChat                → Private AI chat
    Rooms                   → Room listing & creation
    GroupChat               → Real-time group chat
    Profile                 → User profile editor
    Settings                → User preferences
    SearchPage              → Message search interface
    ExportChat              → Data export interface
    AdminDashboard          → Admin panel
```

## ⚙️ Environment Variables

`backend/.env`:

```env
PORT=3000
MONGO_URI=mongodb+srv://your-connection-string
GEMINI_API_KEY=your_gemini_api_key
JWT_ACCESS_SECRET=your_jwt_access_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
CLIENT_URL=http://localhost:5173
```

## 🔐 Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new OAuth 2.0 Client ID
3. Set **Authorized redirect URI** to `http://localhost:3000/api/auth/google/callback`
4. Copy Client ID and Client Secret to `.env`

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/architecture.md) | System design, layers, and data flows |
| [API Reference](docs/api-reference.md) | Complete REST API documentation |
| [Database Schema](docs/database-schema.md) | All MongoDB collections and indexes |
| [Features](docs/features.md) | Detailed feature descriptions |
| [WebSocket Events](docs/websocket-events.md) | Real-time event reference |
| [Setup Guide](docs/setup-guide.md) | Step-by-step local development setup |
| [Deployment](docs/deployment.md) | Production deployment guide |
| [Security](docs/security.md) | Security model and best practices |
| [Contributing](docs/contributing.md) | Contribution guidelines |
| [Roadmap](ROADMAP.md) | Future direction and planned features |

---

✦ built with ☕ + gemini
