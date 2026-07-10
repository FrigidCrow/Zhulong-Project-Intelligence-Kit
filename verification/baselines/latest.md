# Zhulong 稳定验证基线

## 基线身份

- 名称：`engineering-consolidation-start`
- 日期：2026-07-10
- 来源 commit：`36d2fe20e651b06a03d00b477d46c382b9c638b8`
- 状态：PASS
- Node.js：24.14.0
- npm：11.12.1

## 已证明结果

- `npm run verify:quality`：PASS。
- `npm run verify:full-command-surface`：PASS，74 / 74。
- GitHub Actions CI：PASS，run `29070642695`。
- 运行时 npm 依赖：0。

## 收口前体积

- npm 压缩包：2,152,246 bytes。
- npm 解包体积：2,577,433 bytes。
- Git pack：约 170.78 MiB。

这些体积是工程收口开始时的对照值，不是目标值。后续稳定基线应记录优化后的 npm 包、Git pack、双项目画像和跨平台结果。

## 证据保存策略

- 本文件和 `latest.json` 是可提交、可由 Pages 引用的稳定摘要。
- 当次 verifier 明细写入 `verification/reports/`，不进入 Git。
- Playwright 截图写入 `.zl-tmp/visual/`，不进入 Git 或 npm 包。
- CI 文本报告作为 7 天 artifact 保存。
