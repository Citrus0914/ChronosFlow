@echo off
setlocal
cd /d "%~dp0"
call "%~dp0..\scripts\read-version.bat"
if errorlevel 1 goto FAIL

echo [1/3] Building frontend assets...
pushd "%~dp0.."
call pnpm.cmd run build
popd
if errorlevel 1 goto FAIL

echo [2/3] Setting up build environment...
set "TOOLS=F:\AI Agent\ai_stock_tool\Mobile\.build-tools"
set "ANDROID_HOME=%TOOLS%\android-sdk"
if not exist "%ANDROID_HOME%" set "ANDROID_HOME=C:\Users\Citrus\AppData\Local\Android\Sdk"
set "ANDROID_SDK_ROOT=%ANDROID_HOME%"
set "GRADLE_USER_HOME=%TOOLS%\gradle-home"
set "TEMP=%TOOLS%\tmp"
set "TMP=%TEMP%"
if not defined JAVA_HOME set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot"
set "GRADLE=%TOOLS%\gradle-8.9\bin\gradle.bat"

if not exist "%GRADLE%" (
  echo Portable Gradle was not found: %GRADLE%
  goto FAIL
)

echo [3/3] Compiling Android APK with Gradle...
call "%GRADLE%" --no-daemon :app:assembleDebug
if errorlevel 1 goto FAIL

if not exist "%~dp0..\dist" mkdir "%~dp0..\dist"
copy /Y "%~dp0app\build\outputs\apk\debug\app-debug.apk" "%~dp0..\dist\ChronosFlow_v%APP_VERSION%_debug.apk" >nul
if errorlevel 1 goto FAIL
copy /Y "%~dp0app\build\outputs\apk\debug\app-debug.apk" "%~dp0..\dist\ChronosFlow_debug.apk" >nul
if errorlevel 1 goto FAIL

echo.
echo ============================================================
echo [SUCCESS] ChronosFlow Android APK built successfully:
echo %~dp0..\dist\ChronosFlow_v%APP_VERSION%_debug.apk
echo ============================================================
echo.
if /I not "%~1"=="--no-pause" pause
exit /b 0

:FAIL
echo [ERROR] APK build failed.
if /I not "%~1"=="--no-pause" pause
exit /b 1