# Zhulong 验证说明

这个目录保存 Zhulong 的可复跑验证。它证明 Zhulong 当前使用 `zl-*` 作为主动 workflow 命令面，并把 GraphRAG 和 Graphify 作为增强后端接入。

验证重点包括：

- incomplete workflow 必须被 `zl-completion-check` 阻断。
- complete workflow 必须通过 codebase、docs、graph、plan、implementation、verification、evidence、writeback gate。
- 默认 `reference + rag none` 不需要 GraphRAG、本地模型或外部 API key；`strict + rag local` 才启用本地 GraphRAG。
- MVP3 的 golden、citation、trace、policy、help skills 必须能在 fixture 中复跑。
- MVP4.0 的 docs sync、docs query、answer audit 主路径必须能在 fixture 中复跑。
- MVP4.1 的 skills usability、workflow closure、docs completeness 和 quality closure 必须能在 fixture 中复跑。
- MVP4.2 的 project cockpit、Graphify HTML 安全策略、RAG 证据面板和 runtime cockpit skill 必须能在 fixture 中复跑；cockpit 模板样例必须能从 `templates/cockpit/sample-data.json` 生成到 `templates/cockpit/sample.html`，并且样例和 live 快照都使用稳定 `cockpit-viewmodel.v1`。
- MVP4.3 的 init policy 必须证明 `zl-init` 可选择 reference/strict、none/local/external，真实终端/`--interactive` 有可复跑向导，且 external RAG 必须显式 opt-in。
- Phase A-C 的机械审计、自动折叠、`zl-next`、9 类 help 场景和 Quality & Token Metrics 必须分别有确定性 fixture。

运行确定性验证：

```bash
npm run check
npm run verify:rag-local
npm run verify:docs-extract
npm run verify:docs-sync
npm run verify:ambiguity
npm run verify:structure
npm run verify:answer-audit
npm run verify:guardrails
npm run verify:knowledge-reliability
npm run verify:graph-hardening
npm run verify:privacy-strict
npm run verify:security-governance
npm run verify:license
npm run verify:mvp3
npm run verify:mvp35
npm run verify:init-policy
npm run verify:business-chain
npm run verify:full-command-surface
npm run verify:skills-usability
npm run verify:workflow-closure
npm run verify:cockpit-build
npm run verify:docs-completeness
npm run verify:visual
npm run verify:design
npm run verify:pages
npm run verify:public-release
npm run verify:quality-closure
npm run verify:dev-audit-harness
npm run verify:quality
npm run verify:quality:daily
npm run verify:quality:release
npm run verify:integration

# 维护者内部审计 / 对标，不属于普通用户命令面
npm run dev:audit:skill-behavior
npm run dev:audit:ragas-style
npm run dev:audit:promptfoo-redteam
npm run dev:audit:full
```

`verify:rag-local` 是严格文档模式的本地 RAG smoke。它运行 Ollama + LanceDB 的本地 GraphRAG，不需要外部 API key，并在 index/query 前后执行 `zl-privacy-audit`。该脚本有明确超时边界：默认 index 300 秒、query 90 秒；超时会写入 `rag-local-check` 报告并失败，不会让质量 gate 无期限等待。

GitHub Actions 使用 `verify:quality` 运行不依赖本地服务的可重现 gate。完整本地 RAG 验证使用 `npm run verify:quality:local-rag`。

`verify:docs-extract`、`verify:graph-hardening`、`verify:privacy-strict`、`verify:security-governance`、`verify:license` 覆盖 hardening：本地文档抽取/citation、Graphify impact/risk/freshness、offline privacy lock/outbound blocking、外部 RAG opt-in、安全治理、license metadata review。

`verify:docs-sync`、`verify:ambiguity`、`verify:structure`、`verify:answer-audit`、`verify:guardrails`、`verify:knowledge-reliability` 覆盖知识可靠性与机械质量审计：文档轻量同步、三语暧昧词表、关键制品 mini-schema、引用解析率、数值漂移、无依据句比例、自动审计开关、中性运行时权限与上下文效率边界。

