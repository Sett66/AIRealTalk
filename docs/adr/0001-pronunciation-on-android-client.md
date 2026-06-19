# ADR 0001：发音评测在 Android 端侧执行

## 状态

已接受

## 背景

阿里云智能科教口语评测（ssapi）要求：

1. Backend 调用 `/auth/authorize` 获取 `warrant_id`（持有 `app_secret`）
2. 客户端使用官方 SDK 或兼容协议完成打分

项目在 Node 侧直连 `wss://api.cloud.ssapi.cn` 实测不可用；MVP 曾用 Mock 分数打通报告链路。

## 决策

- Backend **仅代理授权**：`POST /pronunciation/authorize` 返回 `warrant_id` 与短时 WebSocket 连接签名（`sig`、`connectId` 等），`app_secret` 永不出服务端。
- Android **原生模块** `PronunciationEngine` 在课后批量评测缓存的 WAV，经 WebSocket 提交至 ssapi，结果通过 `pronunciation:submit` 回传 backend。
- Gateway 在真实模式下等待 mobile 提交（`PRONUNCIATION_WAIT_MS`），优先一次 `report:ready`；超时则两阶段 `report:pronunciation_ready`。
- Mock 模式（`USE_MOCK_PRONUNCIATION=true`）保留 backend mock，供 CI 与无 Key 演示。

## 后果

- 正面：符合官方「密钥服务端、评测客户端」模型；评审可在配置 Key 后获得真实发音分。
- 负面：iOS 暂未实现端侧评测；需缓存每轮 WAV 占用短暂磁盘。
- 后续：若 Maven 可拉取 SingEngine aar，可将 `SsapiWebSocketEvaluator` 替换为官方 SDK 实现，对外 Bridge 接口不变。
