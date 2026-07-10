# Zhulong Changelog

Date: 2026-06-25
Full name: **Zhulong Project Intelligence Kit**
Documentation abbreviation: **Zhulong**
Command namespace: **`zl-*`**

## 2026-07-10：工程收口、CLI 契约与可追踪 Pages

- `bin/zl.mjs` 缩为启动层，领域命令进入 `src/` 模块边界；新增 Node.js 内置测试覆盖参数、路由、策略、稳定 JSON 和验证 manifest。
- `verify:ci`、`verify:release`、`verify:local-rag` 改由单一 DAG manifest 调度，一轮内不重复执行同一 verifier，并输出唯一汇总索引。
- 新增统一 `--json`、`--quiet`、`--no-color`、稳定退出码、`zhulong doctor` 与 Bash/Zsh/Fish 补全生成。
- 新增 `schemas/cli-output.schema.json` 与 `verify:cli-contract`，验证成功、用法错误、静默输出、无颜色和补全行为。
- Pages 构建生成 `build-info.json`，注入版本、commit、部署时间、CSS/JS 内容 hash、canonical 和社交元数据。
- `verify:visual` 接入 `@axe-core/playwright`；修复按钮对比度、移动端可滚动表格焦点、cockpit 次级文字对比度和 SVG 嵌套交互语义。
- 临时验证报告和截图退出 Git/npm 包，稳定摘要迁入 `verification/baselines/`；npm tarball 设压缩、解包和最大单文件 gate。
- 新增文档密集型与非文档密集型双项目画像，机械证明 `rag none` 不初始化或建议 RAG。

## 2026-07-10：Apache 2.0、GitHub Pages 与公开仓库治理

- 项目许可证切换为 Apache-2.0，npm 包设置为公开发布并启用 provenance。
- 新增 GitHub Pages 工作流，README 的 HTML 文档入口改为渲染站点 URL。
- Pages 允许列表只发布文档、cockpit 样例、验证报告和许可证，不发布源码与 runtime 目录。
- 新增贡献指南、安全政策、行为规范、支持说明、Issue Form、Pull Request 模板和 Dependabot。
- 新增 `verify:pages` 与 `verify:public-release`，并纳入 `verify:quality`。
- npm registry 查询 `zhulong-kit` 仍返回 404；名称可用性需以首次发布时为准。

## 2026-07-10：文档站与 cockpit 视觉系统重构

- 文档站改为冷色技术档案视觉，使用烛龙主图标、炭黑文字、余烬橙主色和克制的青色状态色。
- 产品页移除随机 canvas、假终端和通用 AI 光晕，首页首屏直接展示真实品牌素材与完整产品名。
- commands、technical guide 和 quality dashboard 统一信息层级、目录状态、复制交互和移动端布局。
- cockpit 改为高密度工程运行视图，合并旧样式并保留 `cockpit-viewmodel.v1` 数据契约。
- 新增 `verify:design`，固化品牌素材、反模板化、可访问性和单样式块约束。
- 扩展 `verify:visual`，覆盖 5 个页面、桌面、移动端与桌面暗色主题，并保存首屏和整页证据。
- 五轮设计复核过程与结论记录在 `docs/design-review-log.md`。

## 2026-07-10：远程 CI、发布供应链与中性 Claude Code 模板

- 新增 GitHub Actions `quality` job，固定 Node.js 24 和 npm 11.12.1，执行可重现质量 gate、全命令面审计和 npm pack 审计；所有 Actions 均固定完整 commit SHA。
- verifier 的 JSON / Markdown 报告作为 7 天 CI artifact 上传；截图、历史报告和图标候选不进入 npm tarball。
- 新增 release workflow，使用 GitHub OIDC / npm trusted publishing，不保存长期 npm token。
- 发布制品记录 SHA-256、Node/npm 版本、74 条命令面与 commit；公开仓库时使用 `actions/attest@v4` 生成 attestation。
- 新增可声明式应用的默认分支 ruleset：要求 `quality`、一次批准和解决全部 review 会话。
- `verify:quality` 不再隐式依赖 Ollama / GraphRAG；真实本地集成改由 `verify:quality:local-rag` 执行。
- Claude Code 模板改为中性权限起点，不再强制 deny、禁用 hooks、禁用 bypass 或禁用 auto；高保密边界留给组织策略。

## 2026-07-10：机械质量审计、低心智门面与品牌特色收口

本阶段把截图规划中的 Phase A-C 从设计稿落成可运行、可复跑、可证明的 Zhulong 能力，并建立统一的特色功能记载规范。

新增公开命令：

- `zl-ambiguity-audit`：中英日暧昧表达审计，支持项目词表扩展与 `--strict`。
- `zl-structure-audit`：对五类关键 `.planning/` JSON 执行确定性 mini-schema 检查。
- `zl-next`：读取本地状态，只推荐 2-3 条下一步命令并写入 `.planning/help/NEXT.md`。

回答与门面增强：

- `zl-answer-audit` 新增 `citation_resolve_rate`、`value_drift_count` 和 `unsupported_sentence_ratio`。
- `zl-docs-sync` 自动附带只读 ambiguity audit。
- `zl-docs-query` 默认自动附带 answer audit，可用 `knowledge.auto_answer_audit=false` 关闭。
- `zl-completion-check` 自动刷新 structure audit；重建索引、代码图和 refresh run 仍保持显式。
- `zl-help-skills` 从 5 类扩展到 9 类场景。

驾驶舱与护栏：

