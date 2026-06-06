# Phase 3 — 纠错系统

> **权威规约**：[docs/SPEC.md](../SPEC.md)

## 目标

实现 SPEC 2.3 纠错策略：**对话中轻提示** + **课后详析报告**，在沉浸感与学习效果之间取得平衡。

## 周期

约 **1.5 周**

## 包含 Issue

| Issue | 名称 | 文档 | 依赖 |
|-------|------|------|------|
| #07 | 对话中轻提示纠错 | [issue-07.md](../issues/issue-07.md) | #06 |
| #08 | 课后详析报告 | [issue-08.md](../issues/issue-08.md) | #07 |

## 交付物

- `hint:show` 事件 + `HintBubble` 组件
- LLM hints 过滤（仅 major，每轮 ≤ 1）
- `ReportModule` + `session:end`
- `ReportScreen`：纠错列表、语法分类、统计数据
- `SessionReportSchema`（shared）

## 任务分解

1. 强化 LLM prompt 纠错约束
2. hint 展示时机：与 TTS 并行，不中断播放
3. transcript 全量记录
4. 报告二次 LLM 调用 + 结构化输出
5. 报告 UI：原文 vs 建议、goal 覆盖度

## Phase 验收标准

- [ ] Issue #07、#08 全部 checkbox 通过
- [ ] 严重错误时出现轻提示，TTS 不中断
- [ ] 课后报告 ≥ 3 条纠错 + 统计数据

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| 纠错过多破坏沉浸 | prompt 硬约束 + 仅 major |
| 报告生成慢 | 异步生成 + loading 态 |

## 下一阶段

[Phase 4 — 评测与历史](./phase-4.md)
