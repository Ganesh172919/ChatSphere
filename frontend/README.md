# ChatSphere Frontend

React + TypeScript + Vite client for ChatSphere.

## Local development

1. Start the backend first (see the root `README.md`).
2. Then run the frontend:

```bash
cd frontend
npm install
npm run dev
```

The dev server runs on `http://localhost:5173` and proxies:

- `/api` → `http://localhost:3000`
- `/socket.io` → `http://localhost:3000` (WebSocket enabled)

Proxy config lives in `frontend/vite.config.ts`.

## Build

```bash
cd frontend
npm run build
```

## Production note

The app calls the backend via relative URLs (`/api` and `io('/')`). For production deployments, either:

- keep frontend + backend on the same origin and proxy `/api` + `/socket.io`, or
- update the frontend to point at your backend origin (axios `baseURL` and the Socket.IO `io(...)` URL).
