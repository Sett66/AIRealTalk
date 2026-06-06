# Pull Request 提交规范

> 本仓库所有新功能、Issue 交付均通过 **Pull Request** 合入 `main`，禁止直接向 `main` push 功能代码。

---

## 1. 基本原则

| 原则 | 说明 |
|------|------|
| 通过 PR 交付 | 每个 Issue / 功能对应一次 PR |
| 一事一 PR | 只实现或修改**一个**功能；大 Issue 拆成多个可独立审查的小 PR |
| 可运行 | 合并后 `main` 必须能 `pnpm install` + `pnpm -r build`；Reviewer 可随时复现演示 |
| 无密钥 | 禁止提交 `.env`、API Key、凭证文件 |

---

## 2. 分支命名

```
feat/issue-XX-简短描述    # 功能（推荐与 Issue 编号对应）
fix/简短描述              # 缺陷修复
docs/简短描述             # 仅文档
```

示例：`feat/issue-04-llm-tts-pipeline`

---

## 3. 提交与推送流程

```bash
# 1. 从最新 main 拉分支
git checkout main
git pull origin main
git checkout -b feat/issue-XX-描述

# 2. 开发 + 验证
pnpm -r build

# 3. 提交（不要包含 .env）
git add <相关文件>
git commit -m "feat: issueXX 一句话摘要"

# 4. 推送
git push -u origin HEAD

# 5. 创建 PR（需已安装并登录 GitHub CLI）
gh pr create
```

### 一次性配置 GitHub CLI

```bash
winget install --id GitHub.cli -e    # 已安装可跳过
gh auth login                        # 选 GitHub.com → HTTPS → 浏览器授权
gh auth status                       # 确认已登录
```

---

## 4. PR 标题与描述（必填四要素）

PR **标题**：一句话说明本 PR 新增或修改了什么。

PR **描述**必须包含以下三节（仓库已提供 [PR 模板](../.github/pull_request_template.md)，创建 PR 时自动填充）：

### 功能描述

- 本 PR 解决什么问题（对应哪个 Issue）
- 用户/开发者如何使用

### 实现思路

- 关键技术选型
- 核心模块与数据流（shared → backend → mobile）
- 与 SPEC / 前置 Issue 的关系

### 测试方式

- [ ] `pnpm -r build` 通过
- [ ] 具体复现步骤（命令、Mock 开关、真机/模拟器操作）
- [ ] 验收标准对照（可引用 `docs/issues/issue-XX.md` checkbox）

---

## 5. PR 描述示例（Issue #04）

**标题：** `feat: Issue #04 实现 ASR 后自动 LLM 回复与 TTS 流式播放`

**描述：**

```markdown
## 功能描述

完成 Issue #04：用户松手后自动 ASR → LLM → TTS，mobile 流式播放并展示 AI 回复文本。

使用：配置 backend/.env → `pnpm dev:backend` → `pnpm android` → 按住说话。

## 实现思路

- shared：`LlmTurnResponseSchema`，`tts:start { reply }`
- backend：`LlmModule` + `TtsModule`，gateway 编排
- mobile：`TtsPlayerModule`（AudioTrack PCM 流式播放）

## 测试方式

- [x] `pnpm -r build`
- [x] `node scripts/verify-issue-04.mjs`（mock 三件套）
- [x] 模拟器端到端：转写 + AI 文本 + 语音播放
```

---

## 6. 审查与合并

1. 作者自检：构建通过、无密钥、Issue 验收项已勾选
2. 创建 PR 后自行或请他人 Review
3. GitHub 上 **Merge pull request** 合入 `main`
4. 本地同步：`git checkout main && git pull origin main`

---

## 7. Agent / 自动化说明

- 完成 Issue 后：创建分支 → 提交 → `gh pr create`，按模板填写三节
- 参考 [SPEC.md §7.6](./SPEC.md#76-pr-提交规范)
- Cursor 规则：`.cursor/rules/pr-workflow.mdc`
