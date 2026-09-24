@echo off
setlocal
cd /d "%~dp0"
where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install Node.js 22.12 or newer, then try again.
  pause
  exit /b 1
)
if not exist node_modules (
  call npm.cmd ci
  if errorlevel 1 goto :error
)
call npm.cmd run build
if errorlevel 1 goto :error
echo.
echo PaSiBudget is opening at http://127.0.0.1:4173
echo Keep this window open. Press Ctrl+C when finished.
call npm.cmd run preview -- --open
if errorlevel 1 goto :error
exit /b 0
:error
echo.
echo PaSiBudget could not start. Read the message above.
echo If port 4173 is already in use, open http://127.0.0.1:4173 in your browser.
pause
exit /b 1
