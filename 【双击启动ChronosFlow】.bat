@echo off
title ChronosFlow (时流) - AI 极简时间管理
chcp 65001 >nul 2>&1
cd /d "%~dp0"

echo ============================================================
echo       ⏳ ChronosFlow (时流) - AI 极简时间感知与认知教练
echo ============================================================
echo.

:: 1. 检查 Node.js 环境
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] 未检测到 Node.js 运行环境！
    echo ------------------------------------------------------------
    echo 请先安装 Node.js (推荐 v18 或更高版本):
    echo 官方下载: https://nodejs.org/
    echo ------------------------------------------------------------
    pause
    exit /b 1
)

:: 2. 检查 pnpm 环境
where pnpm >nul 2>&1
if %errorlevel% neq 0 (
    echo [*] 未检测到全局 pnpm，尝试使用 npx pnpm 启动...
    set "RUNNER=npx pnpm"
) else (
    set "RUNNER=pnpm"
)

:: 3. 检查依赖包完整性
if not exist "node_modules" (
    echo [*] 检测到初次启动，正在快速安装项目依赖...
    %RUNNER% install
)

:: 4. 启动本地服务并在浏览器中自动打开
echo [*] 正在启动 ChronosFlow 本地服务...
echo [*] 网页界面将自动在默认浏览器中开启 (http://localhost:1420)
echo [*] 提示：在页面中随时按下 [Alt + Space] 即可呼出极简命令条！
echo ============================================================
echo.

%RUNNER% run dev --open

if %errorlevel% neq 0 (
    echo.
    echo [!] 服务已停止。
    pause
)
