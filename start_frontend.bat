@echo off
title AI-HOS Frontend Server (Port 3000)
echo ========================================================
echo   Starting AI-HOS Next.js Frontend Server
echo   App URL: http://localhost:3000
echo ========================================================
cd /d "%~dp0frontend"
if exist ".next" (
  rmdir /s /q .next 2>nul
)
npm run dev
pause
