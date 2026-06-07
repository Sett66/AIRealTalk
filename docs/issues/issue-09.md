# Issue #09：发音评测 + 练习历史趋势

**父文档（权威）**：[docs/SPEC.md](../SPEC.md)

## 要构建什么（端到端纵向切片）

对接 **阿里云口语评测 API**，对会话中每轮用户录音评分，将 `pronunciationAvg` 与 `sentenceScores` 写入课后报告；mobile 用 MMKV/AsyncStorage 持久化 `PracticeSummary`，实现 `HistoryScreen` 展示练习列表与最近 7 次分数折线图。

## 验收标准

- [x] 报告页显示发音均分（0-100）与逐句分数
- [x] `PronunciationModule` 通过 backend 代理，密钥不在 mobile
- [x] 每次练习结束自动保存 PracticeSummary 到本地
- [x] HistoryScreen 展示历史列表（场景名、日期、分数、轮次）
- [x] 完成 ≥ 3 次练习后，趋势折线图可见
- [x] App 重启后历史数据仍在
- [x] 支持 mock 发音评测模式

## 阻塞关系

- **Blocked by**：[Issue #08](./issue-08.md)
- **Blocks**：[Issue #10](./issue-10.md)

## Agent 交接

### 前置条件

- Issue #08 报告页可用；会话中用户音频 buffer 可获取

### 范围边界

- **在范围内**：PronunciationModule、报告发音字段、historyStore、HistoryScreen
- **不在范围内**：账号云同步、付费、自动重连优化

### 验证步骤

1. 完成练习，报告含发音分数
2. 重复 3 次，历史页出现 3 条记录与折线
3. 杀进程重启 App，数据仍在

### 参考 SPEC 章节

- 2.4 发音评测、2.5 可量化反馈、5.3 PracticeSummary、6.1 环境变量
