@echo off
title ChronosFlow Mobile - Build APK
chcp 65001 >nul 2>&1
cd /d "%~dp0"
call "%~dp0android\build_apk.bat" %*