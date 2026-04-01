# 03 - Developer Onboarding Guide

Everything a new developer needs to start contributing to ChatSphere.

---

## Welcome

This guide gets you from zero to productive in under 30 minutes. Follow the steps in order.

---

## 1. Environment Setup

### Required Tools

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 22.x+ | https://nodejs.org |
| Git | 2.x+ | https://git-scm.com |
| PostgreSQL | 16+ | https://postgresql.org or Docker |
| VS Code | Latest | https://code.visualstudio.com |

### Recommended VS Code Extensions

- ESLint
- Prettier
- Prisma
- Tailwind CSS IntelliSense
- Thunder Client (API testing)
- GitLens

### Clone and Setup

```bash
git clone <repository-url>
cd rebuild-project
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
```

See [01 - Local Setup Guide](./01-local-setup-guide.md) for detailed instructions.

---

## 2. Project Structure Walkthrough

```
rebuild-project/
├── src/                    # Backend source
│   ├── config/             # App configuration (env, prisma, logger)
│   ├── modules/            # Feature modules (auth, rooms, files, ai, memory)
│   ├── services/           # Reusable business logic services
│   ├── socket/             # Socket.IO event handlers
│   ├── middleware/          # Express middleware
│   ├── helpers/            # Utility functions
│   ├── types/              # Shared TypeScript types
│   ├── app.ts              # Express app factory
│   └── server.ts           # Entry point
├── frontend/               # React frontend
│   └── src/
│       ├── components/     # UI components
│       ├── hooks/          # Custom React hooks
│       ├── lib/            # Utilities (api, socket, helpers)
│       ├── stores/         # Zustand state stores
│       ├── pages/          # Route pages
│       └── types/          # Frontend types
├── prisma/                 # Database schema and migrations
├── docs/                   # Documentation
├── scripts/                # Run scripts
└── docker-compose.yml      # Docker services
```

---

## 3. Code Conventions

### TypeScript

- Strict mode enabled
- No `any` unless absolutely necessary
- Interface for object shapes, type for unions/primitives
- Explicit return types on public functions

### Naming

| Element | Convention | Example |
|---------|-----------|---------|
| Files | kebab-case | `auth.service.ts` |
| Classes | PascalCase | `AuthService` |
| Functions | camelCase | `getUserById` |
| Constants | UPPER_SNAKE | `MAX_UPLOAD_SIZE` |
| DB Models | PascalCase | `User`, `RoomMember` |
| API Routes | kebab-case | `/api/room-members` |

### Module Pattern

Each backend module follows:

```
module-name/
├── module-name.routes.ts       # Route definitions
├── module-name.controller.ts   # Request handling
├── module-name.service.ts      # Business logic
└── module-name.schemas.ts      # Zod schemas
```

### Frontend Components

- Functional components with hooks
- Props typed with interfaces
- One component per file
- PascalCase component names

### Commit Messages

```
feat: add room invitation system
fix: resolve token refresh race condition
docs: update API documentation
refactor: extract auth service methods
test: add unit tests for message service
```

---

## 4. Key Concepts

### Backend Request Lifecycle

```
Request → Middleware → Validation → Controller → Service → Database → Response
```

### Authentication

- JWT access tokens (15min) + refresh tokens (30 days)
- Tokens stored in Zustand on client (memory only)
- Refresh token rotation on each use

### Real-Time

- Socket.IO for all real-time events
- JWT auth on socket connection
- Room-based channel isolation

### Database

- PostgreSQL via Prisma ORM
- Migrations for schema changes
- CUID for primary keys

---

## 5. Common Tasks

### Adding a New API Endpoint

1. Define Zod schema in `module.schemas.ts`
2. Add service method in `module.service.ts`
3. Add controller method in `module.controller.ts`
4. Register route in `module.routes.ts`
5. Add route to `app.ts` if new module

### Adding a New Socket Event

1. Define handler in `src/socket/handlers.ts`
2. Register in `src/socket/index.ts`
3. Add client handler in `frontend/src/hooks/use-socket.ts`
4. Update store if needed

### Running a Database Migration

```bash
# After editing prisma/schema.prisma
npx prisma migrate dev --name describe_change
npm run prisma:generate
```

### Adding a Frontend Component

1. Create component in `frontend/src/components/category/`
2. Export from component file
3. Import where needed
4. Add to Zustand store if stateful

---

## 6. Testing

### Backend Tests

```bash
npm test
```

Tests live alongside source files with `.test.ts` or `.spec.ts` suffix.

### Frontend Tests

```bash
cd frontend
npm test
```

### API Testing

Use Thunder Client or Postman with the collection at `postman/ChatSphere.postman_collection.json`.

---

## 7. Debugging

### Backend

```bash
# VS Code launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Backend",
  "program": "${workspaceFolder}/src/server.ts",
  "runtimeArgs": ["-r", "tsx/cjs"]
}
```

### Frontend

Chrome DevTools with React DevTools extension.

### Socket.IO

Enable debug logging:

```env
DEBUG=socket.io:*
```

### Database

Open Prisma Studio:

```bash
npx prisma studio
```

---

## 8. Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code |
| `develop` | Integration branch |
| `feature/*` | New features |
| `fix/*` | Bug fixes |
| `docs/*` | Documentation |

### Workflow

1. Create branch from `develop`
2. Make changes
3. Write/update tests
4. Submit PR to `develop`
5. Code review
6. Merge

---

## 9. Useful Commands

```bash
# Backend
npm run dev              # Start dev server
npm run build            # Build for production
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations
npx prisma studio        # Open DB GUI

# Frontend
cd frontend
npm run dev              # Start dev server
npm run build            # Production build

# Docker
docker compose up -d     # Start services
docker compose down      # Stop services
docker compose logs -f   # View logs
```

---

## 10. Getting Help

1. Check existing documentation in `docs/`
2. Read error messages carefully
3. Check logs: `docker compose logs -f`
4. Open Prisma Studio: `npx prisma studio`
5. Ask the team

---

## Onboarding Checklist

- [ ] Clone repository
- [ ] Install Node.js 22+
- [ ] Configure `.env`
- [ ] Start PostgreSQL
- [ ] Run migrations
- [ ] Start backend successfully
- [ ] Start frontend successfully
- [ ] Register a test user
- [ ] Create a room
- [ ] Send a message
- [ ] Test AI chat (mock provider)
- [ ] Read architecture docs
- [ ] Make a small test change
- [ ] Submit a PR

---

## Further Reading

- [01 - Local Setup Guide](./01-local-setup-guide.md)
- [02 - Architecture Explanation](./02-architecture-explanation.md)
- [04 - API Documentation](./04-api-documentation.md)
