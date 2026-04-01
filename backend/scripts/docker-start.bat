@echo off
REM ========================================
REM   ChatSphere - Docker Start (Windows)
REM ========================================
echo.
echo ========================================
echo   ChatSphere - Docker Compose
echo ========================================
echo.

REM Check Docker
where docker >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker is not installed.
    exit /b 1
)

echo [INFO] Building and starting containers...
echo.
echo   Frontend: http://localhost
echo   Backend:  http://localhost:4000
echo   Database: localhost:5432
echo.

docker compose up --build -d

echo.
echo [SUCCESS] Containers started!
echo.
echo To stop: docker compose down
echo To view logs: docker compose logs -f
echo.
pause
