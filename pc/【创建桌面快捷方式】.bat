@echo off
chcp 65001 >nul 2>&1
title ChronosFlow - 创建桌面快捷方式
cd /d "%~dp0"

echo ============================================================
echo       正在生成 ChronosFlow (时流) 桌面专属快捷方式...
echo ============================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\create_shortcut.ps1"

echo.
echo ============================================================
echo [完成] 快捷方式已就绪！您可以直接在 Windows 桌面双击启动。
echo ============================================================
echo.
pause