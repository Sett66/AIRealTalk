# Phase 4 — 发音评测与练习历史

> **权威规约**：[docs/SPEC.md](../SPEC.md)

## 目标

为课后报告补充 **发音评分**，并建立 **本地练习历史与进步趋势**，满足可量化反馈需求。

## 周期

约 **1 周**

## 包含 Issue

| Issue | 名称 | 文档 | 依赖 |
|-------|------|------|------|
| #09 | 发音评测 + 历史趋势 | [issue-09.md](../issues/issue-09.md) | #08 |

## 交付物

- `PronunciationModule`（阿里云/mock）
- 报告扩展：`pronunciationAvg`、`sentenceScores`
- `historyStore`（MMKV）+ `PracticeSummary`
- `HistoryScreen` + 分数折线图

## 任务分解

1. 会话中缓存用户每轮 audio buffer
2. 报告生成时批量提交发音评测
3. 报告 UI 展示发音分数
4. 练习结束写入本地历史
5. 历史列表与 7 次趋势图

## Phase 验收标准

- [ ] Issue #09 全部 checkbox 通过
- [ ] 报告含发音均分与逐句分
- [ ] 3 次练习后历史趋势可见，重启不丢失

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| 评测 API 对口音苛刻 | 合理阈值，报告文案鼓励式 |
| 音频缓存占内存 | 仅保留本轮必要 buffer，报告后释放 |

## 下一阶段

[Phase 5 — 稳定性打磨](./phase-5.md)
