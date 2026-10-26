@echo off
title CareerBridge - Frontend Server (Vite React)
cd /d "%~dp0frontend"
echo ========================================================
echo       Starting CareerBridge Frontend (Vite)
echo ========================================================
echo Starting Vite dev server on http://127.0.0.1:5173 ...
npm run dev -- --host 127.0.0.1 --port 5173
pause
