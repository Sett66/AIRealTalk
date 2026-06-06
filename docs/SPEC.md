# AIRealTalk 项目需求与开发规约

> **版本**：1.0  
> **状态**：MVP 基线  
> **权威级别**：所有 Phase、Issue 文档及 Agent 实现的**唯一需求源**。冲突时以本文为准。

---

## 1. 产品概述

### 1.1 一句话定义

AIRealTalk 是一款 **AI 驱动英语口语对练** 移动应用：用户在沉浸式场景（面试、点餐、会议）中与 AI 角色进行 **Push-to-Talk 轮流** 语音对话，获得实时转写、AI 语音回应、行内轻提示纠错与会后报告，面向 **CEFR B1–B2** 职场/日常沟通练习。

### 1.2 项目性质

| 维度 | 决策 |
|------|------|
| 用途 | 个人练手项目 |
| 发布 | **不上线**应用商店，不做付费/订阅 |
| 平台 | **Android 优先**；iOS 为 MVP 后迭代 |
| 目标用户 | 大学生 / 职场新人（B1–B2） |
| 网络 | 中国大陆；云服务须国内可稳定访问 |
| 交互 | 轮流对话（MVP 不做全双工实时打断） |

### 1.3 核心用户故事

| ID | 故事 | 优先级 |
|----|------|--------|
| US-01 | 选择场景（面试/点餐/会议）进行针对性练习 | P0 |
| US-02 | 用英语与 AI 语音对话，模拟真实交流 | P0 |
| US-03 | 对话中收到简短纠错提示，意识到严重错误 | P0 |
| US-04 | 练习结束后查看详细报告，复盘语法、表达与发音 | P0 |
| US-05 | 查看历史练习与分数趋势，感知进步 | P1 |
| US-06 | AI 回复自然流畅、延迟可接受，保持沉浸感 | P0 |

---

## 2. 功能需求（MVP）

### 2.1 场景选择

MVP 提供 **3 个固定场景**：

| id | 中文 | 英文 | AI 角色 |
|----|------|------|---------|
| `interview` | 面试 | Job Interview | HR interviewer |
| `restaurant` | 点餐 | Restaurant Ordering | Restaurant server |
| `meeting` | 会议 | Team Meeting | Team colleague |

- 场景元数据：角色、开场白、goals、难度 B1–B2
- 存放于 `backend/src/scenarios/*.json`
- 通过 `GET /scenarios` 下发至 mobile

### 2.2 语音对话

| 项 | 规约 |
|----|------|
| 录音 | 按住说话（Push-to-Talk），松手结束本轮 |
| 链路 | 语音 → ASR → LLM → TTS |
| 格式 | 16 kHz、mono、PCM 或 WAV |
| 延迟 | 用户松手 → AI 开声 **< 3 秒**（局域网） |
| 上传 | 音频经 WS 分片上传，**ASR 在后端调用** |

### 2.3 纠错策略

| 时机 | 行为 | 硬约束 |
|------|------|--------|
| 对话中 | `HintBubble` 轻提示 | 仅 `severity: major`；每轮 ≤ 1 条；**不得打断 TTS** |
| 课后 | `ReportScreen` 详析 | 原文 vs 建议、语法分类、场景完成度 |

### 2.4 发音评测

- MVP：**词/句级**评分（非音素级口型纠正）
- 展示：课后报告中的均分（0–100）与逐句分数
- 提供商：阿里云口语评测（首选）；讯飞 ISE 备选
- 必须通过 backend 代理

### 2.5 可量化反馈

| 指标 | 说明 |
|------|------|
| pronunciationAvg | 发音均分 |
| grammarIssues | 语法问题分类计数 |
| turnCount | 对话轮次 |
| durationSec | 有效发言时长 |
| wpm | 语速（words per minute） |
| goalCoverage | 场景目标覆盖度 0–100 |
| 历史趋势 | 最近 7 次练习折线图（本地） |

