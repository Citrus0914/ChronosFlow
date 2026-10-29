@echo off
title ChronosFlow 手机版 - 浏览器仿真预览
chcp 65001 >nul 2>&1
cd /d "%~dp0"

echo ============================================================
echo       ChronosFlow (时流) - 手机版 PC 浏览器仿真预览
echo ============================================================
echo.
echo [*] 正在启动本地服务...
echo [*] 将自动在默认浏览器中打开 (http://localhost:5173)
echo [*] 提示：建议在浏览器中按下 [F12] 切换为手机设备视口 (如 iPhone / Pixel)
echo ============================================================
echo.

where pnpm >nul 2>&1
if %errorlevel% equ 0 (
  call pnpm run dev --open
) else (
  call npm run dev --open
)

if %errorlevel% neq 0 (
  echo.
  echo [!] 服务已停止。
  pause
)
