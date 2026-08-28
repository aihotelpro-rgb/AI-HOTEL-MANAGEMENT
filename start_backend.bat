@echo off
title AI-HOS Backend Server (Port 8000)
echo ========================================================
echo   Starting AI-HOS FastAPI Backend Server
echo   API Swagger Docs: http://localhost:8000/docs
echo ========================================================
cd /d "%~dp0backend"
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
pause
