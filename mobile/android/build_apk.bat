@echo off
setlocal
chcp 65001 >nul 2>&1
cd /d "%~dp0"
call "%~dp0..\scripts\read-version.bat"
if errorlevel 1 goto FAIL

echo ============================================================
echo       ChronosFlow (时流) - 安卓独立 APK 自动化构建
echo ============================================================
echo.
echo [*] 当前构建版本: v%APP_VERSION%

echo [1/3] 正在编译前端移动端资产 (React 19 + TypeScript)...
pushd "%~dp0.."
call pnpm.cmd run build
popd
if errorlevel 1 goto FAIL

echo.
echo [2/3] 正在配置安卓构建环境...
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
  echo [ERROR] 未找到 Gradle 构建器: %GRADLE%
  goto FAIL
)

echo.
echo [3/3] 正在调用 Gradle 编译原生 APK...
call "%GRADLE%" --no-daemon :app:assembleDebug
if errorlevel 1 goto FAIL

if not exist "%~dp0..\dist" mkdir "%~dp0..\dist"
copy /Y "%~dp0app\build\outputs\apk\debug\app-debug.apk" "%~dp0..\dist\ChronosFlow_v%APP_VERSION%_debug.apk" >nul
if errorlevel 1 goto FAIL
copy /Y "%~dp0app\build\outputs\apk\debug\app-debug.apk" "%~dp0..\dist\ChronosFlow_debug.apk" >nul
if errorlevel 1 goto FAIL

echo.
echo ============================================================
echo [SUCCESS] ChronosFlow 安卓独立 APK 已成功生成！
echo ============================================================
echo 安装包路径: %~dp0..\dist\ChronosFlow_v%APP_VERSION%_debug.apk
echo 提示: 您可以直接双击运行【一键安装到手机.bat】自动将此包安装至手机！
echo ============================================================
echo.
if /I not "%~1"=="--no-pause" pause
exit /b 0

:FAIL
echo.
echo [ERROR] APK 构建遇到错误，请检查控制台日志。
if /I not "%~1"=="--no-pause" pause
exit /b 1
