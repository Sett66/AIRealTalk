# Issue #07：对话中轻提示纠错

**父文档（权威）**：[docs/SPEC.md](../SPEC.md)

## 要构建什么（端到端纵向切片）

启用 LLM 结构化输出中的 **hints** 字段：当 `severity: major` 时，backend 发送 `hint:show` 事件，mobile 以 `HintBubble` 底部卡片展示简短提示。**不得打断或暂停 TTS 播放**；每轮最多 1 条 hint。

## 验收标准

- [ ] LLM prompt 约束：每轮 hints 最多 1 条，仅 major 级别
- [ ] 故意说严重语法错误时，对话中出现轻提示
- [ ] hint 显示期间 TTS 正常播放，无暂停/中断
- [ ] `HintBubble` 底部滑入，3 秒自动收起，可手动关闭
- [ ] minor 级别 hint 不展示（或仅写日志，不打扰用户）
- [ ] `hint:show` 事件类型在 shared 包定义

## 阻塞关系

- **Blocked by**：[Issue #06](./issue-06.md)
- **Blocks**：[Issue #08](./issue-08.md)

## Agent 交接

### 前置条件

- Issue #06 三场景对话 UI 完成

### 范围边界

- **在范围内**：prompt 调优、hint 事件、HintBubble 组件
- **不在范围内**：课后详析报告、发音评测、历史趋势

### 验证步骤

1. 说 "I go to store yesterday"，确认出现轻提示
2. 同时确认 AI 语音回复正常播完
3. 连续多轮对话，每轮 hint 不超过 1 条

### 参考 SPEC 章节

- 2.3 纠错策略、5.2 hint:show、5.3 LlmTurnResponse、6.2 LLM 约束
