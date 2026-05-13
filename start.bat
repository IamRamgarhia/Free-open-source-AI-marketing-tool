@echo off
REM AdForge start — launches the local-sync sidecar + Next.js dev server.
REM Reads PORT from .env.local (configured by install.bat).

setlocal EnableDelayedExpansion
cd /d "%~dp0"

REM Make sure node_modules exists
if not exist node_modules (
    echo node_modules missing. Running install first...
    call install.bat
    if errorlevel 1 exit /b 1
)

REM Make sure data folder exists
if not exist data mkdir data

REM Load PORT from .env.local (default 3005)
set "PORT=3005"
set "SYNC_PORT=3006"
if exist .env.local (
    for /f "tokens=2 delims==" %%a in ('findstr /b "PORT=" .env.local 2^>nul') do set "PORT=%%a"
    for /f "tokens=2 delims==" %%a in ('findstr /b "ADFORGE_SYNC_PORT=" .env.local 2^>nul') do set "SYNC_PORT=%%a"
)

REM Record PIDs for stop.bat
del .adforge-pids.txt >nul 2>&1

echo Starting AdForge...
echo.
echo Sidecar:    http://127.0.0.1:!SYNC_PORT!     ^(local data sync to data\snapshot.json^)
echo Web app:    http://localhost:!PORT!           ^(open this in your browser^)
echo             http://adforge.localhost:!PORT!   ^(works in Chrome/Firefox/Safari/Edge, no setup needed^)
echo.

REM Launch sidecar in a new window
start "adforge sync" cmd /c "set ADFORGE_SYNC_PORT=!SYNC_PORT!&& node scripts\local-sync.cjs"

REM Brief pause so sidecar is up before the app probes it
ping -n 2 127.0.0.1 >nul

REM Launch the Next.js dev server in this window
echo Press Ctrl+C in this window or run stop.bat to shut down.
echo.
call npx next dev -p !PORT!
