@echo off
chcp 65001 >nul 2>&1
title ChronosFlow - AI Time Management
cd /d "%~dp0"

echo ============================================================
echo       ChronosFlow (时流) - AI 极简时间感知与认知教练
echo ============================================================
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] 未检测到 Node.js 运行环境！
    echo 请先安装 Node.js: https://nodejs.org/
    pause
    exit /b 1
)

where pnpm >nul 2>&1
if %errorlevel% neq 0 (
    echo [*] 未检测到全局 pnpm，尝试使用 npx pnpm...
    set "RUNNER=npx pnpm"
) else (
    set "RUNNER=pnpm"
)

if not exist "node_modules" (
    echo [*] 检测到初次启动，正在快速安装项目依赖...
    call %RUNNER% install
)

echo [*] 正在启动 ChronosFlow 本地服务...
echo [*] 网页界面将自动在默认浏览器中开启 (http://localhost:1420)
echo [*] 提示：在页面中随时按下 [Alt + Space] 即可呼出极简命令条！
echo ============================================================
echo.

call %RUNNER% run dev --open

if %errorlevel% neq 0 (
    echo.
    echo [!] 服务已停止。
    pause
)