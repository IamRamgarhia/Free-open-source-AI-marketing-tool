@echo off
REM AdForge desktop launcher (Windows).
REM
REM Double-click this file to launch AdForge. On every launch we:
REM   1. Inspect any AdForge sidecar already running on the configured port.
REM      If it's THIS install's current sidecar  → reuse, open browser.
REM      If it's THIS install's stale sidecar    → kill, restart on same port.
REM      If it's ANOTHER install's sidecar       → shift to a free port pair.
REM      If port is bound by something unrelated → shift to a free port pair.
REM      If port is free                         → start fresh.
REM   2. On first run, install deps + write default .env.local + create Desktop shortcut.
REM   3. Spawn sidecar hidden (PowerShell Start-Process -WindowStyle Hidden).
REM   4. Wait for /health, open browser to the launcher.
REM
REM Two AdForge installs in different folders never fight over port 3006 —
REM the second one detects the first and auto-shifts to the next free pair.

setlocal EnableDelayedExpansion
cd /d "%~dp0"

REM --- Sanity: Node ---
where node >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] Node.js is not installed.
    echo   Install from https://nodejs.org/en/download then double-click AdForge again.
    echo.
    pause
    exit /b 1
)

REM --- First-run setup (inline; no separate install.bat) ---
if not exist node_modules (
    echo.
    echo ==================================================
    echo  First run - installing dependencies
    echo ==================================================
    call npm install --no-audit --no-fund
    if errorlevel 1 (
        echo.
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
)
REM .env.local is NOT seeded here — the port resolver below detects first-run
REM (no .env.local) and asks the OS for ports the kernel just confirmed are
REM free. That avoids the 3000-range collision storm entirely.
if not exist data mkdir data

REM Desktop shortcut on first run
powershell -NoProfile -Command ^
  "$d = [Environment]::GetFolderPath('Desktop');" ^
  "$lnk = Join-Path $d 'AdForge.lnk';" ^
  "if (-not (Test-Path $lnk)) {" ^
  "  $t = Join-Path '%CD%' 'AdForge.bat';" ^
  "  $s = (New-Object -ComObject WScript.Shell).CreateShortcut($lnk);" ^
  "  $s.TargetPath = $t; $s.WorkingDirectory = '%CD%';" ^
  "  $s.Description = 'Launch AdForge'; $s.WindowStyle = 7; $s.Save();" ^
  "}" 2>nul

REM --- Resolve ports (handles multi-install conflicts) ---
echo Checking for port conflicts...
set "ACTION="
set "PORT="
set "SYNC="
set "REASON="
for /f "tokens=1,2,3,4 delims= " %%a in ('node scripts\resolve-ports.cjs 2^>nul') do (
    for /f "tokens=1,2 delims==" %%x in ("%%a") do if "%%x"=="ACTION" set "ACTION=%%y"
    for /f "tokens=1,2 delims==" %%x in ("%%b") do if "%%x"=="PORT"   set "PORT=%%y"
    for /f "tokens=1,2 delims==" %%x in ("%%c") do if "%%x"=="SYNC"   set "SYNC=%%y"
    for /f "tokens=1,2 delims==" %%x in ("%%d") do if "%%x"=="REASON" set "REASON=%%y"
)

if "!ACTION!"=="" (
    echo [ERROR] Port resolver failed to run.
    pause
    exit /b 1
)
if "!ACTION!"=="error" (
    echo [ERROR] Port resolver: !REASON!
    pause
    exit /b 1
)

if "!ACTION!"=="reuse" (
    echo Sidecar already running on :!SYNC! for this install. Opening browser...
    start "" "http://127.0.0.1:!SYNC!/"
    exit /b 0
)

if "!ACTION!"=="restart_stale" (
    echo Stale sidecar on :!SYNC! - asking it to quit before starting fresh...
    powershell -NoProfile -Command ^
      "try { Invoke-WebRequest -UseBasicParsing -Method POST -TimeoutSec 3 -Uri 'http://127.0.0.1:!SYNC!/quit' | Out-Null } catch {}" >nul 2>&1
    powershell -NoProfile -Command "Start-Sleep -Milliseconds 1500" >nul 2>&1
)

if "!ACTION!"=="shifted" (
    echo.
    echo  Default ports were taken by another AdForge install or process.
    echo  This install will use:  web=!PORT!  sync=!SYNC!
    echo  Saved to .env.local so future launches reuse these.
    echo.
)

REM --- Spawn sidecar detached + hidden ---
echo Starting AdForge sidecar on :!SYNC!...
powershell -NoProfile -Command ^
  "$env:ADFORGE_SYNC_PORT='!SYNC!'; $env:PORT='!PORT!';" ^
  "Start-Process -FilePath 'node' -ArgumentList 'scripts\local-sync.cjs' -WorkingDirectory (Get-Location) -WindowStyle Hidden"
if errorlevel 1 (
    echo [ERROR] Failed to launch the sidecar. Try scripts\start.bat for a visible log.
    pause
    exit /b 1
)

REM --- Wait for /health on the resolved port ---
set /a TRIES=0
:wait
set /a TRIES+=1
powershell -NoProfile -Command ^
  "try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 -Uri 'http://127.0.0.1:!SYNC!/health' | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 goto :ready
if !TRIES! GEQ 30 goto :fail
powershell -NoProfile -Command "Start-Sleep -Milliseconds 750" >nul 2>&1
goto :wait

:ready
start "" "http://127.0.0.1:!SYNC!/"
exit /b 0

:fail
echo.
echo [ERROR] Sidecar did not respond on :!SYNC! within 30 seconds.
echo   Run scripts\start.bat in a normal window to see the actual log output.
echo.
pause
exit /b 1
