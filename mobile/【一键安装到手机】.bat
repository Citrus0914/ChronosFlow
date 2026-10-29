@echo off
setlocal EnableExtensions EnableDelayedExpansion
title ChronosFlow 手机版 - 一键安装到手机
chcp 65001 >nul
cd /d "%~dp0"

:: 自动查找 ADB 工具
set "ADB="
if exist "F:\AI Agent\ai_stock_tool\Mobile\.build-tools\android-sdk\platform-tools\adb.exe" (
  set "ADB=F:\AI Agent\ai_stock_tool\Mobile\.build-tools\android-sdk\platform-tools\adb.exe"
) else if exist "C:\Users\Citrus\AppData\Local\Android\Sdk\platform-tools\adb.exe" (
  set "ADB=C:\Users\Citrus\AppData\Local\Android\Sdk\platform-tools\adb.exe"
) else (
  where adb >nul 2>&1
  if !errorlevel! equ 0 set "ADB=adb"
)

call "%~dp0scripts\read-version.bat"
if errorlevel 1 (
  pause
  exit /b 1
)

set "APK=%~dp0dist\ChronosFlow_v%APP_VERSION%_debug.apk"
if not exist "%APK%" (
  set "APK=%~dp0dist\ChronosFlow_debug.apk"
)

set "PACKAGE=com.chronosflow.app"
set "ACTIVITY=com.chronosflow.app/.MainActivity"
set "DEVICES_FILE=%TEMP%\chronosflow_adb_devices.txt"

echo ============================================================
echo       ChronosFlow (时流) - 一键安装到手机
echo ============================================================
echo.

if not defined ADB (
  echo [ERROR] 未找到 ADB 工具！
  echo 请确认已安装 Android SDK platform-tools，或手动将 dist 目录下的 APK 发送到手机安装。
  pause
  exit /b 1
)

if not exist "%APK%" (
  echo [*] 未检测到已构建的 APK 安装包: v%APP_VERSION%
  echo [*] 正在自动为您调用【打包APK.bat】进行实时构建...
  echo.
  call "%~dp0android\build_apk.bat" --no-pause
  if errorlevel 1 (
    echo [ERROR] 自动构建 APK 失败，安装中止。
    pause
    exit /b 1
  )
)

echo [*] 即将安装版本: v%APP_VERSION%
echo [*] 安装包路径: %APK%
echo.

echo [1/4] 正在启动 ADB 服务...
"%ADB%" start-server >nul 2>&1

:WAIT_DEVICE
set "SERIAL="
set "UNAUTHORIZED="
set "OFFLINE="

echo [2/4] 正在检测已连接的安卓设备...
"%ADB%" devices > "%DEVICES_FILE%" 2>&1

for /f "usebackq skip=1 tokens=1,2" %%A in ("%DEVICES_FILE%") do (
  if /I "%%B"=="device" if not defined SERIAL set "SERIAL=%%A"
  if /I "%%B"=="unauthorized" set "UNAUTHORIZED=1"
  if /I "%%B"=="offline" set "OFFLINE=1"
)

if not defined SERIAL (
  echo.
  echo [未检测到可用手机设备]
  if defined UNAUTHORIZED echo [*] 检测到未授权设备：请在手机屏幕上勾选“始终允许”并点击确定允许 USB 调试。
  if defined OFFLINE echo [*] 设备状态为 offline：请重新插拔 USB 数据线或重启手机。
  echo.
  echo 排查建议：
  echo   1. 确认手机已通过 USB 数据线连接到本台电脑
  echo   2. 手机开启【开发者选项】并开启【USB 调试】与【允许通过 USB 安装应用】
  echo   3. USB 连接模式选择“传输文件”或“MTP”
  echo   4. 检查手机屏幕是否弹出 USB 调试授权弹窗
  echo.
  set /p "RETRY=按回车重试检测，或输入 Q 退出："
  if /I "!RETRY!"=="Q" exit /b 1
  echo.
  goto WAIT_DEVICE
)

echo [*] 已成功连接目标安卓设备: %SERIAL%
echo.
echo [3/4] 正在向手机传输并安装当前版本 APK...
"%ADB%" -s "%SERIAL%" install -r "%APK%"
if errorlevel 1 (
  echo.
  echo [ERROR] 安装失败！
  echo 可能原因：
  echo   1. 手机屏幕弹出了“允许通过 USB 安装应用”安全拦截提示，未点击允许；
  echo   2. 手机存储空间不足。
  echo 请在手机屏幕上确认允许，然后重试。
  pause
  exit /b 1
)

echo.
echo [4/4] 正在启动 ChronosFlow 手机版...
"%ADB%" -s "%SERIAL%" shell am start -n "%ACTIVITY%" >nul 2>&1

echo.
echo ============================================================
echo [SUCCESS] 安装并拉起成功！
echo ============================================================
echo 应用包名：%PACKAGE%
echo 核心活动：%ACTIVITY%
echo 提示：首次进入请在界面中点击【前往开启权限】以启用应用时长感知！
echo ============================================================
echo.
pause
