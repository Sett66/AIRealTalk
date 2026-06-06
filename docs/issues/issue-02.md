# Issue #02：WebSocket 会话连通

**父文档（权威）**：[docs/SPEC.md](../SPEC.md)

## 要构建什么（端到端纵向切片）

在 Issue #01 基建之上，建立 mobile 与 backend 之间的 **WebSocket 双向通信**：连接建立、心跳 ping/pong、断线状态展示。本 Issue 不涉及音频与业务逻辑，仅验证会话通道可用。

交付物包括：

- `packages/shared` 定义 `WsEventMap`（`session:connect`、`session:ping`、`session:pong`）
- backend `VoiceSessionGateway`（NestJS `@WebSocketGateway`）
- mobile `useWebSocket` hook + 调试 UI 连接状态指示灯
- backend 监听 `0.0.0.0:3000`，mobile 通过局域网 IP 连接

## 验收标准

- [ ] mobile 启动后自动连接 WS，状态显示「已连接」（绿色）
- [ ] 发送 `session:ping` 后 500ms 内收到 `session:pong`（局域网）
- [ ] 关闭 backend 后 mobile 显示「已断开」（红色）
- [ ] 所有 WS 事件类型来自 `@airealtalk/shared`，无手写字符串散落
- [ ] 不破坏 Issue #01 的 `/health` 与构建

## 阻塞关系

- **Blocked by**：[Issue #01](./issue-01.md)
- **Blocks**：[Issue #03](./issue-03.md)

## Agent 交接

### 前置条件

- Issue #01 验收标准全部通过
- 手机与开发机在同一局域网

### 范围边界

- **在范围内**：WS Gateway、心跳、连接状态 UI、shared 事件类型
- **不在范围内**：音频上传、ASR、LLM、TTS、场景

### 验证步骤

1. 启动 backend，记录局域网 IP
2. mobile 配置 WS URL 为 `ws://<IP>:3000`
3. 观察连接指示灯，触发 ping/pong
4. 停止 backend，确认断线状态

### 参考 SPEC 章节

- 5.2 WebSocket 事件、4.3 VoiceSessionGateway、7.2 代码规范
