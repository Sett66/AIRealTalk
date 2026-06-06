# AIRealTalk

一款面向 **B1-B2** 学习者的英语口语练习 App（个人练手项目）。

## 快速开始

```bash
pnpm install
pnpm dev:backend    # http://localhost:3000/health
pnpm dev:mobile     # 终端1: Metro
pnpm android        # 终端2: 安装到模拟器/真机
```

- 模拟器访问 backend: `10.0.2.2:3000`（见 mobile/src/config.ts）
- 真机需改 config.ts 为电脑局域网 IP

## 文档

- [SPEC](docs/SPEC.md) | [Issues](docs/issues/README.md) | [Issue #01](docs/issues/issue-01.md)

## 结构

`packages/shared` | `backend` (NestJS) | `mobile` (React Native)

`pnpm install` 后 `postinstall` 会为 RN Android 创建 `mobile/node_modules` junction。