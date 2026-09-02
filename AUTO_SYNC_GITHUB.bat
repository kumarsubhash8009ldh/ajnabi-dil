@echo off
chcp 65001 >nul
echo ===================================================
echo 🚀 AJNABI DIL - GITHUB 1-CLICK AUTO-SYNC
echo ===================================================
echo.

cd /d "%~dp0"

echo [1/4] Checking Git Status...
git status -s

echo.
echo [2/4] Staging all project changes...
git add -A

set COMMIT_MSG=Auto-sync Ajnabi Dil updates: %date% %time%
if not "%~1"=="" (
    set COMMIT_MSG=%~1
)

echo.
echo [3/4] Creating Git Commit: "%COMMIT_MSG%"
git commit -m "%COMMIT_MSG%"

echo.
echo [4/4] Pushing to GitHub (origin main)...
git push origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ===================================================
    echo ✅ SUCCESS! Data & Code successfully synced to GitHub!
    echo 🔗 Repo: https://github.com/kumarsubhash8009ldh/ajnabi-dil
    echo ===================================================
) else (
    echo.
    echo ⚠️ Push encountered an issue. Trying git pull --rebase and retry...
    git pull --rebase origin main
    git push origin main
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo ✅ SUCCESS! Synced to GitHub after rebase!
    ) else (
        echo.
        echo ❌ Push failed. Please check internet connection or Git credentials.
    )
)

echo.
pause