### 2.6 账号与数据

- **游客模式**；练习记录 **本地持久化**（MMKV / AsyncStorage）
- MVP **不实现**手机号登录、云同步、付费

---

## 3. 非功能需求

| 类别 | 要求 |
|------|------|
| 安全 | API Key **仅存在于 backend**；禁止出现在 mobile 代码或 APK |
| 性能 | 端到端延迟 < 3s；WS ping/pong 局域网 < 500ms |
| 稳定性 | Phase 5 实现 WS 自动重连；超时可控 |
| 可维护性 | 全 TypeScript strict；共享类型在 `packages/shared` |
| 可测试性 | 每 Issue 有 checkbox 验收标准；支持 mock 云 API |
| 国内适配 | **禁止 Expo**；阿里云 + DeepSeek |

---

## 4. 技术架构

### 4.1 技术栈（强制）

| 层级 | 采用 | 禁止 |
|------|------|------|
| Monorepo | pnpm workspace | npm/yarn 混用 |
| 移动端 | React Native Bare + TypeScript | **Expo** |
| 后端 | NestJS + TypeScript | Python / FastAPI |
| 共享 | `@airealtalk/shared`（类型 + Zod） | 前后端重复定义 |
| 状态 | zustand | — |
| 校验 | Zod | — |
| 云服务 | 阿里云 NLS + 发音评测 + DeepSeek | 客户端直连 |

### 4.2 目录结构

```
AIRealTalk/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── packages/shared/       # @airealtalk/shared
├── mobile/                # @airealtalk/mobile
├── backend/               # @airealtalk/backend
└── docs/
    ├── SPEC.md
    ├── phases/
    └── issues/
```

### 4.3 后端模块

| 模块 | 职责 | 引入 Issue |
|------|------|------------|
| HealthController | 健康检查 | #01 |
| VoiceSessionGateway | WS 会话路由 | #02 |
| AsrModule | 阿里云 ASR | #03 |
| LlmModule | DeepSeek 对话 | #04 |
| TtsModule | 阿里云 TTS | #04 |
| ScenarioModule | 场景配置 | #05 |
| ReportModule | 课后报告 | #08 |
| PronunciationModule | 发音评测 | #09 |

### 4.4 移动端屏幕

| 屏幕 | 引入 Issue |
|------|------------|
| HomeScreen | #01 |
| SceneSelectScreen | #06 |
| ConversationScreen | #03–#07 |
| ReportScreen | #08–#09 |
| HistoryScreen | #09 |

---

## 5. 接口与协议

### 5.1 REST

| 方法 | 路径 | 响应 |
|------|------|------|
| GET | `/health` | `{ status: 'ok', timestamp: string }` |
| GET | `/scenarios` | `Scenario[]` |

### 5.2 WebSocket 事件

所有事件为 `{ type, payload }` 形式，**类型定义在 `packages/shared`**。

**客户端 → 服务端**

| type | payload |
|------|---------|
| `session:connect` | `{ scenarioId?: string }` |
| `session:ping` | `{}` |
| `audio:start` | `{}` |
| `audio:chunk` | `{ data: string }` base64 |
| `audio:end` | `{}` |
| `session:end` | `{}` |

**服务端 → 客户端**

| type | payload |
|------|---------|
| `session:pong` | `{}` |
| `session:phase` | `{ phase: 'processing' \| 'speaking' }` |
| `asr:partial` | `{ text: string }` |
| `asr:final` | `{ text: string; utteranceId: string }` |
| `hint:show` | `{ message: string; severity: 'major' }` |
| `tts:start` | `{}` |
| `tts:chunk` | `{ data: string }` base64 |
| `tts:end` | `{}` |
| `report:ready` | `{ report: SessionReport }` |
| `error` | `{ code: string; message: string }` |

### 5.3 核心共享类型

