# Issue #03：语音上传 → ASR → 转写展示

**父文档（权威）**：[docs/SPEC.md](../SPEC.md)  
**状态**：✅ 已完成（2026-06-07）

## 要构建什么（端到端纵向切片）

实现用户 **按住说话** 录音流程：mobile 采集音频（16kHz mono PCM/WAV），经 WebSocket 分片上传至 backend，backend 调用 **阿里云 ASR**（或 mock 模式），将 `asr:partial` / `asr:final` 事件推回 mobile，UI 展示用户英文转写。

## 验收标准

- [x] 录音权限缺失时显示引导，不静默失败
- [x] 说一句英文（如 "I'd like a coffee please"），5 秒内收到 `asr:final` 且文本基本正确
- [x] `asr:partial` 以灰色预览显示，`asr:final` 固化到对话区
- [x] ASR 通过 **backend 代理** 实现，API Key 不在 mobile
- [x] 支持 `USE_MOCK_ASR=true` 开发模式（无云凭证时可演示）
- [x] shared 包包含 `audio:start` / `audio:chunk` / `audio:end` / `asr:*` 事件类型

## 阻塞关系

- **Blocked by**：[Issue #02](./issue-02.md)
- **Blocks**：[Issue #04](./issue-04.md)

## Agent 交接

### 前置条件

- Issue #02 完成；backend `.env` 已配置阿里云凭证或 mock 开关

### 范围边界

- **在范围内**：录音 UI、上传协议、AsrModule、转写展示
- **不在范围内**：LLM 回复、TTS 播放、场景剧本、纠错

### 验证步骤

1. 按住说话说一句英文，UI 显示 ASR 文本
2. mock 模式下跑通完整上传→转写流程
3. `grep -r "ALIYUN\|DEEPSEEK" mobile/` 无密钥泄露

### 参考 SPEC 章节

- 2.2 语音对话、5.2 音频/ASR 事件、6.1 环境变量、7.3 禁止事项

## 实现备注

- `backend/src/asr/`：`AsrModule`（`MockAsrService` + `AliyunAsrService`），`USE_MOCK_ASR=true` 切换
- `voice-session.gateway.ts`：缓冲 `audio:chunk`，`audio:end` 触发 ASR 并推送 `asr:partial` / `asr:final`
- `mobile/src/hooks/useAudioRecorder.ts`：16kHz mono PCM 分片上传（`react-native-audio-record`）
- `mobile/src/screens/ConversationScreen.tsx`：按住说话 UI、灰色 partial、固化 final
- `mobile/src/utils/audio-permission.ts`：麦克风权限引导
- Mock 验证：Node 脚本模拟上传 → 429ms 内收到 `asr:final`
- 启动 mock：`USE_MOCK_ASR=true pnpm --filter @airealtalk/backend start:dev`

## 完成备注

- 真机/模拟器验收通过：按住说话 → 转写展示正常
- 转写列表仅存于会话内存，关闭页面后不保留（符合本 Issue 范围；练习历史见 Issue #09）
- `grep` mobile 目录无 `ALIYUN` / `DEEPSEEK` 密钥

**下一项**：[Issue #04 — LLM 回复 → TTS 播放](./issue-04.md)
