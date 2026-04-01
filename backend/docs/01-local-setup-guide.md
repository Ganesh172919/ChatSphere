# 01 - Local Development Setup Guide

Complete step-by-step guide to run the ChatSphere platform on your local machine.

---

## Prerequisites

| Software | Version | Required |
|----------|---------|----------|
| Node.js | 22.x+ | Yes |
| npm | 10.x+ | Yes |
| PostgreSQL | 16+ | Yes |
| Docker | 24+ | Optional |
| Git | 2.x+ | Yes |

---

## Option A: Docker Setup (Recommended)

### Step 1 - Clone Repository

```bash
git clone <repository-url>
cd rebuild-project
```

### Step 2 - Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/chatsphere?schema=public
JWT_ACCESS_SECRET=dev-access-secret-min-32-characters-long
JWT_REFRESH_SECRET=dev-refresh-secret-min-32-characters-long
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL_DAYS=30
CLIENT_URL=http://localhost:5173
AI_PROVIDER=mock
AI_DEFAULT_MODEL=mock-general
UPLOAD_DIR=./storage/private
MAX_UPLOAD_SIZE_MB=10
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=120
```

### Step 3 - Start All Services

```bash
docker compose up -d
```

This starts PostgreSQL and the backend service. Wait for health checks to pass:

```bash
docker compose logs -f postgres
docker compose logs -f backend
```

### Step 4 - Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### Step 5 - Start Frontend Dev Server

```bash
cd frontend
npm run dev
```

### Step 6 - Verify

- Backend API: http://localhost:4000/api/health
- Frontend: http://localhost:5173

---

## Option B: Native Setup

### Step 1 - Install PostgreSQL

Install PostgreSQL 16+ and create a database:

```sql
CREATE DATABASE chatsphere;
CREATE USER chatsphere_user WITH PASSWORD 'chatsphere_pass';
GRANT ALL PRIVILEGES ON DATABASE chatsphere TO chatsphere_user;
```

### Step 2 - Clone and Install

```bash
git clone <repository-url>
cd rebuild-project
npm install
```

### Step 3 - Configure Environment

```bash
cp .env.example .env
```

Update `DATABASE_URL` in `.env`:

```env
DATABASE_URL=postgresql://chatsphere_user:chatsphere_pass@localhost:5432/chatsphere?schema=public
```

### Step 4 - Generate Prisma Client

```bash
npm run prisma:generate
```

### Step 5 - Run Database Migrations

```bash
npm run prisma:migrate:deploy
```

### Step 6 - Start Backend

```bash
npm run dev
```

### Step 7 - Start Frontend (New Terminal)

```bash
cd frontend
npm install
npm run dev
```

---

## Service Port Map

| Service | Port | URL |
|---------|------|-----|
| Backend API | 4000 | http://localhost:4000 |
| Frontend Dev | 5173 | http://localhost:5173 |
| PostgreSQL | 5432 | localhost:5432 |

---

## Database Seeding

After migrations, optionally seed test data:

```bash
npx prisma db seed
```

Or use Prisma Studio to manually add data:

```bash
npx prisma studio
```

---

## Windows Quick Start

```powershell
.\scripts\start-all.bat
```

---

## Troubleshooting

### Port 4000 Already in Use

```powershell
netstat -ano | findstr :4000
taskkill /PID <PID> /F
```

### Database Connection Refused

Ensure PostgreSQL is running. With Docker:

```bash
docker compose restart postgres
```

Native: check your PostgreSQL service status.

### Prisma Client Not Generated

```bash
npm run prisma:generate
```

### Migration Errors

Reset database and reapply:

```bash
npx prisma migrate reset --force
npm run prisma:migrate:deploy
```

### Frontend Build Errors

```bash
rm -rf frontend/node_modules
cd frontend && npm install
```

---

## Environment Variable Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Runtime environment |
| `PORT` | `4000` | Backend server port |
| `DATABASE_URL` | - | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | - | JWT signing key (min 32 chars) |
| `JWT_REFRESH_SECRET` | - | Refresh token signing key |
| `JWT_ACCESS_TTL` | `15m` | Access token lifetime |
| `JWT_REFRESH_TTL_DAYS` | `30` | Refresh token lifetime |
| `CLIENT_URL` | `http://localhost:5173` | Frontend URL for CORS |
| `AI_PROVIDER` | `mock` | AI backend (mock/openai/openrouter) |
| `UPLOAD_DIR` | `./storage/private` | File upload directory |
| `MAX_UPLOAD_SIZE_MB` | `10` | Max upload size |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window |
| `RATE_LIMIT_MAX` | `120` | Max requests per window |
| `GOOGLE_CLIENT_ID` | - | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | - | Google OAuth client secret |

---

## Next Steps

- Read [02 - Architecture Explanation](./02-architecture-explanation.md) for system design
- Read [03 - Developer Onboarding](./03-developer-onboarding-guide.md) for contribution guidelines
- Read [04 - API Documentation](./04-api-documentation.md) for endpoint reference