- cockpit 新增 Quality & Token Metrics，读取回答、暧昧、结构和可选 `TOKEN_USAGE.json` 指标。
- 大图保持聚合社区预览，不嵌入完整原始 graph。
- 当时新增过 Claude Code deny 模板；同日后续复核后已改为中性权限模板，以上方最新记录为准。
- 新增 `docs/context-efficiency.md`，定义稳定前缀、引用优先、制品交接和 token 槽位。

品牌与文档：

- 新增 `docs/brand.md`，定义品牌目的、定位、五个特色支柱、语言规范、视觉规范和证明指标。
- README 与产品页按“问题、机制、产物、证据、边界”突出特色，不再用内部 MVP 编号作为主要卖点。
- 改造计划将 Phase A-C 标为已完成并建立逐项实现映射；Phase D 保留为需要许可证决策的发布治理。
- field notes 中的特定外部 provider 示例改为通用 `<external-provider>` 占位。

验证：

- 新增 `verify:ambiguity`、`verify:structure`、`verify:guardrails` 并纳入 `verify:quality`。
- `verify:answer-audit` 覆盖自动审计开关和数值漂移。
- `verify:cockpit-build` 覆盖质量与 token 指标槽位。
- `verify:full-command-surface` 覆盖 74 / 74 公开逻辑命令。

## 2026-06-29: Scenario Playbook Documentation Sync

本阶段不新增公开命令，专门补齐“不同项目场景应该怎么用 Zhulong”的说明书闭环，并同步 HTML 文档。

文档增强：

- `README.md` 新增场景路线速查和状态处理速查，明确文档少/无文档项目默认走 `reference + rag none`，对日/规格严格项目才走 `strict + rag local`。
- `docs/commands.html` 新增场景路线和状态处理章节；新项目、既有项目接入示例改为默认轻量接入，不再把 `zl-rag-init-local` 写成所有项目必跑步骤。
- `docs/technical-guide.html` 新增场景选择模型，补充 `RAG backend disabled`、`WAIVED_WITH_RISK`、strict 阻断等排障路径，并把 docs gate 定义收紧为“真实文档扫描结果或带本地 citation 的 query”。
- `docs/product.html` 补充轻量路线、严格路线、演示路线，说明 Zhulong 不强迫所有项目默认上 RAG。
- `docs/quality-dashboard.html` 补充场景质量覆盖表，把轻量项目、严格文档、既有项目、文档更新、runtime skills、leader 演示对应到验证脚本和报告。
- `docs/runtime-command-packs.md` 新增 Codex / Claude Code / GitHub Copilot 的实际调用例，强调 runtime pack 只调用本地 CLI，不安装 RAG、不切外部 provider、不隐藏触发 heavy refresh。

验证要求：

- `npm run verify:docs-completeness`
- `npm run verify:docs`
- `npm run verify:visual`
- `git diff --check`

## 2026-06-28: Long-Term Quality Control Scorecard

本阶段把质量检查从“脚本集合”升级为长期可复跑的内部质量控制机制。它不新增公开 `zl-*` 用户命令，不进入 `docs/commands.html`，只新增维护者 npm scripts 和审计报告。

新增内部质量入口：

- `npm run dev:audit:skill-behavior`
- `npm run dev:audit:skill-beavior`，兼容计划文档里的拼写
- `npm run dev:audit:security-governance`
- `npm run dev:audit:ragas-style`
- `npm run dev:audit:promptfoo-redteam`
- `npm run verify:security-governance`
- `npm run verify:quality:daily`
- `npm run verify:quality:release`

新增和扩展产物：

- `.zl-audit/latest/SKILL_BEHAVIOR_SCORES.md/json`
- `.zl-audit/latest/SECURITY_GOVERNANCE_CHECK.md/json`
- `.zl-audit/latest/RAGAS_STYLE_KNOWLEDGE_SCORES.md/json`
- `.zl-audit/latest/PROMPTFOO_STYLE_REDTEAM_SCORES.md/json`
- `.zl-audit/latest/QUALITY_CONTROL_SCORECARD.md/json/html`
- `verification/reports/security-governance-check.md/json`
- `verification/reports/quality-control-summary.md/json`

评分口径：

- Static Skill Quality: 10
- Trigger Accuracy: 15
- Command / Tool Trajectory: 20
- Workflow / Evidence Closure: 20
- Knowledge / RAG Quality: 15
- Safety / Governance: 10
- Efficiency / Stability: 10

关键边界：

- `SKILL_SCORES` 是结构质量分；`SKILL_BEHAVIOR_SCORES` 是 deterministic 行为契约分，按 33 个 runtime skill/prompt × 5 类 case 归档。
- `BENCHMARK_COMPARISON` 记录 SkillsBench-style with_skill / without_skill delta。
- `RAGAS_STYLE_KNOWLEDGE_SCORES` 和 `PROMPTFOO_STYLE_REDTEAM_SCORES` 是本地代理指标，不调用外部 SaaS 或外部模型。
- 默认 local-only，`privacy.allow_external_rag = false`，`privacy.allow_external_tools = false`。
- 外部 RAG 只能通过 `--doc-policy strict --rag external --allow-external-rag` 显式开启，并生成风险报告。
- Codex、Claude Code、GitHub Copilot 是用户主动使用的外部 coding runtime 例外；这个例外不允许 Zhulong 命令默认外发项目资料。
- 外部机制只借鉴方法：OpenAI Agent Skill Evals、SkillsBench、Ragas、Promptfoo、OWASP Agentic Top 10、NIST AI RMF；当前不强制引入外部 SaaS。
- 2026-06-29 复核并补充方法论链接：OpenAI Agent Skills / skill evals、SkillsBench、Anthropic agent evals、Ragas agent metrics、Promptfoo Agent Skills、OWASP Agentic Top 10 2026、NIST AI RMF / AI 600-1。README、quality plan、developer audit 和 verification README 均标注采用方式与 local-only 边界。

