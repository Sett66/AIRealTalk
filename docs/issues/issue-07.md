# Issue #07：对话中轻提示纠错

**父文档（权威）**：[docs/SPEC.md](../SPEC.md)

## 要构建什么（端到端纵向切片）

启用 LLM 结构化输出中的 **hints** 字段：backend 发送 `hint:show` 事件，mobile 以 `HintBubble` 顶部卡片展示语言形式相关的简短提示（语法、残缺句、表达）。**不得打断或暂停 TTS 播放**。

## 验收标准

- [x] LLM prompt 约束：hint 仅覆盖语言形式（语法/残缺句/表达），禁止答题内容建议
- [x] 故意说严重语法错误或残缺句时，对话中出现轻提示
- [x] hint 显示期间 TTS 正常播放，无暂停/中断
- [x] `HintBubble` 顶部滑入，8 秒自动收起，可手动关闭，支持多条 major/minor
- [x] 内容型 hint（如「应谈兴趣而非工资」）被后端过滤，不展示
- [x] `hint:show` 事件类型在 shared 包定义

## 阻塞关系

- **Blocked by**：[Issue #06](./issue-06.md)
- **Blocks**：[Issue #08](./issue-08.md)

## Agent 交接

### 前置条件

- Issue #06 三场景对话 UI 完成

### 范围边界

- **在范围内**：prompt 调优、hint 事件、HintBubble 组件、残缺句规则检测、内容型 hint 过滤
- **不在范围内**：课后详析报告、发音评测、历史趋势

### 验证步骤

1. 说 "I go to store yesterday"，确认出现语法轻提示
2. 说 "Most challenging. I am not good at."，确认出现残缺句提示
3. 说完整语法句如 "Because salary is good."，确认不出现内容建议型 hint
4. 同时确认 AI 语音回复正常播完

### 参考 SPEC 章节

- 2.3 纠错策略、5.2 hint:show、5.3 LlmTurnResponse、6.2 LLM 约束
