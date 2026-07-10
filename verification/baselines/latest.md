# Zhulong 稳定验证基线

## 基线身份

- 名称：`v0.1.0-engineering-consolidation-main`
- 日期：2026-07-10
- 来源 commit：`e0420311bbaf914673fe83bfe350834abc2a5954`
- 状态：PASS
- Node.js：24（远端 CI）
- npm：11.12.1

## 已证明结果

- `npm run verify:release`：PASS，40 / 40，0 skipped。
- `npm test`：PASS，25 / 25。
- integration：PASS 132，FAIL 0，WARN 1。
- 全命令面：PASS，74 / 74；npm bin 入口 75 个。
- 双项目画像：PASS，文档密集型与非文档密集型 `rag none` 各 1 套。
- tarball 安装 smoke：PASS，验证 `zhulong`、`zl`、`zl-init` 与 `zl-codebase-scan`。
- GitHub Actions：PASS，run `29082908708`；Ubuntu/macOS smoke 与 Ubuntu quality 均通过。
- CodeQL：PASS，run `29082908287`；JavaScript/TypeScript、GitHub Actions 与聚合检查均通过。
- 运行时 npm 依赖：0。

## 分发体积

- npm 压缩包：467,089 bytes。
- npm 解包体积：900,274 bytes。
- npm 文件数：124。
- 当前远端 Git 历史仍约 170.78 MiB。
- 隔离历史瘦身演练后的 Git pack：约 2.59 MiB；远端替换仍需所有者单独确认。

## 证据保存策略

- 本文件和 `latest.json` 是可提交、可由 Pages 引用的稳定摘要。
- 当次 verifier 明细写入 `verification/reports/`，不进入 Git。
- Playwright 截图写入 `.zl-tmp/visual/`，不进入 Git 或 npm 包。
- CI 文本报告作为 7 天 artifact 保存。