文档同步：

- `README.md`
- `docs/quality-plan.md`
- `docs/internal/dev-audit.md`
- `verification/README.md`
- `docs/changelog.md`

## 2026-06-28: MVP4.3 Init Wizard & Document/RAG Policy Simplification

本阶段把 `zl-init` 从单纯生成 `.planning/` 的入口，升级为项目级一次性接入向导语义。

新增和调整：

- `zl-init` 支持 `--doc-policy reference|strict`。
- `zl-init` 支持 `--rag none|local|external`。
- `zl-init` 支持 `--setup-rag ask|install|skip`，默认不安装依赖、不触发 GraphRAG index。
- `zl-init` 支持 `--allow-external-rag`，没有显式确认时外部 RAG 直接失败。
- 真实终端中只运行 `zl-init --target "$PWD"` 会进入 init wizard；CI/非 TTY 使用显式参数或默认值，不等待输入。
- 默认初始化从旧的 Local GraphRAG 默认口径改为 `reference + rag none + local_only`。
- `strict + rag none` 现在是硬失败，严格文档模式必须选择 local 或 external RAG。
- `strict + rag local` 会写 `.planning/knowledge/LOCAL_RAG_SETUP_PLAN.md`，默认推荐 `qwen2.5:7b` + `bge-m3`。
- `strict + rag external --allow-external-rag` 会写 `.planning/privacy/EXTERNAL_RAG_RISK.md`。
- `zl-docs-index --run` 和 `zl-docs-query --rag` 在 `rag none` 下会明确失败并提示 `RAG backend disabled`，避免误跑 GraphRAG。
- `zl-mode-set` 新增推荐语义 `docs-reference`、`docs-strict`，同时兼容 `graph-lite`、`default-local-rag`、`full-strict`。
- policy snapshot 纳入 `document_policy` 和 `rag_backend`，避免配置漂移漏检。
- 本地 RAG 默认 LLM 从 `qwen3.5:4b` 调整为 `qwen2.5:7b`，原因是实际 smoke 发现 `qwen3.5:4b` 会输出较长 thinking，容易拖慢 GraphRAG query。
- `npm run verify:rag-local` 增加明确超时边界：默认 index 300 秒、query 90 秒；慢模型或 GraphRAG query 卡住会生成失败报告，不再让质量 gate 长时间悬挂。
- 新增质量脚本 `npm run verify:init-policy`，并纳入 `verify:quality` 与 `verify:quality-closure`。
- 新增维护者级业务链审计 `npm run verify:business-chain`，聚合 init、全命令面、skills、workflow、policy 和 docs completeness，报告业务链是否断开。

同步文档：

- `README.md`
- `docs/commands.html`
- `docs/technical-guide.html`
- `docs/product.html`
- `docs/architecture.md`
- `docs/runtime-command-packs.md`
- `docs/quality-plan.md`
- `docs/quality-dashboard.html`
- `docs/full-test-plan.md`
- `verification/README.md`

验证证据：

- `npm run check`
- `npm run verify:init-policy`
- `npm run verify:business-chain`
- 报告：`verification/reports/init-policy-check.md`
- 报告：`verification/reports/business-chain-audit.md`

## 2026-06-28: Roadmap Added Frontend Experience Intelligence Mode

本次只更新未来计划，不新增公开命令。

新增未来阶段：

- **Frontend Experience Intelligence Mode**

目标：

- 增加前置调查阶段，先研究前后端联动、前端可视化验证和 AI 前端改错问题，再决定 editor 形态。
- 在本地提供画面迁移和 UI 状态建模能力。
- 用可视化拖拽画布表达 screen、route、modal、tab、state、transition。
- 把画面迁移结果保存成结构化 artifact，而不是只保存图片。
- 让 screen flow 进入 docs sync / RAG / trace，使 AI 能理解画面之间的迁移关系。
- 让 Graphify/代码地图可以连接 screen -> route -> component -> file -> test。

前置调查课题：

- screen / route / component / API / DB / permission / backend handler / test 如何建立可追踪关系。
- AI 改前端后，如何用截图、DOM snapshot、accessibility tree、route state、视觉 diff 和交互 smoke 证明它改对了。
- 如何识别 AI 常见前端失败：调错组件、改错 route、遗漏 loading/empty/error state、局部样式正确但整体错位、视觉正确但数据流错误。
- 如何把视觉证据写入 evidence / trace / cockpit，而不是只保留临时截图。

未来候选产物：

- `.planning/ui/SCREEN_FLOW.json`
- `.planning/ui/SCREEN_FLOW.md`
- `.planning/ui/screen-flow.html`

边界：

- 默认 local-only。
- 不默认接 Figma、外部白板或外部设计平台。
- 当前阶段只写入 roadmap，不实现 `zl-ui-flow-*` 命令。

文档同步：

- `README.md`
- `docs/wishlist.md`
- `docs/quality-plan.md`
- `docs/changelog.md`

## 2026-06-28: Developer Audit & Benchmark Product Artifact

