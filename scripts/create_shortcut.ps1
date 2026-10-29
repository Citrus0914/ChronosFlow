$wsh = New-Object -ComObject WScript.Shell
$desktop = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
$appDir = Split-Path -Parent $PSScriptRoot
if (-not $appDir) { $appDir = (Get-Item -Path $PSScriptRoot).Parent.FullName }
$shortcutPath = Join-Path $desktop 'ChronosFlow 时流.lnk'
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "cmd.exe"
$shortcut.Arguments = "/c `"`"$appDir\【双击启动ChronosFlow】.bat`"`""
$shortcut.WorkingDirectory = $appDir
$shortcut.Description = 'ChronosFlow - AI 极简时间管理应用'
$shortcut.Save()

# 解除网络标记防御
Get-ChildItem -Path $appDir -Recurse | Unblock-File -ErrorAction SilentlyContinue

Write-Host ' [成功] 已在桌面成功创建【ChronosFlow 时流】无拦截快捷方式！' -ForegroundColor Green
Write-Host ' [提示] 通过桌面快捷方式启动由系统 cmd 托管，无 SmartScreen 弹窗与卡顿。' -ForegroundColor Cyan
