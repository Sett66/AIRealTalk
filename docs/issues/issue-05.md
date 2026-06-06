# Issue #05：单场景完整语音对话环

**父文档（权威）**：[docs/SPEC.md](../SPEC.md)

## 要构建什么（端到端纵向切片）

引入 **场景剧本** 与 **会话状态管理**：加载 `interview` 场景 JSON，LLM system prompt 注入 HR 面试官角色，会话开始时 AI 主动说开场白，之后维持多轮上下文对话。验证 **面试场景 ≥ 3 轮** 连贯对话不崩溃。

## 验收标准

- [ ] `backend/src/scenarios/interview.json` 符合 SPEC 8 节格式
- [ ] 会话开始自动播放 AI 开场白（TTS）
- [ ] backend 维护 `SessionState`（messages、turnCount、scenarioId）
- [ ] 连续 ≥ 3 轮对话，AI 回复与面试场景相关且上下文连贯
- [ ] `LlmService.buildSystemPrompt(scenario)` 注入角色、goals、B1-B2 难度
- [ ] 不破坏 Issue #04 的语音闭环

## 阻塞关系

- **Blocked by**：[Issue #04](./issue-04.md)
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
