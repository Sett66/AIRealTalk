# AIRealTalk

一款 **AI 英语口语对练 App**（课程作业项目）。用户在面试、点餐、会议等沉浸式场景中与 AI 角色进行 **Push-to-Talk 轮流语音对话**，获得实时语音转写、AI 语音回应、对话中轻提示纠错、课后详析报告，以及本地练习历史与发音趋势。

> 本文档面向**评审复现**：说明项目功能、技术栈、第三方依赖与原创部分，并提供含 API Key 的完整配置与启动步骤。

## 演示视频

**完整功能讲解与效果演示（推荐先看）**：

[![哔哩哔哩演示视频](https://img.shields.io/badge/哔哩哔哩-观看演示视频-00A1D6?style=for-the-badge&logo=bilibili&logoColor=white)](https://www.bilibili.com/video/BV1WSEb6TEUS/)

链接：<https://www.bilibili.com/video/BV1WSEb6TEUS/>

视频涵盖：场景选择 → 多轮语音对话 → 轻提示纠错 → 课后报告 → 练习历史与趋势图；并说明技术架构与发音评测 Mock 情况。详见根目录 [DEMO.md](./DEMO.md)。

---

## 功能概览

| 功能 | 说明 |
|------|------|
| 三场景练习 | 面试、点餐、会议；每场景独立 AI 角色与对话目标 |
| 实时语音对话 | 按住说话 → ASR 转写 → DeepSeek 生成回复 → TTS 朗读 |
| 对话中轻提示 | 针对语法/表达给出简短纠错气泡，**不阻断** AI 语音播放 |
| 课后详析报告 | 发音均分、逐句分数、表达纠错、语速/轮次/场景完成度 |
| 练习历史 | 本地持久化练习记录，最近 7 次发音分折线图，可回看详细报告 |
| 稳定性 | WebSocket 断线指数退避重连、麦克风权限引导、ASR/LLM 超时重试 |

**数据流**：Mobile 录音 → WebSocket 上传 → Backend（ASR → LLM → TTS）→ Mobile 播放；结束练习后 Backend 生成报告并返回 App。

---

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 移动端 | React Native 0.85 + TypeScript | Android 优先，Bare Workflow（**未使用 Expo**） |
| 后端 | NestJS 11 + TypeScript | HTTP 健康检查 + WebSocket 语音会话网关 |
| 共享层 | pnpm Monorepo + `@airealtalk/shared` | 前后端共用 Zod Schema 与 WS 事件协议 |
| 语音识别 ASR | 阿里云 NLS | Backend 代理，Key 不进 Mobile |
| 语音合成 TTS | 阿里云 NLS | Backend 代理；Mobile 自研 Kotlin 模块流式播放 PCM |
| 大语言模型 | DeepSeek API | 场景对话、轻提示纠错、课后报告文案 |
| 发音评测 | Mock（ssapi 后续接入） | 当前为模拟分数，见 [发音评测说明](#发音评测说明mock真实-ssapi-后续接入) |
| 本地存储 | AsyncStorage | 练习摘要与完整报告持久化 |

---

## 目录

- [演示视频](#演示视频)
- [功能概览](#功能概览)
- [技术栈](#技术栈)
- [评审复现指南](#评审复现指南)
- [作品说明与原创性声明](#作品说明与原创性声明)
- [第三方依赖与云服务](#第三方依赖与云服务)
- [原创功能（本项目自行实现）](#原创功能本项目自行实现)
- [环境要求](#环境要求)
- [完整配置说明](#完整配置说明)
- [启动步骤（逐步）](#启动步骤逐步)
- [功能验收路径](#功能验收路径)
- [Mock 模式（备选，无 API Key 时）](#mock-模式备选无-api-key-时)
- [发音评测说明（Mock，真实 ssapi 后续接入）](#发音评测说明mock真实-ssapi-后续接入)
- [常见问题](#常见问题)
- [项目结构](#项目结构)
- [进一步文档](#进一步文档)

---

## 评审复现指南

完整体验语音对话、AI 回复与纠错，**需要配置云 API Key**（阿里云 NLS + DeepSeek）。发音评测当前为 Mock，无需额外 Key。

### 复现前需准备

| 凭证 | 用途 | 申请入口 |
|------|------|----------|
| 阿里云 AccessKey ID / Secret | NLS Token 签发 | [RAM 访问控制](https://ram.console.aliyun.com/manage/ak) |
| 阿里云 NLS AppKey | ASR 语音识别、TTS 语音合成 | [智能语音交互控制台](https://nls-portal.console.aliyun.com/) |
| DeepSeek API Key | LLM 对话与报告 | [DeepSeek 开放平台](https://platform.deepseek.com/) |

### 复现步骤概览

```bash
git clone https://github.com/Sett66/AIRealTalk.git && cd AIRealTalk
pnpm install
cp backend/.env.example backend/.env
# 编辑 backend/.env，填入上述 Key（详见「完整配置说明」）
pnpm -r build

# 终端 1
pnpm dev:backend          # curl http://localhost:3000/health 验证

# 终端 2
pnpm dev:mobile

# 终端 3（Android 模拟器或真机）
pnpm android
```

**App 内操作**：选择场景 → 按住说话进行英语对话（≥3 轮）→ 观察轻提示与 AI 语音 →「结束练习」查看报告 → 首页「练习历史」查看趋势图。

真机调试时将 `mobile/src/config.ts` 中 `DEV_HOST` 改为电脑局域网 IP；模拟器保持默认 `10.0.2.2` 即可。

---
## 作品说明与原创性声明

| 项目 | 说明 |
|------|------|
| 作品类型 | 个人练手 / 课程作业项目 |
| 平台 | Android 优先（React Native Bare，**未使用 Expo**） |
| 架构 | pnpm Monorepo：`mobile` + `backend` + `packages/shared` |
| 密钥安全 | **所有 API Key 仅配置在 `backend/.env`**，mobile 端不含任何密钥 |
| 开源许可 | 个人项目，未指定开源许可证；第三方库遵循各自 License |

**声明**：本项目在 React Native、NestJS 等开源框架之上，自行设计并实现了 WebSocket 会话协议、语音对话状态机、纠错提示策略、课后报告生成、练习历史持久化等业务逻辑；云服务（ASR/TTS/LLM）通过 backend 代理调用，发音评测当前为 Mock 实现（见下文说明）。

---

## 第三方依赖与云服务

### 框架与运行时

| 名称 | 版本 | 用途 | 许可证 |
|------|------|------|--------|
| [React Native](https://reactnative.dev/) | 0.85.3 | 移动端 UI 与原生桥接 | MIT |
| [React](https://react.dev/) | 19.2.3 | UI 组件 | MIT |
| [NestJS](https://nestjs.com/) | 11.x | Backend HTTP/WebSocket 服务 | MIT |
| [TypeScript](https://www.typescriptlang.org/) | 5.x | 全栈类型安全 | Apache-2.0 |
| [pnpm](https://pnpm.io/) | ≥ 9 | Monorepo 包管理 | MIT |
| [Zod](https://zod.dev/) | 3.x | 共享 Schema 校验 | MIT |

### Mobile 第三方库

| 库 | 版本 | 用途 |
|----|------|------|
| [react-native-audio-record](https://github.com/goodatlas/react-native-audio-record) | ^0.2.2 | 麦克风录音（PCM/WAV） |
| [@react-native-async-storage/async-storage](https://github.com/react-native-async-storage/async-storage) | ^3.1.1 | 练习历史本地持久化 |
| [react-native-svg](https://github.com/software-mansion/react-native-svg) | ^15.15.5 | 历史页分数趋势折线图 |
| [react-native-fs](https://github.com/itinance/react-native-fs) | ^2.20.0 | 读取录音文件 |
| [react-native-safe-area-context](https://github.com/AppAndFlow/react-native-safe-area-context) | ^5.5.2 | 安全区布局 |
| [zustand](https://github.com/pmndrs/zustand) | ^5.0.14 | 对话阶段状态管理 |

**Mobile 自研原生模块**（非第三方库，位于 `mobile/android/app/src/main/java/com/airealtalkmobile/`）：

| 模块 | 说明 |
|------|------|
| `TtsPlayerModule.kt` | PCM 流式播放（接收 backend TTS 音频块） |

### Backend 第三方库

| 库 | 版本 | 用途 |
|----|------|------|
| [@nestjs/platform-ws](https://docs.nestjs.com/websockets/adapter) + [ws](https://github.com/websockets/ws) | 11.x / 8.x | WebSocket 网关 |
| [axios](https://axios-http.com/) | ^1.17 | 调用阿里云 NLS、DeepSeek HTTP API |
| [@alicloud/pop-core](https://github.com/aliyun/openapi-core-nodejs-sdk) | ^1.8 | 阿里云 NLS Token 签发 |
| [@nestjs/config](https://docs.nestjs.com/techniques/configuration) | ^4.0 | 环境变量加载 |

### 第三方云服务

| 服务 | 提供商 | 用途 | 申请入口 |
|------|--------|------|----------|
| 语音识别 ASR | 阿里云 NLS | 用户语音转文字 | [智能语音交互](https://nls-portal.console.aliyun.com/) |
| 语音合成 TTS | 阿里云 NLS | AI 回复朗读 | 同上 |
| 大语言模型 LLM | DeepSeek | 场景对话、纠错、报告文案 | [DeepSeek 开放平台](https://platform.deepseek.com/) |
| 口语评测 | 阿里云智能科教 ssapi | **当前未接入真实评测** | [智能科教文档](https://help.aliyun.com/zh/document_detail/2865622.html) |

---

## 原创功能（本项目自行实现）

以下模块/逻辑为**本项目原创设计与实现**，非第三方 SDK 直接提供：

| 模块 | 位置 | 说明 |
|------|------|------|
| WebSocket 会话协议 | `packages/shared/src/ws-events.ts` | 客户端/服务端事件类型、Zod Schema |
| 语音会话网关 | `backend/src/voice-session.gateway.ts` | 连接管理、音频流、ASR→LLM→TTS 管线编排 |
| 对话状态机 | `mobile/src/stores/session-store.ts` + `ConversationScreen` | idle / listening / processing / speaking |
| WS 指数退避重连 | `mobile/src/hooks/useWebSocket.ts` | 断线自动重连，最多 5 次 |
| 轻提示纠错策略 | `backend/src/llm/hint-*.ts` | 仅纠正语言形式，不评价答题内容 |
| 课后报告生成 | `backend/src/report/` | 汇总纠错、语速、轮次、场景完成度 |
| 练习历史与趋势图 | `mobile/src/stores/history-store.ts` + `HistoryScreen` | AsyncStorage 持久化 + SVG 折线图 |
| 三场景配置 | `backend/src/scenarios/*.json` | 面试 / 点餐 / 会议场景与 AI 角色 |
| Mock 服务层 | `backend/src/*/mock-*.service.ts` | 无云凭证时的完整演示链路 |
| Mock 发音评测 | `backend/src/pronunciation/mock-pronunciation.service.ts` | 按转写文本 hash 生成模拟分数 |
| 共享类型包 | `packages/shared/` | 前后端共用的 TypeScript 类型与校验 |

---

## 环境要求

| 工具 | 版本要求 | 说明 |
|------|----------|------|
| Node.js | ≥ 20（mobile 包建议 ≥ 22.11） | [nodejs.org](https://nodejs.org/) |
| pnpm | ≥ 9 | `npm install -g pnpm` |
| JDK | 17 | Android 构建 |
| Android Studio | 最新稳定版 | 含 Android SDK、模拟器 |
| Git | 任意 | 克隆仓库 |

**Android 设备**：模拟器（默认 `10.0.2.2` 访问宿主机）或真机（需配置局域网 IP，见下文）。

---

## 完整配置说明

所有敏感配置位于 **`backend/.env`**（勿提交到 Git）。从模板复制：

```bash
cp backend/.env.example backend/.env
```

### 环境变量一览

| 变量 | 必填 | 说明 |
|------|------|------|
| `PORT` | 否 | Backend 端口，默认 `3000` |
| `ALIYUN_AK_ID` | **是**（真实语音管线） | 阿里云 AccessKey ID（NLS Token 签发） |
| `ALIYUN_AK_SECRET` | **是** | 阿里云 AccessKey Secret |
| `ALIYUN_NLS_APP_KEY` | **是** | 智能语音交互项目 AppKey |
| `DEEPSEEK_API_KEY` | **是** | DeepSeek API Key |
| `DEEPSEEK_BASE_URL` | 否 | 默认 `https://api.deepseek.com` |
| `ALIYUN_PRONUNCIATION_APP_ID` | 否 | ssapi AppId（**当前版本未使用**） |
| `ALIYUN_PRONUNCIATION_APP_SECRET` | 否 | ssapi AppSecret（**当前版本未使用**） |
| `USE_MOCK_ASR` | 否 | `true` 关闭真实 ASR，默认 `false` |
| `USE_MOCK_LLM` | 否 | `true` 关闭真实 LLM，默认 `false` |
| `USE_MOCK_TTS` | 否 | `true` 关闭真实 TTS，默认 `false` |
| `USE_MOCK_PRONUNCIATION` | 否 | `true` = Mock 发音评测，**默认 `true`**（真实 ssapi 尚未接入） |

### 推荐配置（评审复现，真实 ASR / LLM / TTS）

复制 `backend/.env.example` 为 `backend/.env` 后填入：

```env
PORT=3000

# 阿里云 NLS（ASR + TTS）
ALIYUN_AK_ID=你的AccessKeyId
ALIYUN_AK_SECRET=你的AccessKeySecret
ALIYUN_NLS_APP_KEY=你的NLS_AppKey

# DeepSeek LLM
DEEPSEEK_API_KEY=sk-你的DeepSeekKey
DEEPSEEK_BASE_URL=https://api.deepseek.com

# 语音管线使用真实 API
USE_MOCK_ASR=false
USE_MOCK_LLM=false
USE_MOCK_TTS=false

# 发音评测暂用 Mock（ssapi 需 Android SDK，见下文说明）
USE_MOCK_PRONUNCIATION=true
```

> **说明**：`ALIYUN_PRONUNCIATION_APP_ID` / `ALIYUN_PRONUNCIATION_APP_SECRET` 为 ssapi 口语评测凭证，当前版本**尚未使用**，可留空。

### Mobile 网络配置

文件：`mobile/src/config.ts`

```typescript
const DEV_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
```

| 运行环境 | `DEV_HOST` 设置 |
|----------|-----------------|
| Android 模拟器 | 保持 `10.0.2.2`（映射宿主机 localhost） |
| Android 真机 | 改为电脑局域网 IP，如 `192.168.1.100` |
| iOS 模拟器 | `localhost`（MVP 未完整验收 iOS） |

真机调试时需确保：手机与电脑同一 Wi-Fi；电脑防火墙允许 3000 端口入站。

---

## 启动步骤（逐步）

### 1. 克隆与安装

```bash
git clone https://github.com/Sett66/AIRealTalk.git
cd AIRealTalk
pnpm install
```

> `postinstall` 会自动执行 `scripts/link-mobile-deps.js`，为 React Native Android 创建必要的 `node_modules` 链接。

### 2. 配置环境变量

```bash
cp backend/.env.example backend/.env
# 按上文「推荐配置」填入阿里云 NLS 与 DeepSeek Key
```

### 3. 编译

```bash
pnpm -r build
```

### 4. 启动 Backend（终端 1）

```bash
pnpm dev:backend
```

验证：

```bash
curl http://localhost:3000/health
# 期望返回健康状态
```

### 5. 启动 Metro（终端 2）

```bash
pnpm dev:mobile
```

### 6. 构建并安装 App（终端 3）

```bash
pnpm android
```

首次构建需下载 Gradle 依赖，耗时较长。若模拟器无麦克风输入，请在 Android Studio → Extended Controls → Microphone 启用虚拟麦克风。

### 7. 常用命令

```bash
pnpm -r build          # 编译 shared + backend + mobile 类型检查
pnpm lint              # 各包 lint
pnpm dev:backend       # Backend 热重载
pnpm dev:mobile        # Metro bundler
pnpm android           # 构建安装 Android App
```

---

## 功能验收路径

按以下顺序操作，可验证 MVP 全部核心功能：

1. **场景选择**：首页选择「面试」「点餐」或「会议」之一
2. **语音对话**：连接成功后 AI 播放开场白 → 按住「按住说话」录音 → 松手等待 ASR + AI 回复
3. **轻提示**：对话中可能出现黄色提示气泡（语法/表达纠错），**不阻断** AI 语音播放
4. **多轮练习**：重复 ≥3 轮（建议 ≥5 轮以充分体验）
5. **课后报告**：点击「结束练习」→ 查看发音均分、逐句分数、语法纠错、语速/轮次统计
6. **练习历史**：返回首页 →「练习历史」→ 列表 + 最近 7 次分数折线图 → 点击摘要可回看详细报告
7. **持久化**：关闭 App 重新打开，历史记录仍在

**稳定性相关**（Issue #10）：

- 断网后 App 显示重连状态（指数退避，最多 5 次）
- 拒绝麦克风权限时显示引导页（含跳转系统设置）
- ASR/LLM 超时时显示错误与「重试」按钮

---

## Mock 模式（备选，无 API Key 时）

若暂时无法申请云凭证，可将 `backend/.env` 中 ASR/LLM/TTS 全部设为 Mock，用于验证 UI 流程与报告链路。**此模式下无法识别真实语音、AI 回复为固定内容，不能代表完整产品体验**，仅作开发/兜底用途。

```env
USE_MOCK_ASR=true
USE_MOCK_LLM=true
USE_MOCK_TTS=true
USE_MOCK_PRONUNCIATION=true
```

| 能力 | Mock 行为 | 真实 API 行为 |
|------|-----------|---------------|
| ASR | 固定返回 `"I'd like a coffee please"` | 识别用户实际语音 |
| LLM | 固定 JSON 回复 + 示例纠错 | DeepSeek 场景化对话 |
| TTS | 占位 PCM | 阿里云 NLS 合成语音 |
| 发音评测 | 按文本 hash 模拟 60–95 分 | **未接入** ssapi |

修改 `USE_MOCK_*` 后重启 backend 生效，Mobile 无需改动。

**自动化验证脚本**（Mock 模式下可选）：

```bash
node scripts/verify-issue-10.mjs   # 静态检查：无密钥泄露、重连/超时配置
node scripts/verify-issue-09.mjs # 需 backend 已启动且 Mock 发音评测
```

---

## 发音评测说明（Mock，真实 ssapi 后续接入）

### 当前实现

- 默认 **`USE_MOCK_PRONUNCIATION=true`**
- Mock 服务：`backend/src/pronunciation/mock-pronunciation.service.ts`
- 报告中的「发音均分」「逐句分数」为**模拟数据**，用于打通报告展示与历史趋势链路
- 分数随 ASR 转写文本变化（非真实音频分析）

### 为何未接入真实 ssapi 口语评测

阿里云智能科教口语评测（ssapi）的官方接入方式为：

1. **Backend**：调用 `https://api.cloud.ssapi.cn/auth/authorize` 获取 `warrant_id`（已实现骨架，见 `backend/src/pronunciation/aliyun-pronunciation.client.ts`）
2. **Android 端**：必须使用官方 **SingEngine Android SDK** 进行评测，并传入 backend 下发的 `warrant_id`
3. **Backend 直连 WebSocket**（`wss://api.cloud.ssapi.cn`）在实测中不可用（404），不符合官方文档要求

因此 MVP 阶段采用 Mock 发音评测；真实接入需新增 Android 原生模块 + backend 授权 API，作为**后续迭代**（已搁置，不影响其他功能评审）。

### 对评审的影响

- **ASR / LLM / TTS**：配置 Key 后为真实云服务，可完整体验语音对话与 AI 纠错
- **发音分数**：报告与历史页中的均分/逐句分为 **Mock 模拟值**，不代表真实发音水平
- 代码中已预留 `AliyunPronunciationService` 与 authorize 逻辑，真实 ssapi 接入为后续迭代

---

## 常见问题

| 现象 | 原因与处理 |
|------|------------|
| App 显示「已断开」 | Backend 未启动；或真机 `config.ts` IP 配置错误 |
| App 显示「连接失败」 | 自动重连 5 次失败；检查 backend 与网络，点击「手动重连」 |
| 录音按钮灰色 / 无反应 | 未授予麦克风权限 → 按引导页开启；或模拟器未启用 Mic |
| 录音原生模块未加载 | 执行 `pnpm install` 后重新 `pnpm android` |
| ASR/LLM 超时 | 检查网络与 API Key 是否有效、账户余额是否充足 |
| DeepSeek 401 / 402 | Key 无效或余额不足，见 backend 日志 |
| 阿里云 ASR 失败 | 确认 NLS 项目已开通、AppKey 与 AccessKey 匹配 |
| 报告生成失败 | 至少完成 1 轮对话后再点「结束练习」 |
| Mock ASR 不识别我说的话 | 预期行为；Mock 固定返回预设文本，切换真实 ASR 即可 |
| 发音分每次差不多 | Mock 模式下正常；真实 ssapi 尚未接入 |

---

## 项目结构

```
AIRealTalk/
├── packages/shared/          # @airealtalk/shared — 前后端共享类型、Zod Schema、WS 协议
├── backend/                  # @airealtalk/backend — NestJS WebSocket + REST
│   ├── src/
│   │   ├── asr/              # 语音识别（阿里云 + Mock）
│   │   ├── llm/              # 大模型对话与纠错（DeepSeek + Mock）
│   │   ├── tts/              # 语音合成（阿里云 + Mock）
│   │   ├── pronunciation/    # 发音评测（Mock；ssapi 骨架）
│   │   ├── report/           # 课后报告生成
│   │   ├── scenario/         # 三场景配置加载
│   │   └── voice-session.gateway.ts
│   ├── src/scenarios/        # interview / restaurant / meeting JSON
│   └── .env.example          # 环境变量模板（复制为 .env）
├── mobile/                   # @airealtalk/mobile — React Native Android App
│   ├── src/screens/          # 首页、对话、报告、历史
│   ├── src/hooks/            # WebSocket、录音、TTS 播放
│   ├── src/stores/           # 会话状态、历史持久化
│   └── android/              # Kotlin 原生模块（TtsPlayer）
├── scripts/                  # postinstall、verify-issue-XX 验证脚本
└── docs/                     # SPEC、Phase、Issue 开发文档
```

---

## 进一步文档

| 文档 | 说明 |
|------|------|
| [docs/SPEC.md](docs/SPEC.md) | 需求、架构、协议规约（权威） |
| [docs/issues/README.md](docs/issues/README.md) | 10 个 Issue 开发任务索引 |
| [docs/PR_GUIDE.md](docs/PR_GUIDE.md) | Pull Request 提交规范 |

### 项目完成状态

MVP 已全部交付（Issue #01–#10 ✅）。发音真实 ssapi 评测为已知后续项，当前不影响评审复现。

---

## 许可证

个人练手 / 课程作业项目，未指定开源许可证。所使用的第三方框架与库遵循各自的开源许可证；云服务需自行申请 API Key 并遵守服务商使用条款。