```typescript
interface Scenario {
  id: string;
  title: string;
  titleEn: string;
  role: string;
  openingLine: string;
  goals: string[];
  difficulty: 'B1' | 'B2' | 'B1-B2';
}

interface LlmTurnResponse {
  reply: string;
  hints: Array<{ severity: 'minor' | 'major'; message: string }>;
  corrections: Array<{
    original: string;
    suggestion: string;
    category: 'tense' | 'preposition' | 'collocation' | 'expression' | 'other';
  }>;
}

type SessionPhase = 'idle' | 'listening' | 'processing' | 'speaking';

interface SessionReport {
  sessionId: string;
  scenarioId: string;
  durationSec: number;
  turnCount: number;
  wpm: number;
  goalCoverage: number;
  pronunciationAvg?: number;
  sentenceScores?: Array<{ text: string; score: number }>;
  corrections: LlmTurnResponse['corrections'];
  grammarIssues: Array<{ type: string; count: number }>;
  summary: string;
}

interface PracticeSummary {
  sessionId: string;
  scenarioId: string;
  scenarioTitle: string;
  date: string;
  pronunciationAvg?: number;
  turnCount: number;
  durationSec: number;
}
```

每个 interface **必须有对应 Zod schema**，导出在同名 `*.schema.ts` 文件。

---

## 6. 云服务

### 6.1 环境变量（`backend/.env`）

```env
PORT=3000
ALIYUN_AK_ID=
ALIYUN_AK_SECRET=
ALIYUN_NLS_APP_KEY=
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
PRONUNCIATION_PROVIDER=aliyun

# 开发 mock 开关（至少实现 ASR/LLM/TTS 之一）
USE_MOCK_ASR=false
USE_MOCK_LLM=false
USE_MOCK_TTS=false
USE_MOCK_PRONUNCIATION=false
```

提供 `backend/.env.example`；**禁止提交 `.env`**。

### 6.2 LLM Prompt 约束

- 注入：场景 role、goals、B1–B2 难度、鼓励语气
- 输出：`response_format: json_object`，符合 `LlmTurnResponse`
- 纠错：每轮 hints ≤ 1，仅 major
- 失败：Zod 校验 → 重试 1 次 → fallback `{ reply: raw, hints: [], corrections: [] }`

### 6.3 Mock 模式

无云凭证时，backend 可通过 mock 开关返回固定 ASR/LLM/TTS/发音数据，保证 Issue 可端到端演示与 CI 友好。

---

## 7. Agent 开发标准

### 7.1 工作流程

1. **必读** `docs/SPEC.md`
2. 阅读目标 `docs/issues/issue-XX.md`
3. 确认 **Blocked by** 前置 Issue 已完成
4. **仅实现当前 Issue 范围**，不提前做后续 Issue
5. 垂直切片：改动贯穿 shared → backend → mobile
6. 逐条勾选验收标准，写入 PR 描述（见 [PR_GUIDE.md](./PR_GUIDE.md)）
7. 通过 Pull Request 合入 `main`，禁止直接 push 功能到主分支

### 7.2 代码规范

| 项 | 要求 |
|----|------|
| 语言 | TypeScript strict |
| 命名 | 文件 kebab-case；组件 PascalCase；常量 UPPER_SNAKE |
| 类型 | 仅定义在 `@airealtalk/shared` |
| 错误 | 后端 `error` WS 事件；mobile 友好提示 |
| 日志 | NestJS Logger；禁止 log 密钥或完整音频 |
| 依赖 | 新增依赖写入对应 package.json |

### 7.3 禁止事项

- 使用 Expo
- API Key 出现在 mobile 或构建产物
- 自定义 WS 事件格式（不经过 shared）
- MVP 实现：付费、账号系统、全双工、VAD 自动切句
- 破坏已完成 Issue 的验收能力

### 7.4 单 Issue 完成定义

- 该 Issue 全部 checkbox 通过
- `pnpm -r build` 通过
- Android 真机/模拟器可演示该 Issue 端到端行为
- 未引入 7.3 禁止项