本阶段目标：把“Zhulong 可用性怎么样”做成维护者可复跑的常态审计机制，并实际执行一次命令、skills、功能 gate、Zhulong / GSD / Superpowers 对标、时间/token/隔离统计。

新增内部机制：

- `scripts/dev-audit/run-dev-audit.mjs`
- `.zl-audit/` 已加入 `.gitignore`
- `docs/internal/dev-audit.md`
- `verification/reports/developer-audit-summary.md/json`

新增 npm scripts：

- `npm run verify:dev-audit-harness`
- `npm run dev:audit:quick`
- `npm run dev:audit:inventory`
- `npm run dev:audit:commands`
- `npm run dev:audit:skills`
- `npm run dev:audit:features`
- `npm run dev:audit:benchmark`
- `npm run dev:audit:report`
- `npm run dev:audit:full`
- `npm run dev:audit:nightly`

审计产物：

- `.zl-audit/latest/AUDIT_REPORT.md/json`
- `.zl-audit/latest/AUDIT_SCORECARD.md/json/html`
- `.zl-audit/latest/COMMAND_SCORES.md/json`
- `.zl-audit/latest/SKILL_SCORES.md/json`
- `.zl-audit/latest/FEATURE_SCORES.md/json`
- `.zl-audit/latest/BENCHMARK_COMPARISON.md/json`
- `.zl-audit/latest/TIME_BREAKDOWN.md/json`
- `.zl-audit/latest/TOKEN_USAGE.md/json`

最近一次完整审计结果：

- Run ID: `2026-06-27T19-01-06-200Z`
- Status: PASS
- Total score: 96 / A
- Command surface: 100，覆盖 71 个 `zl` / `zl-*` bin
- Runtime skills: 100，覆盖 33 个 Codex / Claude Code / GitHub Copilot skill/prompt
- Feature gates: 100
- Benchmark comparison: 87，表示全部 12 行对标矩阵的保守平均，不是 Zhulong 单体分
- Cost / isolation observability: 85

最新三方 benchmark 修正：

- Run ID: `2026-06-27T19-01-06-200Z`
- Status: PASS
- Zhulong: `90 / A`，4 pass，1 `WAIVED_WITH_RISK`，1 `EXPECTED_BLOCK`，0 fail
- GSD: `88 / B`，2 pass，1 `WAIVED_WITH_RISK`，0 fail
- Superpowers: `82 / B`，2 pass，1 `WAIVED_WITH_RISK`，0 fail

对标结论：

- Zhulong `graph-lite` 在 `docs-complete`、`docs-missing`、`docs-partial` 三种 fixture 中都能闭环；无文档场景标记 `WAIVED_WITH_RISK`。
- Zhulong full-local 在 `docs-complete` 和 `docs-partial` PASS，在 `docs-missing` 输出 `EXPECTED_BLOCK`，这是正确边界：没有文档依据时不能假装 GraphRAG/RAG 证据完整。
- `Benchmark comparison: 87` 偏保守是预期结果：它同时平均 Zhulong 两种模式、GSD、Superpowers 和三种文档状态；`graph-lite` 低成本路径、full-local 的正确阻断、GSD / Superpowers 的 replay 可信度上限都会拉低横向均值。
- GSD / Superpowers 本轮使用本机真实 skill/plugin 文件做 `skill-pack-backed-replay`，记录 instruction pack hash、指令摘录、fixture、代码改修、测试和证据文件；因为不是 repository-local CLI / live model benchmark，分数设置可信度上限。
- 默认 benchmark 是 deterministic，不调用外部 AI；token 写 `TOKEN_USAGE_UNAVAILABLE`。本轮额外尝试真实 Codex 子进程，已使用 `ZHULONG_AUDIT_REAL_AI=1 ZHULONG_AUDIT_CODEX_IGNORE_USER_CONFIG=1 ZHULONG_AUDIT_CODEX_TIMEOUT_MS=60000` 和 `--ephemeral --ignore-user-config --ignore-rules --json`；三个 real-codex subprocess 均因当前 ChatGPT account 不支持默认 `gpt-5.3-codex` 模型而在启动阶段失败，因此没有 usage events，token 仍为 `TOKEN_USAGE_UNAVAILABLE`。

文档同步：

- `README.md` 新增开发者审计入口和最近结果摘要。
- `docs/quality-plan.md` 新增 Developer Audit / Benchmark 质量章节。
- `docs/quality-dashboard.html` 新增 Developer Audit / Benchmark 卡片、脚本表格和命令入口。
- `docs/technical-guide.html` 新增内部审计运行方式、token 和记忆隔离说明。
- `docs/product.html` 新增 96 / A 审计信号和开发者审计卡片。
- `docs/runtime-command-packs.md` 新增 33 runtime item 审计结果说明。
- `verification/README.md` 新增 dev audit 产物说明。

## 2026-06-28: Cockpit Template Extraction

本阶段目标：把 cockpit 从“真实项目报告页”拆成“稳定展示模板 + 假数据样例 + 真实项目快照”，避免目标项目缺 Graphify/RAG artifact 时，页面看起来像模板本身不稳定。

新增模板产物：

- `templates/cockpit/index.template.html`
- `templates/cockpit/sample-data.json`
- `templates/cockpit/sample.html`
- `templates/cockpit/assets/graphify/sample.html`

实现变化：

