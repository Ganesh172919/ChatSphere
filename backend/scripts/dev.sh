#!/bin/bash
# ChatSphere - Development Start Script for Unix/Mac
# This script starts both backend and frontend in development mode

set -e

echo "========================================"
echo "  ChatSphere Development Environment"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}[WARNING]${NC} .env file not found. Copying from .env.example..."
    cp .env.example .env
    echo -e "${BLUE}[INFO]${NC} Please update .env with your configuration"
    echo ""
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} Node.js is not installed. Please install Node.js 22+"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${BLUE}[INFO]${NC} Node.js version: $NODE_VERSION"

# Install backend dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}[INFO]${NC} Installing backend dependencies..."
    npm install
fi

# Install frontend dependencies if needed
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${BLUE}[INFO]${NC} Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
fi

# Generate Prisma client
echo -e "${BLUE}[INFO]${NC} Generating Prisma client..."
npm run prisma:generate

echo ""
echo -e "${BLUE}[INFO]${NC} Starting development servers..."
echo -e "${BLUE}[INFO]${NC} Backend will run on http://localhost:3000"
echo -e "${BLUE}[INFO]${NC} Frontend will run on http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}[INFO]${NC} Shutting down servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend
npm run dev &
BACKEND_PID=$!

# Start frontend
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo -e "${GREEN}[SUCCESS]${NC} Development servers started!"
echo ""
echo "  Backend:  http://localhost:3000"
echo "  Frontend: http://localhost:5173"
echo "  API Docs: http://localhost:3000/api/health"
echo ""

# Wait for processes
wait
