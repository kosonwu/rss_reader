@echo off
cd /d "%~dp0"

echo Starting Python Fetcher...
start "Distill - Python Fetcher" cmd /k "cd app\fetcher && .venv\Scripts\activate && uvicorn main:app --reload --port 8000"

timeout /t 2 /nobreak >nul

echo Starting Next.js...
start "Distill - Next.js" cmd /k "npm run dev"

echo.
echo Both services are starting:
echo   Next.js  ^> http://localhost:3000
echo   Fetcher  ^> http://localhost:8000
echo.
