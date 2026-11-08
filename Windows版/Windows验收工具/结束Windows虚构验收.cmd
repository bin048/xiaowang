@echo off
chcp 65001 >nul
cd /d "%~dp0.."
where py >nul 2>nul
if %errorlevel%==0 (py -3 "启动联动.py" --data-dir "%~dp0运行数据" --stop) else (python "启动联动.py" --data-dir "%~dp0运行数据" --stop)
if errorlevel 1 pause
