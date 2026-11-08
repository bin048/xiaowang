@echo off
chcp 65001 >nul
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (py -3 "采集验收证据.py" queued) else (python "采集验收证据.py" queued)
pause
