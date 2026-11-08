@echo off
chcp 65001 >nul
cd /d "%~dp0.."
if not exist "Windows验收工具\待回传证据" mkdir "Windows验收工具\待回传证据"
where py >nul 2>nul
if %errorlevel%==0 (set "XW_TEST_PYTHON=py -3") else (set "XW_TEST_PYTHON=python")
%XW_TEST_PYTHON% "测试\test_sqlite_resources.py" > "Windows验收工具\待回传证据\SQLite资源真机测试.log" 2>&1
if errorlevel 1 goto fail
%XW_TEST_PYTHON% "测试\test_service.py" > "Windows验收工具\待回传证据\服务协议真机测试.log" 2>&1
if errorlevel 1 goto fail
node "测试\outbox-recovery.cjs" > "Windows验收工具\待回传证据\入口恢复真机测试.log" 2>&1
if errorlevel 1 goto fail
echo 自动接口与资源检查通过。桌面操作、拖拽、H5与浏览器迁移仍需按验收单实际操作。
pause
exit /b 0
:fail
echo 自动检查失败。请保留待回传证据目录内日志，不标记整体通过。
pause
exit /b 1