- `zl-cockpit-build` 不再把整页 HTML 硬编码在 `bin/zl.mjs`，而是读取 `templates/cockpit/index.template.html` 并注入真实 `cockpit-data.json`。
- `cockpit-data.json` 新增 `template.mode` 和 `nextCommands`，页面可以区分 `sample` 和 `live`。
- 新增 `npm run build:cockpit-sample`，用于从假数据重新生成 `templates/cockpit/sample.html`。
- 借鉴 Graphify 的 viewer 结构，新增稳定数据契约 `cockpit-viewmodel.v1`：页面优先读取 `summary`、`impactGraph`、`evidenceChain`、`artifactGroups` 等固定字段，而不是直接拼散落报告。
- cockpit impact graph 新增本地交互：节点搜索、点击节点详情、legend 过滤、edge confidence 样式。
- 大图默认降级为 `aggregated-community` 预览，避免真实项目节点过多时页面不稳定。
- `verify:cockpit-build` 新增模板样例和大图聚合验证，当前覆盖 5 个 case：template sample、安全 Graphify HTML、不安全 Graphify HTML、无 RAG fixture、大图 aggregated view。

文档同步：

- `README.md`：区分稳定样例 `templates/cockpit/sample.html` 与真实项目 `.planning/cockpit/index.html`。
- `docs/commands.html`：更新 `zl-cockpit-build` 的默认行为和失败说明。
- `docs/quality-plan.md`、`docs/quality-dashboard.html`、`docs/technical-guide.html`、`verification/README.md`：同步 cockpit template/sample 的验证边界。

## 2026-06-27: MVP4.2 Project Cockpit & Runtime Skill Usability

本阶段目标：新增实际项目驾驶舱，把 Zhulong 已有的 workflow、skills、Graphify、GraphRAG/RAG、policy、privacy、evidence 和 quality closure 状态集中到一个本地静态 HTML，方便自查和 leader 演示。

新增命令：

- `zl-cockpit-build`

新增 runtime 入口：

- `runtime/codex/skills/zl-cockpit-build/SKILL.md`
- `runtime/claude-code/skills/zl-cockpit-build/SKILL.md`
- `runtime/github-copilot/prompts/zl-cockpit-build.prompt.md`

新增产物：

- `.planning/cockpit/index.html`
- `.planning/cockpit/cockpit-data.json`
- `.planning/cockpit/COCKPIT_REPORT.md`
- `.planning/cockpit/assets/`

新增验证：

- `npm run verify:cockpit-build`
- `verify:quality-closure` 聚合 `verify:cockpit-build`
- `verify:full-command-surface` 当前为 71 / 71
- `verify:skills-usability` 当前为 33 个 runtime skill/prompt

新增报告：

- `verification/reports/cockpit-build-check.md/json`

能力边界：

- `zl-cockpit-build` 默认只读取已有本地 artifact，不执行 GraphRAG index、不执行 Graphify build、不访问外网、不需要 API key。
- Graphify HTML 只有在不包含外部 URL/CDN/远程 script/stylesheet 时才复制到 cockpit assets；否则阻断复制并显示 WARN。
- 无 Graphify HTML 时使用 `graph.json` fallback 网状图；无 RAG/citation/answer audit 时显示 `WAIVED_WITH_RISK`，但不让 cockpit 构建失败。
- cockpit skill 是低频演示/可视化入口，不把所有 `npm run verify:*` 暴露成日常 skill。

文档同步：

- `README.md`：新增 Project Cockpit 用法、产物路径、`zl-cockpit-build` 与 `npm run verify:cockpit-build` 的区别。
- `docs/commands.html`：重生成 71 个命令详情，包含 `zl-cockpit-build`。
- `docs/technical-guide.html`：新增 cockpit 路由、artifact 和 troubleshooting。
- `docs/quality-plan.md`：新增 MVP4.2 cockpit 质量计划和验收标准。
- `docs/quality-dashboard.html`：新增 cockpit 验证报告入口。
- `docs/runtime-command-packs.md`：新增 cockpit runtime skill/prompt 说明。
- `docs/full-test-plan.md`、`docs/architecture.md`、`verification/README.md`：同步 71/71、33 runtime items 和 cockpit gate。

## 2026-06-27: MVP4.1 Quality Closure & Documentation Completeness Freeze

本阶段目标：不新增公开 `zl-*` 功能命令，先把现有能力收成可交付闭环。重点证明命令能跑、skills 能正确调用、workflow 能闭环、报告可信、默认不重刷新、不外发，并且 README 关联文档能指导新项目、既有项目、日常开发、文档更新和质量验证。

MVP4.1 当时命令面：

- 公开 bin 保持 70 个，不新增功能命令。MVP4.2 加入 `zl-cockpit-build` 后，当前命令面已更新为 71 / 71。
- `docs/commands.html` 改为由 `scripts/command-catalog.mjs` + `scripts/render-commands-doc.mjs` 生成。
- 每个 `zl-*` / `zl` 命令都有独立 `cmd-<command>` 锚点、物理名、逻辑名、用途、参数、示例、产物、失败场景、关联命令和适用场景。

新增验证：

- `npm run verify:skills-usability`
- `npm run verify:workflow-closure`
- `npm run verify:docs-completeness`
- `npm run verify:quality-closure`

新增报告：

- `verification/reports/skills-usability-check.md/json`
- `verification/reports/workflow-closure-check.md/json`
- `verification/reports/docs-completeness-check.md/json`
- `verification/reports/quality-closure-check.md/json`

新增质量 contract：

