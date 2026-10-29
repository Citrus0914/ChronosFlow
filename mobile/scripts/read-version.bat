@echo off
set "APP_VERSION="
for /f "tokens=3" %%V in ('findstr /C:"versionName = " "%~dp0..\android\app\build.gradle.kts"') do set "APP_VERSION=%%~V"
if not defined APP_VERSION (
  set "APP_VERSION=1.0.0"
)
exit /b 0
