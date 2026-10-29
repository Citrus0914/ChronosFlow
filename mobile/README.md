# 📱 ChronosFlow（时流）- 手机版工程 (Mobile)

本项目是 ChronosFlow 时间管理应用的移动端（手机版）工程主目录。

---

## 🧭 架构与复用设计

PC 版的核心业务逻辑（NLP 自适应语义解析、AI 认知教练双擎、时间流与精力数据模型）均采用平台无关的纯 TypeScript 实现，手机端可高度复用：

| 模块 | 路径 (来自 PC 版) | 移动端复用策略 |
| :--- | :--- | :--- |
| **数据与模型规范** | `pc/src/types/index.ts` | 100% 共享类型契约（Activity, AICoachDebrief, Goals 等） |
| **自适应 NLP 引擎** | `pc/src/services/nlpParser.ts` | 100% 纯逻辑复用（本地正则提取器 + 极速 LLM 双擎） |
| **AI 认知复盘引擎** | `pc/src/services/aiDebrief.ts` | 100% 纯逻辑复用（认知心理学规则 + 深度推理模型） |
| **时间与节奏算法** | `pc/src/lib/dateUtils.ts`, `paceUtils.ts` | 100% 纯函数共享 |

---

## 🎯 移动端技术选型待定方向

可根据后续需求进行脚手架初始化：
1. **React Native / Expo**：最佳方案，原生流畅手势交互，直接复用 TypeScript 逻辑层与 Zustand 状态管理；
2. **Flutter / Dart**：极高性能与精美跨平台 UI；
3. **Taro / UniApp**：多端小程序与 App 快速发布；
4. **Capacitor / PWA**：快速将现有 Web 界面包装为离线 Native 体验。

---

> 🚀 待用户确认具体移动端技术选型后，即可在此目录初始化脚手架并开始界面与交互构建。
