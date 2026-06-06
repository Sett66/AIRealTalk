# AIRealTalk

一款面向 **B1–B2** 学习者的英语口语练习 App（个人练手项目）。在面试、点餐、会议等真实场景下，与 AI 进行**轮流语音对话**，获得发音评分、语法/表达纠错与课后总结。

## 功能概览

- 场景选择（面试 / 点餐 / 会议）
- 实时语音对话（ASR → DeepSeek → TTS）
- 对话中轻提示纠错 + 课后详析报告
- 基础发音评测与练习历史趋势

## 技术栈

| 层级 | 技术 |
|------|------|
| 移动端 | React Native Bare + TypeScript（Android 优先，**不用 Expo**） |
| 后端 | NestJS + TypeScript |
| 共享 | pnpm monorepo + `@airealtalk/shared`（Zod schema） |
| 云服务 | 阿里云 NLS + 发音评测、DeepSeek LLM |

## 文档导航

**所有 Agent 必须先读** → [**需求与开发规约**](docs/SPEC.md)

| 文档 | 说明 |
|------|------|
| [SPEC.md](docs/SPEC.md) | 需求、架构、协议、Agent 标准（最高优先级） |
| [Issues 索引](docs/issues/README.md) | 10 个可独立领取的垂直切片任务 |
| [Phase 0 — 工程基建](docs/phases/phase-0.md) | Monorepo + WebSocket |
| [Phase 1 — 语音管线](docs/phases/phase-1.md) | ASR + LLM + TTS |
| [Phase 2 — 场景 UI](docs/phases/phase-2.md) | 三场景 + 状态机 |
| [Phase 3 — 纠错系统](docs/phases/phase-3.md) | 轻提示 + 报告 |
| [Phase 4 — 评测历史](docs/phases/phase-4.md) | 发音分 + 趋势图 |
| [Phase 5 — 稳定性](docs/phases/phase-5.md) | MVP 验收 |

## 开发顺序

```
Issue #01 → #02 → #03 → #04 → #05 → #06 → #07 → #08 → #09 → #10
```

每个 Issue 文档：`docs/issues/issue-XX.md`（含验收标准与 Agent 交接说明）。

## 快速开始

### 环境要求

- Node.js ≥ 20、pnpm ≥ 9、JDK 17、Android Studio
- Android 模拟器或真机

### 安装与运行

```bash
pnpm install          # postinstall 会为 RN Android 创建 mobile/node_modules junction
pnpm dev:backend      # http://localhost:3000/health
pnpm dev:mobile       # 终端 1：Metro
pnpm android          # 终端 2：构建并安装到模拟器/真机
```

| 场景 | Backend 地址配置 |
|------|------------------|
| Android 模拟器 | 默认 `10.0.2.2:3000`（见 `mobile/src/config.ts`） |
| 真机 | 将 `mobile/src/config.ts` 改为电脑局域网 IP |

### 常用命令

```bash
pnpm -r build         # 编译 shared + backend + mobile 类型检查
pnpm lint             # 各包 lint
```

## 项目结构

```
AIRealTalk/
├── packages/shared/     # @airealtalk/shared — 类型与 Zod schema
├── backend/             # @airealtalk/backend — NestJS
├── mobile/              # @airealtalk/mobile — React Native
├── scripts/             # postinstall 等工具脚本
└── docs/                # SPEC、Phase、Issue 文档
```

## Agent 快速上手

1. 阅读 [docs/SPEC.md](docs/SPEC.md)
2. **Issue #02 已完成**，下一项：[Issue #03 — ASR 管线](docs/issues/issue-03.md)
3. 确认前置 Issue 已完成再领取任务
4. **禁止** Expo、禁止 API Key 写入 mobile

## 本地环境（云服务，Issue #03 起需要）

- 阿里云 NLS + DeepSeek API Key → 复制 `backend/.env.example` 为 `backend/.env`
- Android 真机与电脑同一局域网

## 项目状态

**当前进度**：Phase 0 已完成 → 进入 [Phase 1 — 语音管线](docs/phases/phase-1.md)

| Issue | 状态 |
|-------|------|
| [#01](docs/issues/issue-01.md) Monorepo 基建 | ✅ |
| [#02](docs/issues/issue-02.md) WebSocket 会话连通 | ✅ |
| [#03](docs/issues/issue-03.md) ASR 语音管线 | 待开始 |

## 许可证

个人练手项目，未指定开源许可证。
