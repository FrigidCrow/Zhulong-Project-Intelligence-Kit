# CI 与发布治理

## 远程质量门禁

`.github/workflows/ci.yml` 在 push、pull request 和手动触发时运行名为 `quality` 的 job：

1. 固定 Node.js 24 和 npm 11.12.1。
2. 用 `npm ci --ignore-scripts` 按 `package-lock.json` 安装。
3. 执行 `verify:quality` 和 `verify:full-command-surface`。
4. 执行 `npm pack --dry-run --json` 并用 `verify:pack-report` 检查发布边界。
5. 仅上传当次变更的 Markdown / JSON verifier 报告，保留 7 天。

所有 GitHub Actions 依赖均固定到完整 commit SHA，版本号仅作为行尾注释，避免可移动 tag 在未审查时改变构建内容。

视觉验证截图写入 `.zl-tmp/visual/`，不上传为 CI artifact，也不进入 npm 包。真实 Ollama / GraphRAG 集成需要本地服务和模型，使用 `npm run verify:quality:local-rag`，不和可重现 CI gate 混在一起。

## 默认分支规则

`.github/rulesets/main.json` 定义了默认分支的目标状态：

- `quality` 必须通过，且分支必须与默认分支同步。
- 至少一个 approving review，最后一次 push 需由其他审核者批准。
- 所有 review 会话必须解决。
- 禁止删除分支和 non-fast-forward 更新。

该 review 策略需要至少一名其他协作者；如果仓库始终由单人维护，启用前需将评审人数调整为可实际执行的策略。

应用命令：

```bash
GH_TOKEN="$(gh auth token -u FrigidCrow)" npm run github:ruleset
```

当前仓库是 GitHub Free 下的私有仓库，GitHub API 会拒绝启用该 ruleset。保持私有时需升级到 GitHub Pro / Team；或者在所有者明确同意后改为公开仓库。配置文件可先随代码审查，但在 API 成功前不宣称远程已强制。

## npm 发布决策

截至 2026-07-10，npm registry 查询中 `zhulong-kit` 返回 404，表示当时未查到同名公开包；这不等于已获得名称所有权。当前建议保留无 scope 包名 `zhulong-kit`，并在首次发布前用实际 npm 账户完成占位和 trusted publisher 绑定。

许可证仍需所有者决策：

- 如果开源，本项目默认建议 Apache-2.0，它对工程工具提供明确的专利授权条款。
- 如果追求最简授权文本，可选 MIT。
- 如果继续私有，保持 `private: true` 和 `UNLICENSED`，不执行 npm 公开发布。

`verify:release-readiness` 会在 `private` 未关闭、许可证未选定、repository URL 不一致、发布 tag 不匹配版本，或当前仓库状态无法生成所要求的 attestation 时阻断。

## Trusted Publishing

`.github/workflows/release.yml` 仅在 GitHub Release 发布时运行，并绑定 `npm` environment。该 environment 已在远程创建，只允许 `v*` tag 部署；当前 GitHub 套餐不支持再加人工审批规则。npm 端需在目标包的 Trusted Publisher 中配置：

- GitHub owner：`FrigidCrow`
- Repository：`Zhulong-Project-Intelligence-Kit`
- Workflow：`release.yml`
- Environment：`npm`

工作流只请求 GitHub OIDC 的 `id-token: write`，不读取 `NPM_TOKEN`。升级 GitHub 套餐后，再给 `npm` environment 增加所有者审批。

## 制品证据

发布工作流会生成：

- npm tarball。
- `release-metadata.json` 和 `release-metadata.md`。
- SHA-256、Node.js / npm 版本、commit、74 条逻辑命令和 75 个 npm bin 入口。
- 公开仓库上的 GitHub artifact attestation。

元数据会追加到 release notes，并与 tarball 一起上传。GitHub Free 不支持为私有仓库生成 artifact attestation；发布就绪检查会在当前私有状态下直接阻断，而不跳过证据后继续发包。

## Kit 本体的后续优化

按工程收益排序，下一轮不需要扩展产品方向，应先改造 kit 自身：

1. 拆分 `bin/zl.mjs`。当前约 8,800 行、370 余个函数，应先抽出 CLI router、docs、graph、policy、workflow、cockpit 六个域模块，保持命令兼容。
2. 降低验证制品对 Git 的污染。报告中的时间戳、临时绝对路径和全量 stdout 会造成大量无语义 diff；应改为确定性摘要，并只跟踪必要的 latest 基线。
3. 清理仓库体积。当前大量历史截图和图标候选已进入 Git 历史；先停止新增生成截图，再由所有者单独批准历史改写或 Git LFS 迁移。
4. 为拆分后的纯函数增加 Node test runner 单元测试和覆盖率阈值，减少当前过度依赖端到端脚本的反馈时间。
5. 给 `.planning` 制品引入显式 schema version 和向前迁移器，避免后续字段演进只能靠兼容分支堆叠。
