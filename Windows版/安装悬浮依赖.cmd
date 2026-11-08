@echo off
chcp 65001 >nul
cd /d "%~dp0Electron悬浮入口"
call npm ci
if errorlevel 1 goto fail
node node_modules\electron\install.js
if errorlevel 1 goto fail
echo 依赖准备完成，可返回双击“一键启动.cmd”。
pause
exit /b 0
:fail
echo 依赖准备失败，请检查Node版本及下载网络。没有安装系统服务。
pause
exit /b 1