- runtime install 渲染 Markdown skill / prompt 时追加 `Zhulong Local Runtime Contract`，统一强调本地 CLI、local-only、no hidden heavy refresh、evidence writeback。
- `verify:skills-usability` 临时安装 Codex / Claude Code / GitHub Copilot 三套 runtime pack，MVP4.1 当时检查 30 个核心 workflow skill/prompt；MVP4.2 加入 cockpit 后当前为 33 个。
- `verify:workflow-closure` 覆盖新项目第一次闭环、既有项目文档更新、`graph-lite` 无文档风险放行、`full-strict` stale/privacy 阻断。
- `verify:docs-completeness` 检查 README 关键命令跳转、命令手册独立详情和命名边界；MVP4.1 当时为 70 个，MVP4.2 当前为 71 个。
- `verify:quality-closure` 聚合 check、quality、full command surface、integration、runtime、skills、workflow、docs completeness。

文档同步：

- `README.md`：新增质量闭环报告、关键命令跳转和 MVP4.1 验证说明。
- `docs/commands.html`：重生成完整命令手册。
- `docs/technical-guide.html`：新增 MVP4.1 验证入口。
- `docs/quality-plan.md`：新增 MVP4.1 质量闭环计划和完成标准。
- `docs/quality-dashboard.html`：新增 closure 报告入口和验证脚本说明。
- `docs/runtime-command-packs.md`：新增 runtime local contract 和 skills usability 验证说明。
- `docs/full-test-plan.md`、`docs/architecture.md`、`verification/README.md`：同步新 gate、报告路径和默认 no hidden heavy refresh 边界。

边界：

- 本阶段不做 MCP、复杂 RAG route、dashboard 新功能。
- 不新增外部 LLM / API key 依赖。
- 默认验证使用本地 fixture，不触发隐藏 GraphRAG index、Graphify build 或 refresh-run。

## 2026-06-27: MVP4.0 Knowledge Reliability Lite

本阶段目标：把“文档更新后怎么同步”和“AI 回答有没有依据”做成默认简单用法。范围刻意保持轻量，不做 `zl-rag-route`，不让 workflow 自动触发重任务。

新增命令：

- `zl-docs-sync`
- `zl-answer-audit`

新增能力：

- `zl-docs-sync --target <repo>` 默认按 diff -> extract -> citation audit 轻量同步文档，输出 `heavy refresh executed: no`。
- `zl-docs-sync --target <repo> --index` 才允许执行 configured GraphRAG index，输出 `heavy refresh executed: yes`。
- 文档新增、修改、删除时，`DOCS_SYNC` 状态写 `STALE_NEEDS_REFRESH`，默认不阻断，是否阻断交给 profile / policy。
- `zl-docs-query` 现在会写 `.planning/knowledge/DOCS_QUERY_RESULT.md` 和 `.planning/knowledge/DOCS_QUERY_RESULT.json`。
- `zl-answer-audit --target <repo>` 默认审计最近一次 `RAG_QUERY_RESULT.md`、`DOCS_QUERY_RESULT.md` 或 `CITATIONS.md`，日常不用复制长 answer。
- `zl-answer-audit --from <file>` 可审指定文件，`--answer "<text>"` 只作为调试 escape hatch。
- `answer audit` 第一版只做 citation/source-grounding：检查 citation 是否存在、源文件是否存在、行号是否合法；不做 LLM/NLI 级幻觉判断。
- public workflow facade 如果发现最近 query 结果但没有 answer audit，只把 `zl-answer-audit --target <repo>` 加到 next commands，不自动运行、不阻断 completion。
- `zl-help-skills` 的“文档更新”场景改为优先推荐 `zl-docs-sync` 和 `zl-answer-audit`。

新增产物：

- `.planning/knowledge/DOCS_SYNC.json`
- `.planning/knowledge/DOCS_SYNC.md`
- `.planning/knowledge/DOCS_QUERY_RESULT.json`
- `.planning/knowledge/DOCS_QUERY_RESULT.md`
- `.planning/quality/ANSWER_AUDIT.json`
- `.planning/quality/ANSWER_AUDIT.md`

新增验证：

- `npm run verify:docs-sync`
- `npm run verify:answer-audit`
- `npm run verify:knowledge-reliability`

验证证据：

- `npm run check`: PASS
- `npm run verify:docs-sync`: PASS
- `npm run verify:answer-audit`: PASS
- `npm run verify:knowledge-reliability`: PASS
- `npm run verify:quality`: PASS
- `npm run verify:integration`: PASS 132 / FAIL 0 / WARN 1
- `npm run verify:all`: PASS
- `npm run verify:full-command-surface`: PASS, 70 / 70 commands executed
- `verification/reports/docs-sync-check.md`
- `verification/reports/answer-audit-check.md`
- `verification/reports/knowledge-reliability-check.md`
- `verification/reports/full-command-surface-check.md`

文档同步：

- `README.md`：新增 MVP4.0 说明、默认 docs sync / answer audit 用法、验证脚本和 70 命令面。
- `docs/commands.html`：新增 `zl-docs-sync`、`zl-answer-audit` 的表格和全命令卡片。
- `docs/technical-guide.html`：新增 Knowledge Reliability Lite 流程、artifact contract 和验证入口。
- `docs/quality-plan.md`：新增质量矩阵和专项脚本说明。
- `docs/quality-dashboard.html` / `docs/product.html`：同步 70 / 70 命令面和新报告入口。

## 2026-06-25: MVP6 Workflow Facade & Policy Guard Contract