`verify:mvp3` 覆盖 MVP3 Evidence Quality & Policy Mode：RAG golden cases、citation audit、trace matrix、policy check、help skills。

`verify:mvp35` 覆盖 MVP3.5 Execution Budget & Freshness Control：preflight、refresh plan、显式 refresh-run、mode 切换、相关/无关 commit 判断和文档同步要求。

`verify:init-policy` 覆盖 Init Wizard & Document/RAG Policy Simplification：默认 `reference + rag none`、交互式 wizard、`strict + rag none` 硬失败、外部 RAG 需要 `--allow-external-rag`、本地 RAG 只写 setup plan 且不触发重刷新、`rag none` 阻断 `zl-docs-index --run` 和 `zl-docs-query --rag`。

`verify:business-chain` 是维护者级业务断链审计。它会聚合 init policy、全命令面、skills usability、workflow closure、policy hardening 和 docs completeness，检查轻量接入链、严格文档链、runtime skills 链、文档/命令一致性链是否断开。

`verify:full-command-surface` 会执行 `package.json` 中声明的每个 `zl-*` / `zl` bin 命令。当前全命令面报告以 `package.json` 的实际命令数量为准。

`verify:skills-usability` 会把 Codex、Claude Code、GitHub Copilot 的 runtime pack 安装到临时目录，检查 33 个 skill/prompt 是否都能指向本地 CLI，并保留 local-only、no hidden heavy refresh、evidence writeback 约束。

`verify:workflow-closure` 覆盖新项目第一次闭环、既有项目文档更新、`reference` 无文档风险放行、`strict` stale/privacy 阻断。

`verify:cockpit-build` 检查 `zl-cockpit-build` 是否生成 `.planning/cockpit/index.html`、`cockpit-data.json` 和 `COCKPIT_REPORT.md`，并验证 cockpit 独立模板样例、`cockpit-viewmodel.v1`、Quality & Token Metrics、Graphify HTML 外部 URL 阻断、fallback 图、大图 `aggregated-community` 预览、RAG 缺失 `WAIVED_WITH_RISK` 和 `heavy refresh executed: no`。

`verify:visual` 使用 Playwright 渲染四个文档页面和 cockpit 样例，覆盖桌面、移动端与桌面暗色主题，并检查横向溢出、文字裁切、真实品牌素材和图谱节点。`verify:design` 执行静态设计契约，阻止假控制台、随机装饰 canvas、通用径向光晕、负字距、重复 cockpit 样式和缺失可访问性边界重新进入发布面。

`verify:pages` 组装 GitHub Pages 允许列表，只发布文档、cockpit 样例、验证报告和许可证，并阻止源码、runtime、脚本、依赖目录或符号链接进入站点。`verify:public-release` 检查 Apache-2.0、npm 公开元数据、Pages 渲染链接、社区健康文件、Dependabot、安全报告入口和常见密钥模式。

`verify:docs-completeness` 检查 `docs/commands.html` 是否覆盖全部 74 个公开逻辑命令的独立锚点、详情字段、示例和 README 跳转。

`verify:quality-closure` 是最终聚合 gate，会串起 check、quality、full command surface、integration、runtime、skills、security governance、workflow、cockpit、init policy 和 docs completeness。`verify:quality:daily` 是日常质量入口，`verify:quality:release` 是发版质量入口。

`verify:dev-audit-harness` 只验证维护者内部审计机制本身：`.zl-audit/` 是否 git ignored、`dev:audit:*` npm scripts 是否存在、三种 fixture 是否能生成。`dev:audit:skill-behavior` 生成 `SKILL_BEHAVIOR_SCORES`，按 33 个 runtime skill/prompt × 5 类 case 补足静态 `SKILL_SCORES` 不能证明真实行为契约的问题。`dev:audit:ragas-style` 生成本地代理 Ragas 指标；`dev:audit:promptfoo-redteam` 生成本地代理 Promptfoo 红队矩阵。`dev:audit:full` 会进一步生成命令评分、skills 评分、skill behavior 评分、feature gate 评分、security governance、Ragas-style、Promptfoo-style、quality control scorecard、Zhulong / GSD / Superpowers 同题对标、SkillsBench-style delta、时间拆分和 token 统计边界。GSD / Superpowers 使用本机真实 skill/plugin 文件做 `skill-pack-backed-replay`，真实 Codex 子进程结果单独记录，不混入 replay 分数。`Benchmark comparison` 是全部对标行的保守平均，不等于 Zhulong 单体分；Zhulong 产品分以三方总览中的 Zhulong 平均分为准。原始产物在 `.zl-audit/latest/`，可提交摘要在 `verification/reports/developer-audit-summary.md/json` 和 `verification/reports/quality-control-summary.md/json`。

