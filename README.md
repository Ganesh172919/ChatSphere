# ChatSphere
AI Powered Full Stack Application for Group-Chat

## Backend Local Run

1. Open a terminal and move to backend:
	- `cd backend`
2. Install dependencies:
	- `npm ci`
3. Create environment file:
	- copy `.env.example` to `.env` and set required values.
4. Build backend:
	- `npm run build`
5. Start backend:
	- `npm start`

## Backend Docker Run

1. Move to backend folder:
	- `cd backend`
2. Ensure `.env` exists (copy from `.env.example` and update secrets).
3. Start backend + PostgreSQL:
	- `docker compose up --build`

Prisma migrations are executed automatically during backend container startup via `docker-entrypoint.sh` using `prisma migrate deploy` with retry logic.

## Useful Notes

- If port 3000 is already in use, run backend with a different `PORT` value.
- If Google OAuth variables are not configured, backend starts normally and logs a warning.
