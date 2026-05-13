@echo off
REM AdForge — add or remove the  adforge.local  hosts entry.
REM RIGHT-CLICK THIS FILE AND "Run as administrator" — otherwise it cannot edit
REM C:\Windows\System32\drivers\etc\hosts.
REM
REM Usage:
REM   set-domain.bat          ← adds the entry (default)
REM   set-domain.bat remove   ← removes the entry

setlocal EnableDelayedExpansion
set "HOSTS=%WINDIR%\System32\drivers\etc\hosts"
set "ENTRY=127.0.0.1   adforge.local   # AdForge local"

REM Admin check
net session >nul 2>&1
if errorlevel 1 (
    echo.
    echo  [ERROR] This script needs Administrator privileges to edit the hosts file.
    echo.
    echo  Close this window, RIGHT-CLICK  set-domain.bat,  then choose
    echo  "Run as administrator".
    echo.
    pause
    exit /b 1
)

if /i "%~1"=="remove" goto REMOVE

REM ADD
findstr /c:"adforge.local" "%HOSTS%" >nul 2>&1
if not errorlevel 1 (
    echo.
    echo  adforge.local is ALREADY in your hosts file. Nothing to do.
    echo.
    pause
    exit /b 0
)

echo.>>"%HOSTS%"
echo %ENTRY%>>"%HOSTS%"
echo.
echo  Added:  %ENTRY%
echo.
echo  Now run AdForge on port 80 to use  http://adforge.local/
echo  Edit .env.local and set  PORT=80,  then run start.bat as administrator.
echo.
echo  Or keep your current port and use  http://adforge.local:!PORT!/
echo.
pause
exit /b 0

:REMOVE
findstr /v "adforge.local" "%HOSTS%" > "%HOSTS%.tmp"
move /y "%HOSTS%.tmp" "%HOSTS%" >nul
echo.
echo  Removed adforge.local from your hosts file.
echo.
pause
exit /b 0
