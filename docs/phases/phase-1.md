# Phase 1 — 语音管线

> **权威规约**：[docs/SPEC.md](../SPEC.md)

## 目标

打通 **用户说英文 → ASR 转写 → DeepSeek 回复 → TTS 播放** 技术闭环。UI 可简陋，重点是端到端可用与延迟达标。

## 周期

约 **2 周**

## 包含 Issue

| Issue | 名称 | 文档 | 依赖 |
|-------|------|------|------|
| #03 | 语音上传 → ASR → 转写 | [issue-03.md](../issues/issue-03.md) | #02 |
| #04 | LLM → TTS 播放 | [issue-04.md](../issues/issue-04.md) | #03 |

## 交付物

- 按住说话录音 + 音频分片上传协议
- `AsrModule`（阿里云/mock）
- `LlmModule` + `TtsModule`（DeepSeek/阿里云/mock）
- 流水线编排：`audio:end` 自动触发 ASR → LLM → TTS
- `LlmTurnResponseSchema`（shared）

## 任务分解

1. 扩展 WS 协议：`audio:*`、`asr:*`、`tts:*`
2. mobile 录音 16kHz mono，上传 base64 chunk
3. backend ASR 服务封装（含 Token 刷新）
4. DeepSeek JSON mode + Zod 校验 + fallback
5. TTS 流式合成与 mobile 播放队列
6. 端到端延迟测量与日志

## Phase 验收标准

- [x] Issue #03 全部 checkbox 通过
- [ ] Issue #04 全部 checkbox 通过
- [ ] 说一句英文，听到 AI 英文回复
- [ ] 局域网端到端延迟 < 3s
- [ ] mobile 无 API Key

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| 阿里云 NLS 无 Nest 官方 SDK | axios/ws 手写封装 |
| TTS 首包慢 | 按句切分，首句优先 |
| 无云凭证无法开发 | mock 模式默认开启 |

## 下一阶段

[Phase 2 — 场景对话 UI](./phase-2.md)
