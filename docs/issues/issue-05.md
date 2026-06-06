# Issue #05：单场景完整语音对话环

**父文档（权威）**：[docs/SPEC.md](../SPEC.md)  
**状态**：✅ 已完成（2026-06-06）

## 要构建什么（端到端纵向切片）

引入 **场景剧本** 与 **会话状态管理**：加载 `interview` 场景 JSON，LLM system prompt 注入 HR 面试官角色，会话开始时 AI 主动说开场白，之后维持多轮上下文对话。验证 **面试场景 ≥ 3 轮** 连贯对话不崩溃。

## 验收标准

- [x] `backend/src/scenarios/interview.json` 符合 SPEC 8 节格式
- [x] 会话开始自动播放 AI 开场白（TTS）
- [x] backend 维护 `SessionState`（messages、turnCount、scenarioId）
- [x] 连续 ≥ 3 轮对话，AI 回复与面试场景相关且上下文连贯
- [x] `LlmService.buildSystemPrompt(scenario)` 注入角色、goals、B1-B2 难度
- [x] 不破坏 Issue #04 的语音闭环

## 阻塞关系

- **Blocked by**：[Issue #04](./issue-04.md) ✅
- **Blocks**：[Issue #06](./issue-06.md)

## Agent 交接

### 前置条件

- Issue #04 语音闭环可用

### 范围边界

- **在范围内**：ScenarioModule、interview.json、SessionState、开场白、prompt 模板
- **不在范围内**：场景选择 UI、另外两个场景、纠错、报告

### 验证步骤

1. 硬编码启动 interview 场景
2. 完成 3 轮以上对话，检查 AI 是否像面试官
3. 检查 session 日志中 messages 历史正确累积

### 参考 SPEC 章节

- 8 场景配置、6.2 LLM Prompt 约束、2.1 场景选择

## 实现备注

- `packages/shared/src/scenario.schema.ts`：`ScenarioSchema` + 类型导出
- `backend/src/scenarios/interview.json`：面试场景配置
- `backend/src/scenario/`：`ScenarioModule` + `ScenarioService`（按 id 加载 JSON）
- `backend/src/llm/llm.service.ts`：`buildSystemPrompt(scenario)` + 多轮 `ChatMessage[]` 入参
- `backend/src/voice-session.gateway.ts`：`SessionState`、开场白 TTS、多轮上下文累积
- `mobile/src/hooks/useWebSocket.ts`：硬编码 `scenarioId: 'interview'`
- Mock 验证：`node scripts/verify-issue-05.mjs`（需 backend mock 三件套开启）

## 完成备注

- `pnpm -r build` 通过
- Mock 模式 3 轮面试对话环验证通过
- Issue #04 语音闭环保持可用（`verify-issue-04.mjs` 已适配开场白等待）
- 真机多轮对话验收通过（阿里云 ASR/TTS + DeepSeek）
- 修复 DeepSeek `json_object` 多轮偶发空回复：重试 + `max_tokens` + 失败回滚 user 消息

**下一项**：[Issue #06 — 三场景 + UI 状态机](./issue-06.md)
