@echo off
title ChronosFlow Mobile - Web Preview
chcp 65001 >nul 2>&1
cd /d "%~dp0"

echo ============================================================
echo       ChronosFlow (??) - ??? PC ???????
echo ============================================================
echo.
echo [*] ????????...
echo [*] ?????????? (http://localhost:5173)
echo [*] ???????????? [F12] ????????? (? iPhone 14 / Pixel 7)
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
  echo [!] ??????
  pause
)