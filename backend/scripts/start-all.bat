@echo off
REM ========================================
REM   ChatSphere - Start All (Windows)
REM ========================================
echo.
echo ========================================
echo   ChatSphere - Full Stack App
echo ========================================
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed.
    exit /b 1
)

REM Check Docker
where docker >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [WARNING] Docker not found. Using local PostgreSQL.
    echo Please ensure PostgreSQL is running on localhost:5432
    echo.
    goto :skip_docker
)

REM Start PostgreSQL with Docker
echo [INFO] Starting PostgreSQL container...
docker compose up -d postgres
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to start PostgreSQL.
    exit /b 1
)

echo [INFO] Waiting for PostgreSQL to be ready...
timeout /t 8 /nobreak >nul

:skip_docker

REM Install backend deps if needed
if not exist node_modules (
    echo [INFO] Installing backend dependencies...
    call npm install
)

REM Install frontend deps if needed
if not exist frontend\node_modules (
    echo [INFO] Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

REM Generate Prisma client
echo [INFO] Generating Prisma client...
call npm run prisma:generate

REM Run migrations
echo [INFO] Running database migrations...
call npm run prisma:migrate:deploy

echo.
echo [INFO] Starting servers...
echo   Backend:  http://localhost:4000
echo   Frontend: http://localhost:5173
echo.

start "ChatSphere Backend" cmd /k "npm run dev"
timeout /t 3 /nobreak >nul
cd frontend
start "ChatSphere Frontend" cmd /k "npm run dev"
cd ..

echo.
echo [SUCCESS] Both servers started!
echo.
echo   Backend:  http://localhost:4000
echo   Frontend: http://localhost:5173
echo   Health:   http://localhost:4000/api/health
echo.
pause
