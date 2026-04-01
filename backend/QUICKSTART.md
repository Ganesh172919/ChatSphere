# ChatSphere Quick Start Guide

This guide will help you get ChatSphere up and running in just a few minutes.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 22+** - [Download](https://nodejs.org/)
- **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop/)
- **Git** - [Download](https://git-scm.com/)

---

## Option 1: Docker Compose (Fastest)

### Step 1: Clone and Start

```bash
# Clone the repository
git clone <repository-url>
cd rebuild-project

# Start all services with one command
docker compose up -d
```

### Step 2: Access the Application

| Service | URL |
|----------|-----|
| Frontend | http://localhost |
| Backend API | http://localhost:4000 |
| API Health | http://localhost:4000/api/health |

**That's it!** 🎉

---

## Option 2: Local Development

### Step 1: Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Step 2: Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and ensure these variables are set:

```env
DATABASE_URL=postgresql://chatsphere:chatsphere_secret@localhost:5432/chatsphere?schema=public
JWT_ACCESS_SECRET=replace_with_a_long_random_secret_value_123456
JWT_REFRESH_SECRET=replace_with_another_long_random_secret_value_123456
```

### Step 3: Start Database

```bash
# Start PostgreSQL with Docker
docker compose up -d postgres
```

### Step 4: Run Migrations

```bash
# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate:deploy
```

### Step 5: Start the Application

```bash
# Terminal 1 - Start backend
npm run dev

# Terminal 2 - Start frontend
cd frontend
npm run dev
```

### Step 6: Access the Application

| Service | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:4000 |

---

## First Time Setup

### 1. Register an Account

1. Open http://localhost:5173/register
2. Fill in the form:
   - **Username**: Choose a unique username (lowercase letters, numbers, underscores)
   - **Email**: Enter your email
   - **Password**: At least 8 characters
3. Click "Create Account"

### 2. Create a Room

1. Click the **"New Room"** button in the sidebar
2. Enter a room name (required)
3. Add a description (optional)
4. Choose visibility:
   - **Private** - Only invited members can join
   - **Internal** - All authenticated users can join
   - **Public** - Anyone can join
5. Click "Create Room"

### 3. Start Chatting!

- Type a message in the input box
- Press Enter or click Send
- Messages appear instantly for all room members

---

## Common Tasks

### Creating a Room

1. Click **"New Room"** in the sidebar
2. Fill in room details
3. Click **"Create Room"**

### Adding Members

1. Click the **Members** icon in the chat header
2. Enter the username to add
3. Select a role (Member or Admin)

### Using AI Features

1. Click the **AI** icon in the chat header
2. Choose a tab:
   - **Chat** - Have a conversation with AI
   - **Smart Replies** - Get suggested replies
   - **Insights** - Generate insights from text

### Reacting to Messages

1. Hover over a message
2. Click the emoji icon
3. Select a reaction (👍 🔥 🤯 💡)

### Pinning Messages

1. Hover over a message
2. Click the pin icon
3. Pinned messages appear at the top of the chat

---

## Troubleshooting

### "Database connection failed"

```bash
# Restart PostgreSQL
docker compose restart postgres

# Check logs
docker compose logs postgres
```

### "Port already in use"

```bash
# Find process using port 4000
netstat -ano | findstr :4000

# Kill the process
taskkill /PID <PID> /F
```

### "Module not found"

```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install

cd frontend
rm -rf node_modules
npm install
```

### "Migration failed"

```bash
# Reset database
npx prisma migrate reset --force

# Recreate database
npx prisma db push --force-reset
```

---

## Next Steps

- Explore the **API Documentation** in `API.md`
- Read the full **README.md** for detailed architecture
- Check out the **Features** section in the main documentation

---

## Getting Help

- Check the logs: `docker compose logs -f`
- Open Prisma Studio: `npx prisma studio`
- Test the health endpoint: `http://localhost:4000/api/health`

---

<p align="center">Happy Chatting! 💬</p>