# Issues 索引

> 执行任何 Issue 前，必须先阅读 [docs/SPEC.md](../SPEC.md)。

## 依赖链

```
#01 → #02 → #03 → #04 → #05 → #06 → #07 → #08 → #09 → #10
```

**规则**：仅当「Blocked by」所列 Issue 验收通过后，方可开始当前 Issue。

## Issue 列表

| # | 标题 | Phase | Blocked by | 文档 |
|---|------|-------|------------|------|
| 01 | Monorepo TS 基建 ✅ | 0 | 无 | [issue-01.md](./issue-01.md) |
| 02 | WebSocket 会话连通 | 0 | #01 | [issue-02.md](./issue-02.md) |
| 03 | 语音上传 → ASR → 转写 | 1 | #02 | [issue-03.md](./issue-03.md) |
| 04 | LLM → TTS 播放 | 1 | #03 | [issue-04.md](./issue-04.md) |
| 05 | 单场景完整对话环 | 2 | #04 | [issue-05.md](./issue-05.md) |
| 06 | 三场景 + UI 状态机 | 2 | #05 | [issue-06.md](./issue-06.md) |
| 07 | 对话中轻提示纠错 | 3 | #06 | [issue-07.md](./issue-07.md) |
| 08 | 课后详析报告 | 3 | #07 | [issue-08.md](./issue-08.md) |
| 09 | 发音评测 + 历史趋势 | 4 | #08 | [issue-09.md](./issue-09.md) |
| 10 | 稳定性 + MVP 验收 | 5 | #09 | [issue-10.md](./issue-10.md) |

## Agent 接手清单

1. 阅读 [SPEC.md](../SPEC.md) 全文
2. 打开目标 Issue 文档
3. 确认前置 Issue 已完成（检查验收 checkbox）
4. 仅实现「在范围内」项，不越界
5. 完成后逐条勾选验收标准
6. 运行 `pnpm -r build` 验证

## 类型

所有 Issue 均为 **AFK**（无需人工决策即可实现）。
