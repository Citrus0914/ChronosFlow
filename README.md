# ⏳ ChronosFlow (时流) - AI 极简时间感知与认知教练系统

> **让时间被感知，让专注有回响**  
> 一款融合“极简命令条交互 + 时间流断层感知 + AI 认知心理学教练”的双端时间管理应用。

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
│   └── README.md                          # PC 端专属技术与使用手册
│
├── mobile/                                # 📱 手机版工程 (待初始化/进行中)
│   └── README.md                          # 移动端架构与复用设计规范
│
├── document/                              # 📚 项目全局设计白皮书与历史交接归档
│   ├── ChronosFlow完整功能与使用说明书.md # 最详尽的 PC 全功能使用手册
│   ├── ChronosFlow设计白皮书.md           # 架构设计与推演
│   ├── ChronosFlow目标计划与时间预算设计.md # 目标与预算系统规格
│   ├── 作业提交与快速运行说明.md          # Markdown 格式开箱指引
│   └── 交接.md                            # 项目会话演进与交接日志 (严格追加)
│
├── .gitignore                             # Git 忽略配置
└── AGENTS.md                              # 项目自治与协作铁律
```

---

## 🚀 PC 端快速启动

1. 进入 `pc/` 目录；
2. **双击 `【双击启动ChronosFlow】.bat`** 即可自动检测环境并启动本地开发服务，在浏览器自动打开 `http://localhost:1420`；
3. 或在终端执行：
   ```bash
   cd pc
   pnpm install
   pnpm run dev
   ```
4. 执行单元测试：
   ```bash
   cd pc
   pnpm vitest run
   ```

---

## 📱 移动端规划

手机版工程位于 `mobile/` 目录，将最大化复用 PC 端成熟稳定的纯 TypeScript 算法层（NLP 语义解析、AI 认知教练双擎算法、精力与时间模型）。
