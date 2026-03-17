# ChatSphere — High-Reasoning AI Chat Application

A production-grade full-stack AI chat application with solo and group conversations powered by Google Gemini, backed by MongoDB Atlas, with Google OAuth authentication.

## ✦ Features

- **Deep Reasoning AI** — Structured, multi-angle analysis powered by Gemini 1.5 Flash
- **Solo Chat** — Private conversations with markdown rendering, code highlighting, and persistent history
- **Group Rooms** — Create/join rooms, chat with others, summon AI with `@ai`
- **Real-time** — Socket.IO messaging, emoji reactions (👍🔥🤯💡), threaded replies, live presence
- **Google OAuth** — One-click sign-in with Google alongside email/password auth
- **MongoDB Atlas** — All data persisted: conversations, rooms, messages, users
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
  models/User.js            → User schema (bcrypt, Google ID)
  models/Room.js            → Room schema (AI history)
  models/Message.js         → Group message schema (reactions)
  models/Conversation.js    → Solo chat persistence
  models/RefreshToken.js    → Token with TTL auto-expiry
  middleware/auth.js         → JWT middleware (Express)
  middleware/socketAuth.js   → JWT middleware (Socket.IO)
  routes/auth.js             → Register, login, refresh, logout, Google OAuth
  routes/chat.js             → Solo AI chat
  routes/conversations.js    → Conversation CRUD
  routes/rooms.js            → Room CRUD
  services/gemini.js         → Gemini AI service
  index.js                   → Express + Socket.IO server

/frontend/src
  api/                       → Axios instance + API modules (auth, chat, conversations, rooms)
  store/                     → Zustand stores (auth, chat, room)
  hooks/                     → Custom hooks (useSocket, useChat)
  context/                   → Theme context
  components/                → UI components (10 components)
  pages/                     → Route pages (Landing, Login, Register, GoogleCallback, SoloChat, Rooms, GroupChat)
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

---

✦ built with ☕ + gemini
