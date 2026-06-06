# Issue #01：Monorepo TypeScript 基建

**父文档（权威）**：[docs/SPEC.md](../SPEC.md)  
**状态**：✅ 已完成（2026-06-06）

## 要构建什么（端到端纵向切片）

建立 AIRealTalk 的 **pnpm monorepo** 基础工程：React Native bare + TypeScript 移动端、NestJS + TypeScript 后端、共享类型包。本 Issue 不包含业务对话能力，仅保证依赖可安装、可编译、可运行占位应用与健康检查。

交付物包括：

- 仓库根目录 `pnpm-workspace.yaml`、根 `package.json` 脚本（`dev` / `build` / `lint`）
- `mobile/`：RN bare TS，启动后展示占位首页与 backend 健康状态
- `backend/`：NestJS，暴露 `GET /health` 返回 `{ status: 'ok', timestamp: string }`
- `packages/shared`：导出 `HealthResponse`、WebSocket 事件**占位类型**（命名与 SPEC 对齐）
- `backend/.env.example`（不含密钥）
- `.gitignore` 排除 `.env`、`node_modules`、构建产物
- `scripts/link-mobile-deps.js`：pnpm hoist 场景下为 RN Android 创建 `mobile/node_modules` junction

## 验收标准

- [x] 根目录执行 `pnpm install` 无错误
- [x] `pnpm -r build` 三包（shared / backend / mobile 类型检查）通过
- [x] `pnpm --filter @airealtalk/backend start:dev` 后 `GET /health` 返回 200
- [x] RN 应用在 Android 模拟器/真机可启动并显示占位 UI（无红屏）
- [x] `packages/shared` 可被 mobile 与 backend 引用，无循环依赖
- [x] 无 `.env`、密钥提交进仓库

## 阻塞关系

- **Blocked by**：无（可 AFK 独立开工）
- **Blocks**：[Issue #02](./issue-02.md)

## Agent 交接

### 前置条件

- 已阅读 [SPEC.md](../SPEC.md) 第 4 节（技术架构）、第 7 节（Agent 标准）、第 10 节（本地环境）
- 本机已安装 Node.js >= 20、pnpm >= 9、JDK 17、Android Studio

### 范围边界

- **在范围内**：目录结构、TS 配置、workspace 包名 `@airealtalk/*`、健康检查、共享包骨架、ConfigModule 骨架
- **不在范围内**：WebSocket、音频、ASR/LLM/TTS、场景 JSON、生产部署

### 验证步骤

1. 克隆后 `pnpm install`
2. 启动 backend，`curl http://localhost:3000/health`
3. 启动 Metro + `pnpm android`，确认占位页与健康状态

### 参考 SPEC 章节

- 4.1 技术栈、4.2 目录结构、7.1 工作流程、7.3 禁止事项

## 完成备注

- Android 构建：pnpm hoist 后依赖在根 `node_modules`，通过 `postinstall` junction 解决 RN Gradle 路径问题
- 模拟器 backend 地址：`10.0.2.2:3000`（`mobile/src/config.ts`）
