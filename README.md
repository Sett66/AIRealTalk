# AIRealTalk

一款面向 **B1–B2** 学习者的英语口语练习 App（个人练手项目）。在面试、点餐、会议等真实场景下，与 AI 进行**轮流语音对话**，获得发音评分、语法/表达纠错与课后总结。

## 功能概览

- 场景选择（面试 / 点餐 / 会议）
- 实时语音对话（ASR → DeepSeek → TTS）
- 对话中轻提示纠错 + 课后详析报告
- 练习历史列表、发音趋势折线图、点击摘要回看详细报告

> **发音评测说明**：当前默认使用 **mock 发音评测**（按转写文本生成模拟分数，用于打通报告与历史链路）。阿里云 ssapi 口语评测需端侧 SDK（Android SDK + backend 授权 `warrant_id`），backend 直连 WebSocket 暂不可用；真实发音评分将在后续迭代接入。

## 技术栈

| 层级 | 技术 |
|------|------|
| 移动端 | React Native Bare + TypeScript（Android 优先，**不用 Expo**） |
| 后端 | NestJS + TypeScript |
| 共享 | pnpm monorepo + `@airealtalk/shared`（Zod schema） |
| 云服务 | 阿里云 NLS（ASR/TTS）、DeepSeek LLM；发音评测 mock（后续接 ssapi） |

## 文档导航

**所有 Agent 必须先读** → [**需求与开发规约**](docs/SPEC.md)

| 文档 | 说明 |
|------|------|
| [SPEC.md](docs/SPEC.md) | 需求、架构、协议、Agent 标准（最高优先级） |
| [PR_GUIDE.md](docs/PR_GUIDE.md) | **Pull Request 提交规范**（标题、描述、分支流程） |
| [Issues 索引](docs/issues/README.md) | 10 个可独立领取的垂直切片任务 |
| [Phase 0 — 工程基建](docs/phases/phase-0.md) | Monorepo + WebSocket |
| [Phase 1 — 语音管线](docs/phases/phase-1.md) | ASR + LLM + TTS |
| [Phase 2 — 场景 UI](docs/phases/phase-2.md) | 三场景 + 状态机 |
| [Phase 3 — 纠错系统](docs/phases/phase-3.md) | 轻提示 + 报告 |
| [Phase 4 — 评测历史](docs/phases/phase-4.md) | 发音分 + 趋势图 |
| [Phase 5 — 稳定性](docs/phases/phase-5.md) | MVP 验收 |

## 开发顺序

```
Issue #01 → #02 → #03 → #04 → #05 → #06 → #07 → #08 → #09 → #10
```

每个 Issue 文档：`docs/issues/issue-XX.md`（含验收标准与 Agent 交接说明）。

## 快速开始

### 环境要求

- Node.js ≥ 20、pnpm ≥ 9、JDK 17、Android Studio
- Android 模拟器或真机

### 安装与运行

```bash
pnpm install          # postinstall 会为 RN Android 创建 mobile/node_modules junction
pnpm dev:backend      # http://localhost:3000/health
pnpm dev:mobile       # 终端 1：Metro
pnpm android          # 终端 2：构建并安装到模拟器/真机
```

| 场景 | Backend 地址配置 |
|------|------------------|
| Android 模拟器 | 默认 `10.0.2.2:3000`（见 `mobile/src/config.ts`） |
| 真机 | 将 `mobile/src/config.ts` 改为电脑局域网 IP |

### Mock 模式（无云凭证或发音评测）

在 `backend/.env` 中可设置：

```env
USE_MOCK_ASR=true
USE_MOCK_LLM=true
USE_MOCK_TTS=true
USE_MOCK_PRONUNCIATION=true   # 默认 true；真实 ssapi 评测待后续接入
```

验证 Issue #09：`node scripts/verify-issue-09.mjs`（需 backend mock 三件套 + `USE_MOCK_PRONUNCIATION=true`）

验证 Issue #10 稳定性项：`node scripts/verify-issue-10.mjs`（静态检查：无密钥泄露、重连/超时配置）

### 首次本地启动（完整步骤）

1. **克隆与依赖**
   ```bash
   git clone https://github.com/Sett66/AIRealTalk.git
   cd AIRealTalk
   pnpm install
   ```

2. **Backend 环境变量**
   ```bash
   cp backend/.env.example backend/.env
   # 编辑 backend/.env，填入阿里云 NLS 与 DeepSeek Key
   # 无云凭证时可全部设为 mock：
   # USE_MOCK_ASR=true USE_MOCK_LLM=true USE_MOCK_TTS=true USE_MOCK_PRONUNCIATION=true
   ```

