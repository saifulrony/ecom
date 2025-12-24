@echo off
REM Windows batch script to run both backend and frontend

echo 🚀 Starting Ecommerce Development Servers
echo.

REM Check if Go is installed
where go >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Go is not installed. Please install Go 1.21+
    pause
    exit /b 1
)

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+
    pause
    exit /b 1
)

REM Start Backend
echo 📦 Starting Go Backend...
cd backend

REM Check if .env exists
if not exist .env (
    if exist .env.example (
        echo ⚠️  .env file not found. Creating from .env.example...
        copy .env.example .env
        echo ✅ Created .env file. Please update it with your database credentials.
    ) else (
        echo ❌ .env.example not found. Please create .env manually.
        pause
        exit /b 1
    )
)

REM Install Go dependencies if needed
if not exist go.sum (
    echo 📥 Installing Go dependencies...
    go mod download
)

REM Start backend in new window
start "Backend Server" cmd /k "go run main.go"

REM Wait a bit for backend to start
timeout /t 3 /nobreak >nul

echo ✅ Backend running on http://localhost:10000
echo.

REM Start Frontend
echo 🎨 Starting Next.js Frontend...
cd ..\frontend

REM Check if node_modules exists
if not exist node_modules (
    echo 📥 Installing Node.js dependencies...
    call npm install
)

REM Check if .env.local exists
if not exist .env.local (
    if exist .env.local.example (
        echo ⚠️  .env.local not found. Creating from .env.local.example...
        copy .env.local.example .env.local
        echo ✅ Created .env.local file.
    )
)

REM Start frontend in new window
start "Frontend Server" cmd /k "npm run dev"

REM Wait a bit for frontend to start
timeout /t 3 /nobreak >nul

echo ✅ Frontend running on http://localhost:10001
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo ✨ Development servers are running!
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo Backend:  http://localhost:10000
echo Frontend: http://localhost:10001
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo Both servers are running in separate windows.
echo Close those windows to stop the servers.
echo.
pause

