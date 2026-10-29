@echo off
title ChronosFlow - Create Desktop Shortcut
chcp 65001 >nul 2>&1
cd /d "%~dp0"

echo ============================================================
echo       正在生成 ChronosFlow (时流) 桌面无弹窗快捷方式...
echo ============================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\create_shortcut.ps1"

echo.
echo ============================================================
echo [SUCCESS] 快捷方式已就绪！您可以直接在 Windows 桌面双击启动。
echo ============================================================
echo.
pause
