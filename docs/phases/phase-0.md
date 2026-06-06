# Phase 0 — 工程基建

> **权威规约**：[docs/SPEC.md](../SPEC.md)（所有决策以 SPEC 为准）

## 目标

搭建 pnpm monorepo，跑通 React Native（Android）+ NestJS 最小工程，并建立 WebSocket 会话通道。本阶段结束时，手机可显示 backend 健康状态，且 WS ping/pong 正常。

## 周期

约 **1 周**（业余 15–20h）

## 包含 Issue

| Issue | 名称 | 文档 | 依赖 |
|-------|------|------|------|
| #01 | Monorepo TS 基建 | [issue-01.md](../issues/issue-01.md) | 无 |
| #02 | WebSocket 会话连通 | [issue-02.md](../issues/issue-02.md) | #01 |

## 交付物

- `pnpm-workspace.yaml` + `packages/shared` + `mobile/` + `backend/`
- `GET /health` 健康检查
- `VoiceSessionGateway` + mobile 连接状态 UI
- `backend/.env.example`、`.gitignore`
- 本地启动说明（写入 README）

## 任务分解

### Issue #01

1. 初始化 monorepo 与三包结构
2. NestJS ConfigModule + HealthController
3. RN bare TS 占位首页，展示 health 请求结果
4. shared 包导出基础类型

### Issue #02

1. shared 定义 WS 事件类型
2. NestJS WebSocket Gateway
3. mobile `useWebSocket` hook
4. 局域网 IP 配置说明

## Phase 验收标准

- [ ] Issue #01、#02 全部 checkbox 通过
- [ ] `pnpm -r build` 无错误
- [ ] Android 真机/模拟器可演示 health + WS 连通

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| RN 裸项目环境配置复杂 | README 固定 JDK 17、SDK 版本 |
| Windows 防火墙挡 3000 端口 | 文档说明添加入站规则 |
| 嵌套 git 目录混乱 | Issue #01 理顺为单层仓库根 |

## 下一阶段

[Phase 1 — 语音管线](./phase-1.md)：ASR + LLM + TTS 端到端闭环。
