@echo off
title CareerBridge - Backend Server (FastAPI)
cd /d "%~dp0backend"
echo ========================================================
echo       Starting CareerBridge Backend (FastAPI)
echo ========================================================
echo Activating virtual environment...
call venv\Scripts\activate.bat
echo Starting Uvicorn on http://127.0.0.1:8050 ...
python -m uvicorn app.main:app --host 127.0.0.1 --port 8050 --reload
pause
