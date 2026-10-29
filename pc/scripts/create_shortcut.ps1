$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$wsh = New-Object -ComObject WScript.Shell
$desktop = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
$appDir = Split-Path -Parent $PSScriptRoot
if (-not $appDir) { $appDir = (Get-Item -Path $PSScriptRoot).Parent.FullName }

$targetBat = Join-Path $appDir '【双击启动ChronosFlow】.bat'
$shortcutPath = Join-Path $desktop 'ChronosFlow 时流.lnk'

$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $targetBat
$shortcut.WorkingDirectory = $appDir
$shortcut.IconLocation = "$env:SystemRoot\system32\shell32.dll,238"
$shortcut.Description = 'ChronosFlow - AI 极简时间管理应用'
$shortcut.Save()

# 解除网络标记防御
Get-ChildItem -Path $appDir -Recurse | Unblock-File -ErrorAction SilentlyContinue

Write-Host " [成功] 已在桌面成功创建【ChronosFlow 时流】快捷方式！" -ForegroundColor Green
Write-Host " [目标] $targetBat" -ForegroundColor Gray
Write-Host " [就绪] 您可以直接在 Windows 桌面双击【ChronosFlow 时流】图标运行。" -ForegroundColor Cyan