### 7.6 PR 提交规范

所有新功能通过 **Pull Request** 合入 `main`。完整流程见 [docs/PR_GUIDE.md](./PR_GUIDE.md)。

| 要求 | 说明 |
|------|------|
| 一事一 PR | 每个 PR 只实现一个 Issue 或一项独立功能；大功能拆多个小 PR |
| 标题 | 一句话说明本 PR 新增或修改了什么 |
| 描述三节 | **功能描述**、**实现思路**、**测试方式**（模板：`.github/pull_request_template.md`） |
| 可运行 | 合并后 `main` 须 `pnpm -r build` 通过，Reviewer 可复现演示 |
| 工具 | 推荐 [GitHub CLI](https://cli.github.com/)：`gh auth login` → `gh pr create` |

### 7.5 MVP 完成定义（Issue #10 后）

1. Android 真机 3 场景 ≥ 5 轮英语语音对话
2. 轻提示出现且不阻断 TTS
3. 报告含发音均分 + ≥ 3 条表达纠错 + 语速/轮次
4. 历史页 ≥ 3 条记录 + 趋势图
5. mobile 目录无 API Key

---

## 8. 场景 JSON 模板

```json
{
  "id": "interview",
  "title": "面试",
  "titleEn": "Job Interview",
  "role": "HR interviewer at a tech company",
  "openingLine": "Hi, thanks for coming in today. Could you start by telling me a bit about yourself?",
  "goals": ["自我介绍", "回答行为面试题", "反问环节"],
  "difficulty": "B1-B2"
}
```

`restaurant`、`meeting` 同理，id 与 SPEC 2.1 表一致。

---

## 9. 阶段与 Issue 索引

| Phase | 周期 | Issues | 文档 |
|-------|------|--------|------|
| 0 工程基建 | ~1 周 | #01, #02 | [phase-0.md](./phases/phase-0.md) |
| 1 语音管线 | ~2 周 | #03, #04 | [phase-1.md](./phases/phase-1.md) |
| 2 场景 UI | ~1.5 周 | #05, #06 | [phase-2.md](./phases/phase-2.md) |
| 3 纠错系统 | ~1.5 周 | #07, #08 | [phase-3.md](./phases/phase-3.md) |
| 4 评测历史 | ~1 周 | #09 | [phase-4.md](./phases/phase-4.md) |
| 5 稳定性 | ~1 周 | #10 | [phase-5.md](./phases/phase-5.md) |

**依赖链**：`#01 → #02 → #03 → #04 → #05 → #06 → #07 → #08 → #09 → #10`

Issue 详情：[docs/issues/](./issues/)

---

## 10. 本地开发环境

| 工具 | 版本 |
|------|------|
| Node.js | ≥ 20 LTS |
| pnpm | ≥ 9 |
| JDK | 17 |
| Android Studio | 最新稳定版 |

**网络**：手机与电脑同一局域网；backend `0.0.0.0:3000`；mobile 配置电脑局域网 IP。

**启动顺序**（Issue #01 后适用）：

```bash
pnpm install
pnpm --filter @airealtalk/backend start:dev
pnpm --filter @airealtalk/mobile start
pnpm --filter @airealtalk/mobile android
```

---

## 11. V2 范围外功能

- 全双工实时对话（可打断）
- VAD 自动切句
- iOS 正式适配
- 云同步账号
- 自定义场景
- 雅思/托福考试模式

---

## 附录：文档索引

| 文档 | 读者 | 用途 |
|------|------|------|
| [SPEC.md](./SPEC.md) | 所有 Agent | 需求与规约（最高优先级） |
| [phases/](./phases/) | 阶段负责人 | 阶段目标与风险 |
| [issues/](./issues/) | 执行 Agent | 可领取任务与验收标准 |
| [README.md](../README.md) | 所有人 | 项目简介与导航 |
