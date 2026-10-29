# ⏳ ChronosFlow（时流）时间管理应用 - 项目开发自治与协作准则 (AGENTS.md)

本文档是本项目的核心行为准则，所有参与本项目的 AI Agent 和开发者必须无条件严格遵守以下核心铁律：

---

## 规则一：文档各端归档铁律 (Documentation Rule)
- **强制归档目录**：所有技术调研、架构设计、技术选型、需求说明、API 规范等项目文档，**必须且只能存放在各自工程的 `document/` 文件夹中**：
  - **PC 桌面端文档**：归档于 `pc/document/`（如 `pc/document/ChronosFlow完整功能与使用说明书.md` 等）；
  - **手机版 App 文档**：归档于 `mobile/document/`（如 `mobile/document/ChronosFlow手机版完整功能与使用说明书.md` 等）；
- **严禁乱放**：严禁在根目录或源码目录随意散落创建独立的文档文件（项目级 README.md 和 AGENTS.md 规范文件除外）。

---

## 规则二：会话交接铁律 (Session Handoff Rule)
- **强制触发时机**：在每次功能更新、特性开发或修复 Bug 完成后，**必须调用/执行 `session-handoff` 流程**。
- **目标文件与操作规范**：
  - 目标文件固定为对应端侧的 `pc/document/交接.md` 或 `mobile/document/交接.md`（若为全局跨端改动，需同步追加两端记录）；
  - **必须以追加（Append）方式写入**，严禁覆盖或抹除历史交接记录；
  - 必须完整填写：本次任务目标、新增功能、修复缺陷、涉及文件变更、关键决策与避坑提示，以及供新对话一键启动的 Next Session Prompt。

---

## 规则三：版本回滚与 Git 提交铁律 (Git Rollback Rule)
- **强制提交时机**：在每次更新、代码变更、Bug 修复或文档归档完成后，**必须立即执行 Git 提交（`git add` + `git commit`）**。
- **原子化提交 (Atomic Commits)**：一个 Commit 对应一个明确的功能点，严禁在工作区遗留未提交的脏代码。
- **Conventional Commits 规范**：
  - `feat(模块名): 新增功能简述`
  - `fix(模块名): 修复问题简述`
  - `docs: 更新文档与交接记录`
  - `refactor(模块名): 代码重构`
  - `chore: 工具链与环境配置`

---

## 规则四：安全与质量底线 (Safety & Quality)
1. **先验证后声明 (Evidence Before Assertions)**：提交前必须实际构建或运行验证，确保无编译错误。
2. **防假死铁律 (Anti-Hang)**：命令执行严禁交互阻塞，测试与构建必须 run-to-completion。
3. **全域安全回收站 (Safe-Recycle)**：全域删除严禁物理抹除，必须调用 safe-recycle 移入回收站。
