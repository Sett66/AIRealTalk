# Phase 2 — 场景对话 UI

> **权威规约**：[docs/SPEC.md](../SPEC.md)

## 目标

从「能对话」升级为「有场景、有 UI 的对话产品形态」：3 个场景可选，对话页状态机清晰，AI 角色扮演连贯。

## 周期

约 **1.5 周**

## 包含 Issue

| Issue | 名称 | 文档 | 依赖 |
|-------|------|------|------|
| #05 | 单场景完整对话环 | [issue-05.md](../issues/issue-05.md) | #04 |
| #06 | 三场景 + UI 状态机 | [issue-06.md](../issues/issue-06.md) | #05 |

## 交付物

- `interview.json` + `restaurant.json` + `meeting.json`
- `ScenarioModule` + `GET /scenarios`
- `SceneSelectScreen`、`ConversationScreen`
- zustand `SessionPhase` 状态机
- `AudioWave`、`PhaseIndicator` 组件

## 任务分解

1. 场景 JSON 与 system prompt 模板
2. SessionState 多轮上下文管理
3. AI 开场白自动生成与播放
4. 导航：Home → 场景列表 → 对话
5. UI 状态与 backend `session:phase` 同步
6. 3 场景各 ≥ 5 轮对话测试

## Phase 验收标准

- [ ] Issue #05、#06 全部 checkbox 通过
- [ ] 3 场景可选，AI 角色符合场景
- [ ] UI 状态切换正确，无卡死

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| LLM 角色漂移 | 强化 system prompt + 场景 role 字段 |
| 状态机竞态 | 单一状态源（zustand），禁止多处 setState |

## 下一阶段

[Phase 3 — 纠错系统](./phase-3.md)
