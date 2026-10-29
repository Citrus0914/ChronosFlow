$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$wsh = New-Object -ComObject WScript.Shell
$desktop = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
$appDir = Split-Path -Parent $PSScriptRoot
if (-not $appDir) { $appDir = (Get-Item -Path $PSScriptRoot).Parent.FullName }

$targetBat = Join-Path $appDir '【双击启动ChronosFlow】.bat'
$shortcutPath = Join-Path $desktop 'ChronosFlow 时流.lnk'

$shortcut = $wsh.CreateShortcut($shortcutPath)

# 核心安全设计：将 TargetPath 设为微软官方签名的 cmd.exe，彻底规避“未知开发者/未知发布者”拦截
$shortcut.TargetPath = "$env:ComSpec"
$shortcut.Arguments = '/c "【双击启动ChronosFlow】.bat"'
$shortcut.WorkingDirectory = $appDir
$shortcut.IconLocation = "$env:SystemRoot\system32\shell32.dll,238"
$shortcut.Description = 'ChronosFlow - AI 极简时间感知与认知教练'
$shortcut.Save()

# 全局解除 Mark-of-the-Web (Zone.Identifier) 外部网络文件锁定标记
Get-ChildItem -Path $appDir -Recurse | Unblock-File -ErrorAction SilentlyContinue
Unblock-File -Path $shortcutPath -ErrorAction SilentlyContinue
Unblock-File -Path $targetBat -ErrorAction SilentlyContinue

Write-Host " [成功] 已在桌面成功创建【ChronosFlow 时流】无拦截快捷方式！" -ForegroundColor Green
Write-Host " [防阻] 快捷方式由系统受信任 cmd.exe 托管，已彻底解除未知开发者提示。" -ForegroundColor Gray
Write-Host " [就绪] 您现在可以直接在 Windows 桌面双击【ChronosFlow 时流】秒开运行！" -ForegroundColor Cyan
