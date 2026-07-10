# ADR 0003：平台支持范围

- 状态：已接受
- 日期：2026-07-10

## 决策

`v0.1.x` 正式支持 Linux 与 macOS，基线为 Node.js 24 和 npm 11。Ubuntu 运行完整 gate，macOS 运行安装、CLI、双项目画像和 workflow smoke。

Windows 暂不属于正式支持平台。当前实现仍存在 POSIX shell、可执行权限、`$PWD` 和路径语义假设；README 必须明确这一限制。

## 升级条件

只有在以下条件全部满足后，Windows 才能进入正式支持：

- 移除或封装核心路径中的 POSIX 专用调用。
- 在 Windows CI 上通过安装、help、`rag none`、workflow 和 pack smoke。
- 文档、补全和路径输出在 PowerShell 环境下具有明确行为。
