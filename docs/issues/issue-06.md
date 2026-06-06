# Issue #06：三场景选择 + 对话 UI 状态机

**父文档（权威）**：[docs/SPEC.md](../SPEC.md)  
**状态**：✅ 已完成（2026-06-06）

## 要构建什么（端到端纵向切片）

补齐 **restaurant**、**meeting** 场景配置，暴露 `GET /scenarios` REST API，mobile 实现 **Home → 场景选择 → 对话** 导航与 **SessionPhase 状态机 UI**（idle / listening / processing / speaking），使用户可自主选择场景并完成 ≥ 5 轮对话。

## 验收标准

- [x] `GET /scenarios` 返回 3 个场景（interview / restaurant / meeting）
- [x] mobile 场景列表页展示中文标题与英文副标题
- [x] 对话页状态指示正确：倾听中 / 思考中 / 回复中
- [x] `SessionPhase` 类型与 zustand store 定义清晰，与 backend `session:phase` 同步
- [x] 3 个场景均可完成 ≥ 5 轮对话，UI 无卡死
- [x] 组件：`AudioWave`（或等效波形）、`PhaseIndicator`
- [x] 按住说话（Push-to-Talk）交互可用

## 阻塞关系

- **Blocked by**：[Issue #05](./issue-05.md) ✅
- **Blocks**：[Issue #07](./issue-07.md)

## Agent 交接

### 前置条件

- Issue #05 单场景对话环稳定

### 范围边界

- **在范围内**：3 场景 JSON、REST API、导航、状态机 UI、P2T 交互
- **不在范围内**：纠错 hint、课后报告、发音评测、历史页

### 验证步骤

1. 从场景列表分别进入 3 个场景
2. 各完成 5 轮对话，观察状态切换
3. 快速连续操作，确认无状态卡死

### 参考 SPEC 章节

- 4.4 移动端页面、5.3 SessionPhase、2.1 场景选择、8 场景配置

## 实现备注

- `packages/shared/src/session-phase.schema.ts`：`SessionPhase` + Zod
- `backend/src/scenarios/restaurant.json`、`meeting.json` + `GET /scenarios`
- `mobile/src/stores/session-store.ts`：zustand 状态机
- `mobile/src/components/PhaseIndicator.tsx`、`AudioWave.tsx`
- `mobile/App.tsx`：Home → SceneSelect → Conversation 路由
- 验证：`node scripts/verify-issue-06.mjs`

## 完成备注

- `pnpm -r build` 通过
- `GET /scenarios` 返回 3 场景验证通过
- 真机验收：3 场景可选、状态切换正常、多轮对话无卡死
- UI 修复：`ScreenContainer`（SafeAreaView）解决顶栏重叠；退出按钮扩大点击区 + `session:end`

**下一项**：[Issue #07 — 对话中纠错提示](./issue-07.md)
