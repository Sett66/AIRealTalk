# Issue #04：LLM 回复 → TTS 流式播放

**父文档（权威）**：[docs/SPEC.md](../SPEC.md)

## 要构建什么（端到端纵向切片）

在 ASR 获得用户文本后，backend 自动串联 **DeepSeek LLM** 生成英文回复，再经 **阿里云 TTS** 流式合成，通过 `tts:chunk` / `tts:end` 推送至 mobile 播放。完成「说一句 → 听 AI 回一句」最小闭环。

LLM 输出须为 JSON（`LlmTurnResponse`），本 Issue 仅使用 `reply` 字段；`hints` / `corrections` 留待 Issue #07。

## 验收标准

- [ ] `audio:end` 后自动触发 ASR → LLM → TTS，无需额外按钮
- [ ] 用户松手到 AI 开始发声 **< 3 秒**（局域网，mock 模式除外）
- [ ] mobile 收到 `tts:chunk` 即开始播放，不等待全部音频
- [ ] DeepSeek JSON 解析失败时重试 1 次，fallback 为纯文本 reply
- [ ] `LlmTurnResponseSchema`（Zod）定义在 `packages/shared`
- [ ] 支持 `USE_MOCK_LLM` / `USE_MOCK_TTS` 开发模式

## 阻塞关系

- **Blocked by**：[Issue #03](./issue-03.md)
- **Blocks**：[Issue #05](./issue-05.md)

## Agent 交接

### 前置条件

- Issue #03 完成；DeepSeek API Key 已配置或 mock 开启

### 范围边界

- **在范围内**：LlmModule、TtsModule、流水线编排、`tts:*` 事件、播放队列
- **不在范围内**：场景 prompt、纠错 UI、报告、发音评测

### 验证步骤

1. 说一句英文，听到 AI 英文语音回复
2. 记录端到端延迟，确认 < 3s
3. 故意让 LLM 返回畸形 JSON，确认 fallback 生效

### 参考 SPEC 章节

- 5.3 LlmTurnResponse、6.2 LLM Prompt 约束、2.2 延迟目标
