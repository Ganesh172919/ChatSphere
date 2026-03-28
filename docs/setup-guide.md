# Setup Guide

This guide matches the current codebase. ChatSphere runs locally with:

- Frontend: React + TypeScript + Vite
- Backend: Express + Socket.IO + MongoDB + Mongoose
- No Docker
- No Prisma runtime

## Prerequisites

- Node.js 18 or newer
- npm
- MongoDB running locally or a MongoDB Atlas connection string
- A Gemini API key

Optional:

- Google OAuth credentials
- SMTP credentials for real emails

## Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Windows PowerShell:

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Fill `backend/.env`:

```env
MONGO_URI=mongodb://localhost:27017/chatsphere
JWT_ACCESS_SECRET=replace_with_a_long_random_string
JWT_REFRESH_SECRET=replace_with_a_different_long_random_string
GEMINI_API_KEY=your_gemini_api_key
CLIENT_URL=http://localhost:5173
PORT=3000

# Optional Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# Optional SMTP email
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="ChatSphere" <noreply@chatsphere.app>

# Optional room edit window
MESSAGE_EDIT_WINDOW_MINUTES=15
```

Start the backend:

```bash
npm run dev
```

Expected local behavior:

- The backend connects to MongoDB.
- File uploads are stored in `backend/uploads`.
- If SMTP is missing, password reset links are printed to the backend console.
- If Google OAuth is missing, the app still runs; Google sign-in just shows a friendly local-setup error.

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Recommended First Checks

1. Open [http://localhost:3000/api/health](http://localhost:3000/api/health).
2. Register a local account.
3. Create or join a room.
4. Send a text message.
5. Upload an image or file in a room.
6. Try edit, delete, pin, and reaction actions on a room message.
7. Open the search page and verify both room-message and solo-conversation search.

## Google OAuth Setup

Only do this if you want Google sign-in locally.

1. Create an OAuth client in Google Cloud Console.
2. Add `http://localhost:5173` to Authorized JavaScript origins.
3. Add `http://localhost:3000/api/auth/google/callback` to Authorized redirect URIs.
4. Copy the client ID and secret into `backend/.env`.

The current flow is:

1. Frontend sends the user to `/api/auth/google`
2. Google returns to `/api/auth/google/callback`
3. Backend creates a short-lived one-time code
4. Frontend exchanges that code for JWT tokens through `/api/auth/google/exchange`

## Email Notes

- `POST /api/auth/forgot-password` works without SMTP.
- Without SMTP, the backend prints the reset link in the console.
- With SMTP configured, users receive the real reset email.

## Build Verification

Frontend:

```bash
cd frontend
npm run build
```

Backend syntax:

```powershell
cd backend
Get-ChildItem -Path . -Recurse -Filter *.js -File |
  Where-Object { $_.FullName -notmatch '\\node_modules\\' } |
  ForEach-Object { node --check $_.FullName }
```
