# Deployment Guide

This guide covers deploying ChatSphere to production environments.

## Prerequisites

- A MongoDB Atlas cluster (production tier recommended)
- A Google Cloud project with OAuth credentials configured for production URLs
- A Gemini API key
- Hosting accounts for backend (Render, Railway, or similar) and frontend (Vercel, Netlify, or similar)
- A plan for routing frontend requests to the backend (see **Frontend ↔ Backend Routing** below)

---

## 1. MongoDB Atlas (Production)

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a production cluster (M10+ recommended for production workloads)
3. Add your deployment server's IP to the **Network Access** whitelist (or allow access from anywhere: `0.0.0.0/0` for PaaS deployments)
4. Create a database user with read/write permissions
5. Copy the connection string — it will look like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/chatsphere?retryWrites=true&w=majority
   ```

---

## 2. Backend Deployment

### Option A: Render

1. Create a **Web Service** on [Render](https://render.com)
2. Connect your GitHub repository
3. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
4. Add environment variables (see below)
5. Deploy

### Option B: Railway

1. Create a new project on [Railway](https://railway.app)
2. Connect your GitHub repository
3. Set the root directory to `backend`
4. Add environment variables (see below)
5. Deploy

### Backend Environment Variables

```env
PORT=3000
MONGO_URI=mongodb+srv://...your-production-connection-string...
GEMINI_API_KEY=your_gemini_api_key
JWT_ACCESS_SECRET=<generate-a-strong-random-string>
JWT_REFRESH_SECRET=<generate-a-different-strong-random-string>
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://your-backend-url.com/api/auth/google/callback
CLIENT_URL=https://your-frontend-url.com
```

> **Important**: Generate cryptographically secure random strings for JWT secrets.
>
> - `openssl rand -base64 64`
> - Node.js: `node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"`

---

## Frontend ↔ Backend Routing (Important)

The frontend is configured to call the backend using **relative** URLs:

- REST API: `/api`
- Socket.IO: `/socket.io` (same origin as the frontend)

In local development, Vite proxies both to `http://localhost:3000` (see `frontend/vite.config.ts`).

In production you have two common options:

1. **Same-origin (recommended, no frontend code changes):** serve the frontend and proxy `/api` and `/socket.io` to your backend (Nginx/Caddy/Cloudflare/etc).
2. **Separate origins:** if your frontend and backend are on different domains, update the frontend to point at the backend origin (axios `baseURL` and the Socket.IO `io(...)` URL), then ensure `CLIENT_URL` matches your frontend URL for CORS.

---

## 3. Frontend Deployment

### Option A: Vercel

1. Create a new project on [Vercel](https://vercel.com)
2. Connect your GitHub repository
3. Configure:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Deploy

### Option B: Netlify

1. Create a new site on [Netlify](https://netlify.com)
2. Connect your GitHub repository
3. Configure:
   - **Base Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Publish Directory**: `frontend/dist`
4. Add a `_redirects` file in `frontend/public/`:
   ```
   /*    /index.html   200
   ```
   *(This handles client-side routing)*
5. Ensure your production setup routes `/api` and `/socket.io` to the backend (see **Frontend ↔ Backend Routing** above)

---

## 4. Google OAuth for Production

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Edit your OAuth 2.0 Client ID
3. Add your production URLs:
   - **Authorized JavaScript origins**: `https://your-frontend-url.com`
   - **Authorized redirect URIs**: `https://your-backend-url.com/api/auth/google/callback`
4. Update the `GOOGLE_CALLBACK_URL` environment variable on your backend deployment

---

## 5. CORS Configuration

The backend CORS origin is set from the `CLIENT_URL` environment variable. Make sure it exactly matches your frontend URL (including `https://`, no trailing slash).

```js
// backend/index.js
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(cors({ origin: CLIENT_URL, credentials: true }));
```

---

## 6. Post-Deployment Checklist

- [ ] Backend health check responds: `GET https://your-backend-url.com/api/health`
- [ ] Frontend loads correctly at production URL
- [ ] User registration and login work
- [ ] Google OAuth flow completes successfully
- [ ] Solo AI chat sends and receives messages
- [ ] Group rooms can be created and joined
- [ ] Real-time messaging works via Socket.IO
- [ ] MongoDB Atlas shows activity in monitoring

---

## Monitoring

- **Backend Logs**: Check your hosting platform's log viewer
- **MongoDB Atlas**: Use the built-in monitoring dashboard for query performance and connection counts
- **Health Endpoint**: Set up uptime monitoring on `GET /api/health`
