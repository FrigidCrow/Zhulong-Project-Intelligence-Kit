# CI 与发布治理

## 远程质量门禁

`.github/workflows/ci.yml` 在 push、pull request 和手动触发时运行名为 `quality` 的 job：

1. 固定 Node.js 24 和 npm 11.12.1。
2. 用 `npm ci --ignore-scripts` 按 `package-lock.json` 安装。
3. 执行权威 `verify:ci` 层；全命令面检查已经在 manifest 中，只运行一次。
4. 执行 `npm pack --dry-run --json` 并用 `verify:pack-report` 检查发布边界。
5. 上传当次生成的 Markdown / JSON verifier 报告，保留 7 天；中转目录使用非隐藏的 `ci-artifacts/`，避免 upload action 默认忽略。
6. 在 Ubuntu 与 macOS 上运行 CLI help 与 `verify:project-profiles` 轻量 smoke；完整视觉与发布 gate 只在 Ubuntu 运行。

所有 GitHub Actions 依赖均固定到完整 commit SHA，版本号仅作为行尾注释，避免可移动 tag 在未审查时改变构建内容。

视觉验证截图写入 `.zl-tmp/visual/`，不上传为 CI artifact，也不进入 npm 包。真实 Ollama / GraphRAG 集成需要本地服务和模型，使用 `npm run verify:local-rag`，不和可重现 CI gate 混在一起。

Windows 当前未进入正式支持矩阵。CLI 仍有 POSIX shell、`command -v` 和路径语义假设；在这些调用被替换并加入 Windows CI 前，README 必须明确该限制。

## 默认分支规则

`.github/rulesets/main.json` 定义了默认分支的目标状态：

- `quality` 必须通过，且分支必须与默认分支同步。
- 单人仓库不强制 approving review，也不要求最后一次 push 由其他人批准。
- 所有 review 会话必须解决。
- 禁止删除分支和 non-fast-forward 更新。

当前策略保留 PR、质量 gate 和会话解决要求，同时避免单人仓库被无法满足的自审规则永久阻断。增加协作者后，可以再把批准人数提高到 1。

应用命令：

```bash
GH_TOKEN="$(gh auth token -u FrigidCrow)" npm run github:ruleset
```

仓库公开后使用 `npm run github:ruleset` 应用该配置。远端 API 返回成功且再次读取到 active ruleset 后，才可以宣称默认分支已经强制执行这些规则。

## GitHub Pages 文档站

`.github/workflows/pages.yml` 在 `main` 的文档相关文件变化后发布静态站。工作流固定 GitHub Actions 到完整 commit SHA，并通过 `verify:pages` 组装允许列表：

- `docs/` 产品、命令、技术与质量页面。
- `templates/cockpit/sample.html` 驾驶舱样例。
- `verification/baselines/` 中经过确认的稳定验证摘要。
- Apache 2.0 `LICENSE`。
- `build-info.json`，记录版本、完整 commit SHA、部署时间和 CSS/JS 内容 hash。

站点构建会给 CSS/JS 加内容 hash 查询参数，并在公开页面页脚注入版本、短 commit SHA 和部署时间，同时补齐 canonical、Open Graph 与 Twitter card 元数据。站点不会包含 `bin/`、`core/`、`runtime/`、`scripts/`、`node_modules/`、`.git/`、图标候选、临时 verifier 报告或符号链接。README 中的 HTML 链接使用 `https://frigidcrow.github.io/Zhulong-Project-Intelligence-Kit/`，因此在 GitHub 点击会打开渲染网页，而不是 blob 源码视图。

## npm 发布决策

截至 2026-07-10，npm registry 查询中 `zhulong-kit` 返回 404，表示当时未查到同名公开包；这不等于已获得名称所有权。当前建议保留无 scope 包名 `zhulong-kit`，并在首次发布前用实际 npm 账户完成占位和 trusted publisher 绑定。

项目已经选择 Apache License 2.0。`package.json` 使用 SPDX 标识 `Apache-2.0`、`private: false`、公开 `publishConfig` 和 provenance；标准文本保存在根目录 `LICENSE`，第三方边界记录在 `THIRD_PARTY_LICENSES.md`。

`verify:release-readiness` 会在包仍为 private、许可证不是 Apache-2.0、缺少许可证/第三方说明、公开发布/provenance 未启用、repository URL 不一致、发布 tag 不匹配版本，或当前仓库状态无法生成所要求的 attestation 时阻断。

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

元数据会追加到 release notes，并与 tarball 一起上传。公开仓库使用 GitHub artifact attestation；发布就绪检查不会为了继续发包而跳过证据。

## 公开仓库治理

- `CONTRIBUTING.md` 定义开发和验证流程。
- `SECURITY.md` 要求通过 GitHub Private Vulnerability Reporting 报告漏洞。
- `CODE_OF_CONDUCT.md`、`SUPPORT.md`、Issue Form 和 Pull Request 模板提供社区入口。
- `.github/dependabot.yml` 每周检查 npm 与 GitHub Actions 更新。
- `verify:public-release` 检查许可证、公开包元数据、Pages 链接、社区文件和常见密钥模式。

`verify:release` 通过单一 manifest 在发布层执行 `verify:public-release`、全命令面、安装 smoke 与其余完整 gate。同一 verifier 每轮只执行一次；当次报告位于被忽略的 `verification/reports/`，只进入短期 CI artifact。

## Kit 本体的后续优化

按工程收益排序，下一轮不需要扩展产品方向，应先改造 kit 自身：

1. 继续把 `src/app.mjs` 中的领域服务迁入现有 docs、rag、graph、policy、workflow、cockpit 边界，但保持 `bin/zl.mjs` 薄启动层与全部兼容入口。
2. 给 `.planning` 制品引入显式 schema version 和向前迁移器，避免后续字段演进只能靠兼容分支堆叠。
3. 为 CLI JSON 输出增加命令级结构化 `data`，但保持 `zhulong-cli-output.v1` 信封向后兼容。
4. 在不引入运行时依赖的前提下，继续提高纯函数单测的分支覆盖率。
5. 活跃仓库继续不跟踪生成截图和图标候选；历史对象清理由所有者在维护窗口单独批准。