本阶段目标：把“命令很多”的心智负担收敛到 public workflow，同时把“允许跳过 / 必须阻断 / 带风险继续”固化成 Zhulong native policy-as-code 合同。

新增命令：

- `zl-policy-lock`
- `zl-policy-verify`
- `zl-policy-diff`

新增能力：

- public workflow 现在会写 `WORKFLOW_FACADE.json` 和 `WORKFLOW_FACADE.md`，把 preflight、policy、docs、graph、evidence、workflow gates 和下一步建议命令汇总成一个无感编排层。
- public workflow 只执行轻量检查，不会自动运行 `zl-docs-index --run`、`zl-graph-build --run` 或 `zl-refresh-run`。
- policy 命令支持 lock / verify / diff：生成稳定 snapshot、SHA-256 hash、字段级 drift diff 和 verify 报告。
- workflow / policy gate 统一四态语义：`PASS`、`FAIL`、`WAIVED_WITH_RISK`、`STALE_NEEDS_REFRESH`。
- profile 规则固化：`graph-lite` 可带风险跳过文档，`default-local-rag` stale 只提醒，`full-strict` 对 stale、missing citation、外部 provider/API key/URL 硬阻断。

新增产物：

- `.planning/workflows/<workflow-id>/WORKFLOW_FACADE.json`
- `.planning/workflows/<workflow-id>/WORKFLOW_FACADE.md`
- `.planning/policies/POLICY_LOCK.json`
- `.planning/policies/POLICY_LOCK.md`
- `.planning/policies/POLICY_VERIFY.json`
- `.planning/policies/POLICY_VERIFY.md`
- `.planning/policies/POLICY_DIFF.json`
- `.planning/policies/POLICY_DIFF.md`

新增验证：

- `npm run verify:workflow-facade`
- `npm run verify:policy-hardening`

验证证据：

- `npm run verify:workflow-facade`: PASS
- `npm run verify:policy-hardening`: PASS
- `npm run verify:full-command-surface`: PASS, 68 / 68 commands executed（当时命令面；MVP4.2 后当前命令面为 71 / 71）
- `npm run verify:quality`: PASS
- `npm run verify:integration`: PASS 132 / FAIL 0 / WARN 1
- `npm run verify:all`: PASS
- `verification/reports/workflow-facade-check.md`
- `verification/reports/policy-hardening-check.md`
- `verification/reports/workflow-policy-enhancement-report.md`

文档同步：

- `README.md`：新增 MVP6 说明、四态语义、policy lock/verify/diff 和新增验证脚本。
- `docs/commands.html`：新增 policy 命令用法、产物和 public workflow facade 说明。
- `docs/technical-guide.html`：新增 policy contract、四态语义、workflow facade 和新增验证入口。
- `docs/quality-plan.md`：新增 Loop 1.7 和质量矩阵。
- `docs/quality-dashboard.html` / `docs/product.html`：当时命令面更新为 68 / 68，并接入新增报告；MVP4.2 后当前页面统一为 71 / 71。

## 2026-06-25: Documentation Surface Sync

本阶段目标：把 HTML 文档从旧的产品说明状态同步到当前 Zhulong 能力面，避免页面只讲品牌和基础流程，却漏掉 MVP3.5 refresh control、local GraphRAG、Graphify hardening、quality dashboard 和 65 个命令面的实际用法。

更新内容：

- `docs/product.html`：更新为 MVP3.5 / 65 命令口径，补充 `zl-preflight`、`zl-refresh-plan`、`zl-refresh-run`、graph-lite/full-strict 等执行预算说明。
- `docs/technical-guide.html`：补齐 `.planning/refresh/`、文档/RAG 生命周期、Graphify impact/risk/freshness、runtime install/status、全量命令面和 troubleshooting。
- `docs/quality-dashboard.html`：增加验证脚本说明和 65 个命令的覆盖矩阵，让 QA Dashboard 可以作为当前质量入口。
- `docs/commands.html`：已保持 65 / 65 命令覆盖，作为完整命令使用手册继续保留。

验证证据：

- `npm run verify:docs`: PASS, links/issues clean
- `npm run verify:full-command-surface`: PASS, 65 / 65 commands executed
- `npm run verify:mvp35`: PASS
- `npm run verify:quality`: PASS, includes local RAG, privacy, Graphify, runtime and visual checks

## 2026-06-25: MVP3.5 Execution Budget & Freshness Control

本阶段目标：让 Zhulong 在保持 GraphRAG / Graphify 增强能力的同时，避免每个任务都触发重刷新。普通 workflow 只做轻量提醒，真正重刷新必须来自显式命令或 strict policy gate。

新增命令：

- `zl-preflight`
- `zl-refresh-plan`
- `zl-refresh-run`
- `zl-mode-status`
- `zl-mode-set`

新增能力：

- `.planning/refresh/REFRESH_STATE.json` 记录上次 GraphRAG / Graphify 成功刷新所在 commit。
- `zl-preflight` 只读取状态和 git diff，显示 GraphRAG / Graphify 距离 HEAD 落后几个 commit，不执行重刷新。
- `zl-refresh-plan` 判断落后 commit 是否改到了文档源或代码地图相关路径；无关 commit 显示 `behind-unrelated` 并建议跳过。
- `zl-refresh-run --rag|--graph|--all` 是显式刷新入口；它会写 `REFRESH_RUN.md`，并在成功后更新 `REFRESH_STATE.json`。
- `zl-docs-index --run` 和 `zl-graph-build --run` 也会更新刷新账本，因为它们本身就是显式重命令。
- `zl-mode-set` 支持 `default-local-rag`、`graph-lite`、`full-strict` 三种执行预算模式。
- `zl-policy-check --strict` 接入 `freshness.preflight`，可以让 stale 作为 policy failure，但不会自动重建。

