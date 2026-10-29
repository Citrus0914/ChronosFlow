@echo off
title ChronosFlow 手机版 - 打包APK
chcp 65001 >nul 2>&1
cd /d "%~dp0"
call "%~dp0android\build_apk.bat" %*
