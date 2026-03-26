# ChatSphere Architecture

## Overall Architecture

ChatSphere is a modern full-stack web application designed for high-performance real-time messaging and deep AI reasoning. It follows a client-server model with a persistent data layer and real-time bidirectional event-based communication.

```
┌──────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                          │
│  React 18 + TypeScript + Vite + TailwindCSS + Zustand   │
│  13 Pages · 19 Components · Framer Motion animations    │
└────────────────────────┬─────────────────────────────────┘
                         │  HTTP REST + WebSocket (Socket.IO)
┌────────────────────────▼─────────────────────────────────┐
│                    SERVER LAYER                           │
│  Express.js REST API + Socket.IO WebSocket Server        │
│  15 Route Modules · JWT + OAuth Middleware               │
├──────────────┬──────────────┬────────────────────────────┤
│  AI LAYER    │  AUTH LAYER  │  MODERATION LAYER          │
│  Gemini API  │  Passport.js │  Reports · Blocks · Admin  │
│  Smart Reply │  JWT Rotate  │  Role-based access         │
│  Sentiment   │  Google SSO  │  Content moderation        │
│  Grammar     │              │                            │
└──────────────┴──────────┬───┴────────────────────────────┘
                          │  Mongoose ODM
┌─────────────────────────▼────────────────────────────────┐
│                    DATA LAYER                             │
│  MongoDB Atlas · 7 Collections                           │
│  Users · Rooms · Messages · Conversations                │
│  RefreshTokens · Polls · Reports                         │
└──────────────────────────────────────────────────────────┘
```

1.  **Client Layer (Frontend)**: React 18 single-page application built with Vite and TypeScript. It manages global state via Zustand, handles routing, and provides a highly interactive and aesthetic user interface using TailwindCSS and Framer Motion.
2.  **Server Layer (Backend)**: Express.js REST API coupled with a Socket.IO WebSocket server. It handles authentication, business logic, API routing, and AI integration with Google Gemini. Comprises 15 route modules covering everything from core chat to admin and analytics.
3.  **Data Layer (Database)**: MongoDB Atlas cluster, interacted with via Mongoose ODM. It provides document-oriented persistent storage across 7 collections for users, rooms, messages, conversations, tokens, polls, and reports.
4.  **AI Layer**: Google Gemini 1.5 Flash API for advanced reasoning, content generation, smart reply suggestions, sentiment analysis, and grammar checking within solo and group contexts.
5.  **Auth Layer**: Dual-strategy authentication (local + Google OAuth) converging into JWT access/refresh token pattern with Passport.js.
6.  **Moderation Layer**: User and content moderation through reporting, blocking, admin review, and role-based access control within rooms.

## Frontend Architecture

The frontend is structured into several core directories to enforce separation of concerns:

-   `src/pages/` — 13 top-level route pages:
    - `Landing` — Marketing page with feature showcase
    - `Login`, `Register` — Authentication forms
    - `GoogleCallback` — OAuth redirect handler
    - `Dashboard` — Personal stats, activity feed, recent rooms
    - `SoloChat` — Private 1-on-1 AI conversations
    - `Rooms` — Room listing, creation, and discovery
    - `GroupChat` — Real-time group messaging with AI, polls, pins
    - `Profile` — User profile editor (display name, bio, avatar)
    - `Settings` — Theme, notifications, AI feature toggles
    - `SearchPage` — Full-text message search with filters
    - `ExportChat` — Data export interface
    - `AdminDashboard` — Platform admin panel

-   `src/components/` — 19 reusable UI components including `MessageBubble`, `PollComponents`, `SmartReplies`, `SentimentBadge`, `GrammarSuggestion`, `PinnedMessages`, `MemberManagement`, `ReportModal`, `ReadReceipt`, `TypingIndicator`, `AnalyticsCharts`, and more.

