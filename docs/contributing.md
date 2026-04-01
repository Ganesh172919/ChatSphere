# Contributing to ChatSphere

Thank you for your interest in contributing to ChatSphere! This guide will help you get started.

## Development Setup

1. Follow the [Setup Guide](setup-guide.md) to get the project running locally
2. Make sure both backend and frontend are running and connected

## Code Style & Conventions

### Backend (Node.js)
- **Language**: JavaScript (CommonJS modules with `require`)
- **Framework**: Express.js with Mongoose ODM
- **Naming**: camelCase for variables/functions, PascalCase for models
- **File structure**: One model per file, one route group per file
- **Error handling**: Always wrap async route handlers in try/catch, log errors with `console.error`, return appropriate HTTP status codes
- **Authentication**: Use `authMiddleware` on all protected routes

### Frontend (React + TypeScript)
- **Language**: TypeScript (strict mode)
- **Framework**: React 18 with Vite bundler
- **Styling**: TailwindCSS utility classes
- **State management**: Zustand stores (one per domain: auth, chat, room)
- **Naming**: PascalCase for components:, camelCase for hooks/utilities
- **Components**: Functional components with hooks only (no class components)

## Branch Strategy

```
main          ← stable, production-ready
├── dev       ← integration branch for features
│   ├── feature/your-feature-name
│   ├── fix/bug-description
│   └── docs/documentation-change
```

## Commit Messages

Use conventional commit format:

```
feat: add file sharing to group chat
fix: resolve token refresh loop on expired sessions
docs: update API reference for polls endpoints
style: improve message bubble animations
refactor: extract socket event handlers into modules
```

## Adding a New Feature

### Backend
1. **Model** — Create a Mongoose schema in `backend/models/` if needed
2. **Route** — Create a new route file in `backend/routes/`
3. **Register** — Add `require` and `app.use()` in `backend/index.js`
4. **Socket** — If real-time, add event handlers in the `io.on('connection')` block in `index.js`
5. **Docs** — Update `docs/api-reference.md` and `docs/database-schema.md`

### Frontend
1. **API** — Add API functions in `frontend/src/api/`
2. **Store** — Add state management in `frontend/src/store/` if needed
3. **Component** — Build UI in `frontend/src/components/`
4. **Page** — Create page in `frontend/src/pages/`
5. **Route** — Register in `frontend/src/App.tsx`

## Pull Request Checklist

- [ ] Code follows the project's style conventions
- [ ] All existing functionality still works
- [ ] New API endpoints are documented in `docs/api-reference.md`
- [ ] New models are documented in `docs/database-schema.md`
- [ ] New socket events are documented in `docs/websocket-events.md`
- [ ] New features are described in `docs/features.md`
- [ ] README is updated if the feature is user-facing

## Reporting Issues

When reporting a bug, please include:
1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. Browser/Node version
5. Console error messages (if any)
