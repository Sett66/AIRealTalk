# Issue #08：课后详析报告

**父文档（权威）**：[docs/SPEC.md](../SPEC.md)

## 要构建什么（端到端纵向切片）

用户点击「结束练习」触发 `session:end`，backend `ReportService` 基于完整 transcript 调用 DeepSeek 生成结构化 **SessionReport**，mobile 导航至 `ReportScreen` 展示：原文 vs 建议、语法问题分类、轮次/时长/WPM、场景 goal 覆盖度。

## 验收标准

- [x] 对话页有「结束练习」按钮，点击后进入报告页
- [x] 报告含 ≥ 3 条表达纠错（original / suggestion / category）
- [x] 报告含语法问题分类统计（grammarIssues）
- [x] 报告含 turnCount、durationSec、wpm、goalCoverage（0-100）
- [x] `SessionReportSchema`（Zod）在 shared 包定义
- [x] 报告生成失败时显示友好错误，可重试
- [x] 本 Issue 可不含发音分数（Issue #09 补充）

## 阻塞关系

- **Blocked by**：[Issue #07](./issue-07.md)
- **Blocks**：[Issue #09](./issue-09.md)

## Agent 交接

### 前置条件

- Issue #07 完成；会话 transcript 在 backend 完整记录

### 范围边界

- **在范围内**：ReportModule、session:end、ReportScreen、报告 JSON
- **不在范围内**：发音评测 API、历史列表、趋势图

### 验证步骤

1. 完成 5 轮对话后点击「结束练习」
2. 检查报告纠错条目与统计数据
3. 断网或模拟失败时点击「重试生成报告」

### 参考 SPEC 章节

- 2.3 纠错策略、2.5 可量化反馈、5.3 SessionReport、5.2 report:ready
