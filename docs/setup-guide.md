# Setup Guide

This guide matches the current codebase as of March 31, 2026.

## Prerequisites

- Node.js 18 or newer
- npm
- MongoDB running locally or a MongoDB Atlas connection string
- At least one provider API key if you want live AI responses

## Backend Setup

Create `backend/.env` manually. The current repository does not include a checked-in `backend/.env.example` file.

Suggested starting file:

```env
MONGO_URI=mongodb://localhost:27017/chatsphere
JWT_ACCESS_SECRET=replace_with_a_long_random_string
JWT_REFRESH_SECRET=replace_with_a_different_long_random_string
CLIENT_URL=http://localhost:5173
PORT=3000

# Primary AI path
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_DEFAULT_MODEL=openai/gpt-5.4-mini
DEFAULT_AI_MODEL=openai/gpt-5.4-mini

# Optional direct providers
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
GROK_API_KEY=
GROQ_API_KEY=
TOGETHER_API_KEY=
HUGGINGFACE_API_KEY=
HUGGINGFACE_MODEL=meta-llama/Llama-3.1-8B-Instruct:cerebras

# Optional tuning
MODEL_CATALOG_TTL_MS=1800000
AI_FALLBACK_MODEL_LIMIT=6
AI_ROUTE_RATE_LIMIT_MAX=80
API_RATE_LIMIT_MAX=1000
MESSAGE_EDIT_WINDOW_MINUTES=15
```

Run the backend:

```powershell
cd backend
npm install
npm run dev
```

Expected backend behavior:

- MongoDB connects before the server starts listening.
- Provider catalogs refresh when matching API keys exist.
- The startup log prints provider counts for visible models.
- File uploads are written to `backend/uploads`.
- If no providers are configured, the backend still boots and model discovery returns an empty-state message.

## Frontend Setup

```powershell
cd frontend
npm install
npm run dev
```

Open:

- [http://localhost:5173](http://localhost:5173)
- [http://localhost:3000/api/health](http://localhost:3000/api/health)

## Recommended AI Smoke Test

1. Register or log in.
2. Open solo chat.
3. Confirm the model picker loads visible models.
4. Send a solo prompt with `auto` or a concrete model.
5. Upload a small text file and send a file-assisted solo prompt.
6. Open a room.
7. Join the room and send a normal text message.
8. Type `@ai` and confirm the room AI responds.
9. Open the insight panel in solo chat and group chat.
10. Open memory center and confirm new memory entries appear after relevant prompts.

## Build Verification

Frontend:

```powershell
cd frontend
npm run build
```

Backend syntax check:

```powershell
cd backend
Get-ChildItem -Path . -Recurse -Filter *.js -File |
  Where-Object { $_.FullName -notmatch '\node_modules\' -and $_.FullName -notmatch '\dist\' } |
  ForEach-Object { node --check $_.FullName }
```
