# 💻 ChronosFlow（时流）PC 桌面版未完成功能与待修复清单

> **归档路径**：`pc/document/ChronosFlow_PC版未完成功能检查报告.md`  
> **检查日期**：2026-10-29

---

## 一、核心业务视图未完成项（共 2 项）

### 1. 时间块卡片的“点击编辑 / 修改详情”功能（未做）
- **现状说明**：
  - 在 `pc/document/ChronosFlow完整功能与使用说明书.md`（第 112 行、第 123 行、第 275 行）中已规划并描述了：*“支持点击编辑图标修改详情”、“点击任意时间流卡片编辑图标，弹出模态框修改卡片的时间、目标分类或心得”*；
  - 但在实际代码 `pc/src/components/TimelineView.tsx`（第 448-455 行）与 `AnalyticsView.tsx` 中，时间块卡片右侧**仅实现了删除按钮（`Trash2`），尚未实现编辑按钮**；
  - `pc/src/store/useTimeStore.ts` 中也缺少 `updateActivity(id, updates)` 方法，`ManualEntryModal.tsx` 仅支持“新增补录”，尚未支持传入已有 `Activity` 进行回填编辑。

### 2. 本地数据导出与导入备份功能（未做）
- **现状说明**：
  - 目前所有时间块记录、分类周预算、专属目标项目与 AI 复盘缓存均存储在浏览器 `localStorage` 中；
  - `SettingsView.tsx` 目前仅有【载入 35 天演示数据】与【清空所有记录】两个按钮，缺少 **【导出 JSON / CSV 备份】** 与 **【导入备份文件恢复】** 功能，暂无法跨设备迁移或本地留档备份。

---

## 二、早期设计白皮书规划但尚未落地的桌面端原生壳层（共 3 项）

对照 `pc/document/ChronosFlow设计白皮书.md` 中的 MVP 路线图，目前 PC 版以纯 Web 应用 + Windows 批处理启动脚本（`.bat`）形态运行，以下原生桌面特性尚未接入：

### 1. Tauri v2 (Rust) 原生桌面客户端封装（未做）
- **现状说明**：
  - `pc/` 目录下尚未初始化 `src-tauri` 工程，应用目前需通过浏览器打开 `http://localhost:1420` 运行，尚未打包为独立的 Windows `.exe` / `.msi` 原生安装包；
  - 尚未实现白皮书中规划的“无边框亚克力毛玻璃独立悬浮命令条窗口”。

### 2. 操作系统级全局快捷键唤醒（未做）
- **现状说明**：
  - 目前 `Alt + Space` 快捷键通过前端 `window.addEventListener('keydown')` 实现，**仅在浏览器当前标签页处于激活聚焦状态时生效**；
  - 当用户切到 IDE、Word 或其他桌面软件工作时，无法通过按下 `Alt + Space` 直接跨应用呼出命令条（需接入 `tauri-plugin-global-shortcut`）。

### 3. Windows 系统托盘常驻与悬停状态提示（未做）
- **现状说明**：
  - 尚未实现白皮书第 2.3 节规划的系统托盘常驻图标（`tauri-plugin-tray`）、托盘右键快捷菜单以及鼠标悬停显示“当前专注：[任务名] 已用时 XX 分钟”的原生托盘提示。
