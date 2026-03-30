# ChatSphere

AI-powered full-stack collaboration app with:

- solo AI chat
- realtime group rooms
- project context
- long-term memory
- file uploads
- settings, moderation, analytics, and admin-ready backend APIs

## Project Structure

```text
ChatSphere/
  backend/   Express + Socket.IO + Prisma + PostgreSQL
  frontend/  React + Vite + TypeScript
  docs/      architecture and planning docs
```

## Tech Stack

### Frontend
- React 18
- TypeScript
- Vite
- React Router
- TanStack Query
- Zustand
- Socket.IO client
- Tailwind CSS

### Backend
- Node.js
- Express
- TypeScript
- Socket.IO
- Prisma
- PostgreSQL
- Passport Google OAuth
- Zod

## Default Local URLs

### Local development
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- PostgreSQL: `localhost:5432`

### Docker full stack
- Frontend: `http://localhost:8080`
- Backend: `http://localhost:3000`
- PostgreSQL: `localhost:5432`

## Prerequisites

- Node.js 20+
- npm
- Docker Desktop or Docker Engine

## Quickest Way to Run the Full Project

This starts PostgreSQL, the backend, and the frontend from the repo root.

1. Install root dependencies:

```powershell
npm install
```

2. Create the backend environment file:

```powershell
Copy-Item backend\.env.example backend\.env
```

3. Update `backend/.env`:

- set `JWT_ACCESS_SECRET`
- set `JWT_REFRESH_SECRET`
- optionally set AI provider keys such as `OPENROUTER_API_KEY`
- optionally set Google OAuth values

4. Start the full stack:

```powershell
npm run docker:up
```

5. Open the app:

- Frontend: [http://localhost:8080](http://localhost:8080)
- Backend: [http://localhost:3000](http://localhost:3000)

6. Stop everything:

```powershell
npm run docker:down
```

### Notes for Docker mode

- The root `docker-compose.yml` builds:
  - `db`
  - `backend`
  - `frontend`
- The backend container runs Prisma migrations automatically through `backend/docker-entrypoint.sh`.
- In Docker mode, the backend uses `CLIENT_URL=http://localhost:8080` from compose overrides.

## Run Locally for Development

This is the best option if you want hot reload on both frontend and backend.

### 1. Start PostgreSQL

You can start only the database from the root compose file:

```powershell
docker compose up -d db
```

Wait until PostgreSQL is healthy before starting the backend.

### 2. Start the backend

1. Install backend dependencies:

```powershell
cd backend
npm ci
```

2. Create the backend env file:

```powershell
Copy-Item .env.example .env
```

3. Make sure these values are correct in `backend/.env`:

```env
PORT=3000
CLIENT_URL=http://localhost:5173
SERVER_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/chatsphere?schema=public
JWT_ACCESS_SECRET=replace-with-a-long-random-secret
JWT_REFRESH_SECRET=replace-with-another-long-random-secret
```

4. Start the backend in dev mode:

```powershell
npm run dev
```

The backend will be available at [http://localhost:3000](http://localhost:3000).

### 3. Start the frontend

Open a second terminal:

1. Install frontend dependencies:

```powershell
cd frontend
npm ci
```

2. Create the frontend env file:

```powershell
Copy-Item .env.example .env
```

3. The default frontend env is:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
VITE_ENABLE_QUERY_DEVTOOLS=false
```

4. Start the frontend:

```powershell
npm run dev
```

The frontend will be available at [http://localhost:5173](http://localhost:5173).

## Useful Commands

### Root

```powershell
npm run docker:up
npm run docker:down
npm run frontend:dev
npm run frontend:check
```

### Backend

```powershell
cd backend
npm run dev
npm run build
npm start
npm run prisma:generate
npm run prisma:migrate
```

### Frontend

```powershell
cd frontend
npm run dev
npm run build
npm run preview
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run check
```

## Environment Notes

### Backend

`backend/.env.example` contains the base development configuration.

Important values:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CLIENT_URL`
- `SERVER_URL`
- `OPENROUTER_API_KEY` or other AI provider keys
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`

### Frontend

`frontend/.env.example` contains the frontend runtime settings.

Important values:

- `VITE_API_BASE_URL`
- `VITE_SOCKET_URL`
- `VITE_ENABLE_QUERY_DEVTOOLS`

## Authentication and AI Notes

- If Google OAuth is not configured, the backend still starts normally, but Google sign-in will not work.
- If AI provider keys are missing, the app still runs, but AI features may return fallback or unavailable responses.
- Refresh tokens are stored in secure cookies and access tokens are kept in frontend memory.

## Troubleshooting

### Port already in use

- Backend default port: `3000`
- Frontend dev port: `5173`
- Docker frontend port: `8080`
- PostgreSQL port: `5432`

Change the port values in the env files if needed.

### Database connection issues

- Make sure PostgreSQL is running.
- Verify `DATABASE_URL` in `backend/.env`.
- If you are using Docker for the full stack, do not point `DATABASE_URL` at `localhost` inside the backend container. The root compose file already overrides it to `db`.

### Frontend cannot reach backend

Check:

- backend is running on `http://localhost:3000`
- `frontend/.env` points `VITE_API_BASE_URL` and `VITE_SOCKET_URL` to the backend
- `CLIENT_URL` in `backend/.env` matches the frontend origin

### Docker stack starts but the UI is blank

Check:

- backend container is healthy and listening on port `3000`
- frontend container is exposed on port `8080`
- `npm run docker:up` finished building successfully

## Additional Documentation

- [Technical architecture](docs/ChatSphere-Technical-Documentation.md)
- [Backend documentation set](docs/backend)
- [Product and scaling analysis](docs/ChatSphere-Product-Architecture-Roadmap.md)
