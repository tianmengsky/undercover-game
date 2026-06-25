@echo off
chcp 65001 >nul

start "Backend" cmd /c "cd /d %~dp0server && npm run dev"

start "Frontend" cmd /c "cd /d %~dp0client && npm run dev"

echo.
timeout /t 1 /nobreak >nul

start "" http://localhost:4173

exit
