# ⏳ ChronosFlow (时流) - AI 极简时间感知与认知教练系统

> **让时间被感知，让专注有回响**  
> 一款融合“极简命令条交互 + 时间流断层感知 + 手机应用自动检测 + AI 认知心理学教练”的双端时间管理应用。

---

## 📂 多端与项目目录结构

```text
时间管理/
├── pc/                                    # 💻 PC 端完整工程 (React 19 + TypeScript + Vite + Tailwind)
│   ├── src/                               # 核心源码 (命令条、时间流、统计、AI复盘、目标预算)
│   ├── public/                            # 静态资源与矢量图标
│   ├── tests/                             # 自动化单元测试集 (38项全部通过)
│   ├── scripts/                           # 打包与快捷方式自动化脚本
│   ├── 【双击启动ChronosFlow】.bat        # PC 端极速启动入口 (双击即可运行)
│   ├── 【创建桌面快捷方式】.bat           # 一键生成无弹窗桌面快捷方式
│   ├── 作业提交与快速运行说明.txt         # 评测开箱指引
│   └── README.md                          # PC 端专属技术手册
│
├── mobile/                                # 📱 手机版工程 (Android 原生独立 App)
│   ├── 【一键安装到手机】.bat            # 🚀 ADB 智能检测并一键推包拉起
│   ├── 【打包APK】.bat                    # 📦 Gradle 极速编译生成 APK
│   ├── 【预览手机版】.bat                  # 💻 PC 浏览器手机视口仿真预览
│   ├── dist/ChronosFlow_v1.0.0_debug.apk  # 🎯 独立安卓安装包 (3.84 MB)
│   ├── android/                           # 🤖 Android 原生宿主工程 (Kotlin)
│   ├── src/                               # 🎨 移动端前端源码 (含应用时长检测组件)
│   └── README.md                          # 手机版专属使用手册
│
├── document/                              # 📚 项目全套文档统一归档中心
│   ├── pc/                                # 💻 PC 端专属文档专区
│   │   ├── ChronosFlow完整功能与使用说明书.md
│   │   ├── ChronosFlow目标计划与时间预算设计.md
│   │   ├── ChronosFlow设计白皮书.md
│   │   └── 作业提交与快速运行说明.md
│   ├── mobile/                            # 📱 手机端专属文档专区
│   │   ├── ChronosFlow手机版完整功能与使用说明书.md
│   │   └── ChronosFlow手机版开发计划与App使用时长检测方案.md
│   ├── 交接.md                            # 项目会话演进与交接日志 (严格追加)
│   └── README.md                          # 文档中心总索引
│
├── .gitignore                             # Git 忽略配置
└── AGENTS.md                              # 项目自治与协作铁律
```

---

## 🚀 双端极速开箱体验

### 💻 PC 桌面端
1. 进入 `pc/` 目录；
2. **双击 `【双击启动ChronosFlow】.bat`** 即可自动检测环境并启动本地开发服务，在浏览器自动打开 `http://localhost:1420`；
3. 执行单元测试：`cd pc && pnpm vitest run`。

### 📱 手机端 (Android)
1. 进入 `mobile/` 目录；
2. 手机通过 USB 连接电脑开启 USB 调试，**双击 `【一键安装到手机】.bat`**，秒级推包安装并自动在手机屏幕拉起；
3. 或双击 **`【预览手机版】.bat`** 在电脑浏览器直接仿真调试。
