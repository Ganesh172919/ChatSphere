@echo off
REM ChatSphere - Development Start Script for Windows
REM This script starts both backend and frontend in development mode

echo ========================================
echo   ChatSphere Development Environment
echo ========================================
echo.

REM Check if .env exists
if not exist .env (
    echo [WARNING] .env file not found. Copying from .env.example...
    copy .env.example .env
    echo [INFO] Please update .env with your configuration
    echo.
)

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 22+
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo [INFO] Node.js version: %NODE_VERSION%

REM Install backend dependencies if needed
if not exist node_modules (
    echo [INFO] Installing backend dependencies...
    call npm install
)

REM Install frontend dependencies if needed
if not exist frontend\node_modules (
    echo [INFO] Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

REM Generate Prisma client
echo [INFO] Generating Prisma client...
call npm run prisma:generate

echo.
echo [INFO] Starting development servers...
echo [INFO] Backend will run on http://localhost:3000
echo [INFO] Frontend will run on http://localhost:5173
echo.
echo Press Ctrl+C to stop all servers
echo.

REM Start both servers
start "ChatSphere Backend" cmd /c "npm run dev"
cd frontend
start "ChatSphere Frontend" cmd /c "npm run dev"
cd ..

echo.
echo [SUCCESS] Development servers started!
echo.
echo   Backend:  http://localhost:3000
echo   Frontend: http://localhost:5173
echo   API Docs: http://localhost:3000/api/health
echo.
pause
