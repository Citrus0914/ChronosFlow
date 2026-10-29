# 📱 ChronosFlow (时流) - 安卓独立 App 工程手册

> **架构标准**：完全对齐选股软件 StockTwin AI 的标准架构范式  
> **核心机制**：Kotlin 原生沉浸容器 + React 19 / TypeScript 前端资产 + `@JavascriptInterface` 原生双向桥接  
> **特色功能**：系统底层 `UsageStatsManager` 自动检测其它 App（微信、抖音、游戏、知乎等）使用时长与切换频次

---

## 🚀 开箱即用：三剑客批处理工具

在 `mobile/` 根目录下，您可以像使用选股软件一样直接双击运行以下批处理脚本：

| 脚本文件 | 功能说明 | 核心特性 |
| :--- | :--- | :--- |
| **`【一键安装到手机】.bat`** | 🚀 **一键将 App 安装到安卓真机并自动拉起** | 自动查找 ADB，智能识别设备连接、未授权与离线状态；一键 `adb install -r` 并自动启动应用。 |
| **`【打包APK】.bat`** | 📦 **一键自动化编译独立 APK 安装包** | 自动调用 Gradle 编译，输出轻量独立 APK（约 3.8 MB）至 `dist/` 目录。 |
| **`【预览手机版】.bat`** | 💻 **电脑端浏览器极速仿真预览** | 启动本地服务自动打开浏览器，提供内置的 Mock 权限与应用数据，电脑无需连接手机也能完整体验全套感知与复盘流程。 |

---

## 🧭 工程与代码架构

```text
mobile/
├── 【一键安装到手机】.bat          # 🚀 ADB 智能识别与一键推包拉起
├── 【打包APK】.bat                  # 📦 Gradle 极速编译生成 APK
├── 【预览手机版】.bat                # 💻 PC 浏览器仿真手机视口
├── android/                         # 🤖 Android 原生宿主工程
│   ├── app/src/main/
│   │   ├── java/com/chronosflow/app/
│   │   │   ├── MainActivity.kt      # 沉浸式全屏原生容器与 Web 注入
│   │   │   └── AppUsageBridge.kt    # 原生桥接类 (实现 UsageStatsManager 检测其它App)
│   │   └── AndroidManifest.xml      # 声明 PACKAGE_USAGE_STATS 与前台服务
│   └── build_apk.bat                # 底层 Gradle 自动化构建脚本
├── src/                             # 🎨 移动端前端源码 (React 19 + TypeScript + Tailwind)
│   ├── components/
│   │   ├── AppUsageTracker.tsx      # 📱 核心：其它应用时长排行榜、未授权一键直达系统设置
│   │   ├── QuickTimerBar.tsx        # ⚡ 单手操作快捷计时与自然语言补录条
│   │   ├── MobileTimeline.tsx       # 🕒 手势时间流看板 (带 🤖 自动感知徽章)
│   │   ├── MobileAICoach.tsx        # 🧠 移动端专属 AI 认知心理学教练复盘
│   │   └── TabBar.tsx               # 🔘 原生大触控底部导航条
│   └── services/
│       ├── nativeBridge.ts          # 🌉 双向通信封装与 PC 浏览器仿真 Mock 降级
│       ├── nlpParser.ts             # 100% 复用 PC 端自然语言时间解析器
│       └── aiDebrief.ts             # 100% 复用 PC 端认知精力复盘双擎算法
└── dist/
    ├── ChronosFlow_v1.0.0_debug.apk # 🎯 已构建成功的独立安卓安装包 (3.84 MB)
    └── app/                         # 预先编译打包的前端离线资产
```

---

## 🔒 “检测其它 App 使用时间”权限与使用说明

1. 手机首次安装运行后，顶部会显示【待授权】黄色警告；
2. 点击界面中的**【一键前往开启权限】**，时流会自动跳转至安卓系统的【有权查看使用情况的应用】列表；
3. 在列表中找到**时流**并勾选允许；
4. 返回时流，顶栏立即变为绿色的**【感知就绪】**状态，今日在手机上使用微信、B站、游戏等的真实时长将自动排行呈现；
5. 点击**【一键同步到时间流】**，所有 App 活动将自动转化为带有 `🤖 自动感知` 徽章的时间块，彻底告别琐碎打卡。
