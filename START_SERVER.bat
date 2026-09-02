@echo off
title Ajnabi Dil Server & APK Download Engine
color 0D
cls
echo ========================================================
echo        Ajnabi Dil (अजनबी दिल) - Live Server Engine
echo ========================================================
echo.
cd /d "%~dp0backend"

echo [1/2] Checking Server Environment...
if not exist "%~dp0frontend\dist\index.html" (
    echo [Building Frontend Web App...]
    cd /d "%~dp0frontend"
    call npm.cmd run build
    cd /d "%~dp0backend"
)

echo.
echo [2/2] Starting Realtime Server & Public Tunnel...
echo.
echo Server URLs will appear below once initialized:
echo.
node server.js
pause