3. **启动 Backend**（终端 1）
   ```bash
   pnpm dev:backend
   # 验证：curl http://localhost:3000/health 应返回 ok
   ```

4. **启动 Metro**（终端 2）
   ```bash
   pnpm dev:mobile
   ```

5. **构建并安装 App**（终端 3）
   ```bash
   pnpm android
   # 首次构建较慢，需 Android Studio + JDK 17
   ```

6. **网络配置**
   - **模拟器**：默认 `10.0.2.2:3000`，无需改配置
   - **真机**：将 `mobile/src/config.ts` 中 `DEV_HOST` 改为电脑局域网 IP，确保手机与电脑同一 Wi-Fi

7. **验收流程**
   - 选择任一场景，完成 ≥5 轮按住说话对话
   - 对话中出现轻提示且不阻断 TTS 播放
   - 点击「结束练习」→ 查看报告（发音分 + 纠错 + 统计）
   - 首页进入「练习历史」→ 确认记录与趋势图

### 常见问题

| 现象 | 排查 |
|------|------|
| App 显示「已断开」 | 确认 backend 已启动；真机检查 IP 配置 |
| 录音无反应 | 授予麦克风权限；模拟器需在 Extended Controls 启用 Mic |
| ASR/LLM 超时 | 检查网络；mock 模式下不应超时 |
| 报告生成失败 | 至少完成 1 轮对话；backend 日志查看具体错误 |

### 常用命令

```bash
pnpm -r build         # 编译 shared + backend + mobile 类型检查
pnpm lint             # 各包 lint
```

### 提交代码（PR 规范）

新功能通过 **Pull Request** 合入 `main`，详见 [docs/PR_GUIDE.md](docs/PR_GUIDE.md)。

```bash
# 一次性：安装并登录 GitHub CLI
winget install --id GitHub.cli -e
gh auth login

# 每个 Issue 完成后
git checkout -b feat/issue-XX-描述
git push -u origin HEAD
gh pr create    # 按模板填写：功能描述 / 实现思路 / 测试方式
```

## 项目结构

```
AIRealTalk/
├── packages/shared/     # @airealtalk/shared — 类型与 Zod schema
├── backend/             # @airealtalk/backend — NestJS
├── mobile/              # @airealtalk/mobile — React Native
├── scripts/             # postinstall、verify-issue-XX 等
└── docs/                # SPEC、Phase、Issue 文档
```

## Agent 快速上手

1. 阅读 [docs/SPEC.md](docs/SPEC.md)
2. MVP 已交付；后续迭代见 SPEC 附录（全双工、VAD、iOS 等）
3. 确认前置 Issue 已完成再领取任务
4. **禁止** Expo、禁止 API Key 写入 mobile

## 本地环境（云服务，Issue #03 起需要）

- 阿里云 NLS + DeepSeek API Key → 复制 `backend/.env.example` 为 `backend/.env`
- 口语评测 AppKey/AppSecret（智能科教平台）→ 可选；未配置或 `USE_MOCK_PRONUNCIATION=true` 时使用 mock
- Android 真机与电脑同一局域网

## 项目状态

**当前进度**：MVP 已交付 — [Issue #10 稳定性 + MVP 验收](docs/issues/issue-10.md) ✅

| Issue | 状态 |
|-------|------|
| [#01](docs/issues/issue-01.md) Monorepo 基建 | ✅ |
| [#02](docs/issues/issue-02.md) WebSocket 会话连通 | ✅ |
| [#03](docs/issues/issue-03.md) ASR 语音转写 | ✅ |
| [#04](docs/issues/issue-04.md) LLM + TTS | ✅ |
| [#05](docs/issues/issue-05.md) 单场景完整对话环 | ✅ |
| [#06](docs/issues/issue-06.md) 三场景 + UI 状态机 | ✅ |
| [#07](docs/issues/issue-07.md) 对话中轻提示纠错 | ✅ |
| [#08](docs/issues/issue-08.md) 课后详析报告 | ✅ |
| [#09](docs/issues/issue-09.md) 发音评测 + 练习历史 | ✅（发音 mock，真实 ssapi 待后续） |
| [#10](docs/issues/issue-10.md) 稳定性 + MVP 验收 | ✅ |

## 许可证

个人练手项目，未指定开源许可证。
