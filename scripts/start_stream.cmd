@echo off
rem Starts GTA 6 HQ for a live stream. Leave this window open while you are live.
rem In OBS add a Browser source, 1920 x 1080, with the address printed below.
title GTA 6 HQ stream mode
set "APP=%~dp0..\target\release\gta6-hq.exe"
if not exist "%APP%" set "APP=%LOCALAPPDATA%\Programs\GTA6HQ\gta6-hq.exe"
if not exist "%APP%" goto missing
echo GTA 6 HQ stream mode is running.
echo OBS Browser source address:  http://127.0.0.1:4747/?stream^=1
echo Close this window to stop.
"%APP%" --serve --port 4747
goto :eof
:missing
echo GTA 6 HQ was not found. Install it or build it first.
pause
