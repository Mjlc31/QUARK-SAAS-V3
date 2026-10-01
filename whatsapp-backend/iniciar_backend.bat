@echo off
title Quark Backend — Redirecionando para o Backend Unificado
cd /d "%~dp0\.."
echo =========================================
echo   QUARK OS — Redirecionando para Backend Unificado
echo =========================================
echo.
node backend/server.js
pause