-   `src/store/` — Zustand stores for managing global state slices (`authStore`, `chatStore`, `roomStore`).
-   `src/hooks/` — Custom React hooks encapsulating complex logic, particularly around real-time connections (`useSocket`) and chat interactions (`useChat`).
-   `src/api/` — Axios instances and API service modules for interacting with the backend REST endpoints.
-   `src/context/` — React context providers, such as the Theme context for dark mode toggling.

## Backend Architecture

The backend utilizes an MVC-like structure tailored for real-time and API-driven applications:

-   `config/` — Configuration files for database connections (`db.js`) and third-party integrations (`passport.js` for Google OAuth).
-   `models/` — 7 Mongoose schemas: `User`, `Room`, `Message`, `Conversation`, `RefreshToken`, `Poll`, `Report`.
-   `middleware/` — Express middleware for JWT authentication (`auth.js`) and Socket.IO authorization (`socketAuth.js`).
-   `routes/` — 15 Express router modules:

    | Module | Mount Path | Purpose |
    |--------|-----------|---------|
    | `auth.js` | `/api/auth` | Registration, login, token refresh, logout, Google OAuth |
    | `chat.js` | `/api/chat` | Solo AI conversations |
    | `conversations.js` | `/api/conversations` | Conversation CRUD |
    | `rooms.js` | `/api/rooms` | Room CRUD + join/leave |
    | `dashboard.js` | `/api/dashboard` | Aggregated user stats & activity feed |
    | `users.js` | `/api/users` | Profile management |
    | `search.js` | `/api/search` | Full-text message search |
    | `ai.js` | `/api/ai` | Smart replies, sentiment analysis, grammar check |
    | `settings.js` | `/api/settings` | User preferences (theme, notifications, AI toggles) |
    | `polls.js` | `/api/polls` | Poll CRUD + voting |
    | `groups.js` | `/api/groups` | Member management & role assignment |
    | `moderation.js` | `/api/moderation` | Reporting & user blocking |
    | `export.js` | `/api/export` | Data export (conversations, rooms) |
    | `admin.js` | `/api/admin` | Platform stats, report review, user listing |
    | `analytics.js` | `/api/analytics` | Message trends, active users, top rooms |

-   `services/` — Encapsulated third-party service interactions (`gemini.js`).
-   `index.js` — Application entry point: Express, Socket.IO, and all WebSocket event handlers.

## Authentication Flow

ChatSphere employs a robust dual-strategy authentication system:

1.  **Email & Password**: Traditional registration and login using bcrypt for password hashing (12 salt rounds).
2.  **Google OAuth2**: One-click social login using Passport.js.

Both strategies converge into a **JWT (JSON Web Token)** pattern:
-   **Access Token**: Short-lived token attached to every authorized request (via Authorization header) and Socket.IO connection.
-   **Refresh Token**: Long-lived token stored securely, used to obtain new Access Tokens without re-authentication. Auto-expires based on MongoDB TTL index.

## Real-time Architecture

Socket.IO handles all real-time features with server-side state tracking:

-   **Room Presence**: In-memory `Map<roomId, Map<socketId, user>>` tracks who is in each room.
-   **Global Online Status**: `Map<userId, socketInfo>` tracks all connected users; status is also persisted to the User model in MongoDB.
-   **Typing Indicators**: `Map<roomId, Map<userId, timeout>>` tracks typing state with 3-second auto-expire.
-   **Message Lifecycle**: Messages flow through `sent → delivered → read` status with real-time broadcast of state changes.
-   **AI Integration**: AI requests emit `ai_thinking` (loading state) → process via Gemini → emit `ai_response` with the result.

## Admin & Moderation Architecture

Role-based access control operates at two levels:

1.  **Platform-level**: `User.isAdmin` flag gates access to `/api/admin` routes via `adminCheck` middleware.
2.  **Room-level**: `Room.members[].role` (admin/moderator/member) controls role assignment, member kicking, and moderation actions. Room creators have ultimate authority.

Reports follow a lifecycle: `pending → reviewed | action_taken | dismissed`, tracked in the `Report` model and managed through the admin panel.