质量评价方法论链接已在 2026-06-29 复核：OpenAI [Agent Skills docs](https://developers.openai.com/codex/skills) 和 [skill evals](https://developers.openai.com/blog/eval-skills) 用于 skill 结构与行为评估；[SkillsBench](https://arxiv.org/abs/2602.12670) / [SkillsBench 1.1](https://www.skillsbench.ai/blogs/skillsbench-1-1) 用于 with_skill / without_skill delta；[Anthropic agent evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) 用于 trajectory + outcome 分层；[Ragas agent metrics](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/agents/) 和 [Promptfoo Agent Skills](https://www.promptfoo.dev/docs/integrations/agent-skill/) 只做本地代理指标；[OWASP Agentic Top 10 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/) 与 [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework) / [NIST AI 600-1](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence) 用于治理 checklist 和 release gate。默认不接外部 SaaS，不调用外部模型，不外发内部资料。

只有在 fixture 数据允许离开本机时，才运行外部 live GraphRAG 验证：

```bash
GRAPHRAG_API_KEY=<your key> npm run verify:integration -- --live-graphrag
```

live GraphRAG 模式只把 key 写入临时 `graphrag-workspace/.env`，结束前会删除。不要提交临时工作目录，也不要提交保密项目生成的 GraphRAG artifact。

主要输出：

```text
verification/reports/latest.md
verification/reports/latest.json
verification/reports/docs-check.md
verification/reports/docs-update-fixture.md
verification/reports/docs-sync-check.md
verification/reports/ambiguity-check.md
verification/reports/structure-check.md
verification/reports/answer-audit-check.md
verification/reports/guardrails-check.md
verification/reports/knowledge-reliability-check.md
verification/reports/rag-command-check.md
verification/reports/rag-local-check.md
verification/reports/docs-extract-citation-check.md
verification/reports/graph-hardening-check.md
verification/reports/privacy-strict-check.md
verification/reports/security-governance-check.md
verification/reports/init-policy-check.md
verification/reports/business-chain-audit.md
verification/reports/OUTBOUND_AUDIT.md
verification/reports/license-audit.md
verification/reports/license-audit-check.md
verification/reports/mvp3-evidence-policy-check.md
verification/reports/full-command-surface-check.md
verification/reports/full-test-round-1.md
verification/reports/full-test-round-2.md
verification/reports/schema-check.md
verification/reports/naming-check.md
verification/reports/runtime-pack-status.md
verification/reports/skills-usability-check.md
verification/reports/workflow-closure-check.md
verification/reports/cockpit-build-check.md
verification/reports/docs-completeness-check.md
verification/reports/quality-closure-check.md
verification/reports/dev-audit-harness-check.md
verification/reports/dev-audit-harness-check.json
verification/reports/developer-audit-summary.md
verification/reports/developer-audit-summary.json
verification/reports/quality-control-summary.md
verification/reports/quality-control-summary.json
verification/reports/visual-check.md
verification/reports/design-quality-check.md
verification/reports/pages-site-check.md
verification/reports/public-release-check.md
verification/reports/quality-enhancement-report.md
```

默认验证不启用 live GraphRAG，除非显式传入 `--live-graphrag`。因此默认 WARN 可以接受；任何 FAIL 都不能接受。

正式两轮全量测试命令：

```bash
node scripts/run-full-test-plan.mjs --run-id round-1
node scripts/run-full-test-plan.mjs --run-id round-2
```

正式测试轮中如果出现失败，先记录到对应报告；修复属于后续轮次，不能在同一轮里静默覆盖事实。