新增验证：

- `npm run verify:mvp35`
- `scripts/verify-mvp35-refresh-control.mjs`

新增报告：

- `verification/reports/mvp35-refresh-control-check.md`
- `verification/reports/mvp35-refresh-control-check.json`

文档同步规则：

- 新增功能、命令或 skills 必须同步更新 `README.md`、`docs/changelog.md`、`docs/commands.html`、`docs/quality-plan.md`。
- `npm run verify:mvp35` 会检查新增命令是否在这些文档中出现。

## 2026-06-25: MVP3 Evidence Quality & Policy Mode

本阶段目标：让 Zhulong 不只“能查文档、能跑 workflow”，而是能证明 RAG 答案、规格引用、代码影响面、验证证据和完成策略是可信的。

新增命令：

- `zl-rag-golden-add`
- `zl-rag-golden-run`
- `zl-rag-eval`
- `zl-citation-audit`
- `zl-trace-build`
- `zl-trace-query`
- `zl-trace-audit`
- `zl-policy-list`
- `zl-policy-check`
- `zl-policy-explain`
- `zl-help-skills`

新增验证：

- `npm run verify:mvp3`
- `npm run verify:full-command-surface`
- `npm run verify:full-test-plan`
- `scripts/verify-mvp3-evidence-policy.mjs`
- `scripts/verify-full-command-surface.mjs`
- `scripts/run-full-test-plan.mjs`

新增报告：

- `verification/reports/mvp3-evidence-policy-check.md`
- `verification/reports/full-command-surface-check.md`
- `verification/reports/full-test-round-1.md`
- `verification/reports/full-test-round-2.md`

当前证据：

- `npm run verify:mvp3`: PASS
- `npm run verify:full-command-surface`: MVP3 当时为 PASS, 60 / 60 commands executed；MVP3.5 后当前命令面为 PASS, 65 / 65 commands executed
- `node scripts/run-full-test-plan.mjs --run-id round-1`: PASS
- `node scripts/run-full-test-plan.mjs --run-id round-2`: PASS

## 2026-06-25: MVP2 Local GraphRAG Default Mode

本阶段目标：把默认知识后端改成本地 GraphRAG，不需要外部 API key，不允许默认把项目文档发给外部 LLM provider。

完成内容：

- `zl-rag-init-local`
- `zl-privacy-audit`
- `zl-offline-lock`
- `zl-outbound-audit`
- `zl-license-audit`
- `verify:rag-local`
- `verify:privacy-strict`
- `verify:license`

默认本地配置：

- Provider: `graphrag-local`
- LLM: Ollama
- Embedding: Ollama
- Vector store: LanceDB
- API base: `http://127.0.0.1:11434`
- External API key required: false

证据报告：

- `verification/reports/rag-local-check.md`
- `verification/reports/privacy-strict-check.md`
- `verification/reports/OUTBOUND_AUDIT.md`
- `verification/reports/license-audit-check.md`

## 2026-06-25: MVP2 Document / Graph / Workflow Hardening

本阶段目标：把文档、代码图谱和 workflow guard 从说明文档推进到可执行检查。

完成内容：

- `zl-docs-extract`
- `zl-docs-diff`
- `zl-docs-citations`
- `zl-graph-impact`
- `zl-graph-risk`
- `zl-graph-freshness`
- `zl-workflow-audit`
- `zl-completion-check`
- `verify:docs-extract`
- `verify:graph-hardening`

证据报告：

- `verification/reports/docs-extract-citation-check.md`
- `verification/reports/graph-hardening-check.md`

## 2026-06-25: MVP1 Native `zl-*` Workflow Surface

本阶段目标：把 GSD 从用户入口移出去，保留为参考设计，建立 Zhulong 自己的命令面、workflow guard 和 runtime pack。

完成内容：

- `zl-init`
- `zl-codebase-scan`
- `zl-docs-scan`
- `zl-graph-build`
- `zl-evidence-record`
- `zl-runtime-install`
- `zl-debug`
- `zl-plan-phase`
- `zl-execute-phase`
- `zl-verify-work`
- `zl-complete-milestone`

设计结论：

- 用户只调用 `zl-*`。
- GSD 只作为 workflow 参考，不作为用户命令面。
- Codex、Claude Code、GitHub Copilot 通过 runtime command pack 接入同一套本地 CLI。

证据报告：

- `verification/reports/latest.md`
- `verification/reports/runtime-pack-status.md`
- `verification/reports/schema-check.md`
- `verification/reports/naming-check.md`

## 后续 Roadmap

下一阶段建议叫 **MVP4.3 Knowledge Reliability Mode**：

- 增强 RAG answer audit。
- 继续增强已落地的 `zl-docs-sync`，把文档更新后的 scan/extract/diff/index/citation 做成更可解释的稳定流程。
- 增加更细的 GraphRAG query route：local / global / drift / basic。
- 增加项目级 QA Dashboard，让文档、代码图、trace、policy 和 evidence 关系可视化。
- 继续保持默认 local-only，不把保密项目资料默认发送到外部 provider。
- 后续单独规划 **Frontend Experience Intelligence Mode**：本地画面迁移拖拽建模、结构化 screen flow、接入 RAG/trace/Graphify/cockpit。
