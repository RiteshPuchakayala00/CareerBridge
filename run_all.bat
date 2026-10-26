@echo off
title CareerBridge Launcher
echo ========================================================
echo       Launching CareerBridge Full Stack System
echo ========================================================
echo Starting Backend (FastAPI on Port 8050)...
start "CareerBridge Backend" "%~dp0run_backend.bat"

echo Starting Frontend (Vite on Port 5173)...
start "CareerBridge Frontend" "%~dp0run_frontend.bat"

echo.
echo Both servers are launching in separate windows!
echo - Frontend: http://127.0.0.1:5173/login
echo - Backend Docs: http://127.0.0.1:8050/docs
echo ========================================================
timeout /t 5
