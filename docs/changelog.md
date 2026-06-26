# AI-PIKit Changelog

Date: 2026-06-25  
Full name: **AI Project Intelligence Kit**  
Documentation abbreviation: **AI-PIKit**  
Command namespace: **`pik-*`**

## 2026-06-27: MVP4.0 Knowledge Reliability Lite

本阶段目标：把“文档更新后怎么同步”和“AI 回答有没有依据”做成默认简单用法。范围刻意保持轻量，不做 `pik-rag-route`，不让 workflow 自动触发重任务。

新增命令：

- `pik-docs-sync`
- `pik-answer-audit`

新增能力：

- `pik-docs-sync --target <repo>` 默认按 diff -> extract -> citation audit 轻量同步文档，输出 `heavy refresh executed: no`。
- `pik-docs-sync --target <repo> --index` 才允许执行 configured GraphRAG index，输出 `heavy refresh executed: yes`。
- 文档新增、修改、删除时，`DOCS_SYNC` 状态写 `STALE_NEEDS_REFRESH`，默认不阻断，是否阻断交给 profile / policy。
- `pik-docs-query` 现在会写 `.planning/knowledge/DOCS_QUERY_RESULT.md` 和 `.planning/knowledge/DOCS_QUERY_RESULT.json`。
- `pik-answer-audit --target <repo>` 默认审计最近一次 `RAG_QUERY_RESULT.md`、`DOCS_QUERY_RESULT.md` 或 `CITATIONS.md`，日常不用复制长 answer。
- `pik-answer-audit --from <file>` 可审指定文件，`--answer "<text>"` 只作为调试 escape hatch。
- `answer audit` 第一版只做 citation/source-grounding：检查 citation 是否存在、源文件是否存在、行号是否合法；不做 LLM/NLI 级幻觉判断。
- public workflow facade 如果发现最近 query 结果但没有 answer audit，只把 `pik-answer-audit --target <repo>` 加到 next commands，不自动运行、不阻断 completion。
- `pik-help-skills` 的“文档更新”场景改为优先推荐 `pik-docs-sync` 和 `pik-answer-audit`。

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
- `docs/commands.html`：新增 `pik-docs-sync`、`pik-answer-audit` 的表格和全命令卡片。
- `docs/technical-guide.html`：新增 Knowledge Reliability Lite 流程、artifact contract 和验证入口。
- `docs/quality-plan.md`：新增质量矩阵和专项脚本说明。
- `docs/quality-dashboard.html` / `docs/product.html`：同步 70 / 70 命令面和新报告入口。

## 2026-06-25: MVP6 Workflow Facade & Policy Guard Contract

本阶段目标：把“命令很多”的心智负担收敛到 public workflow，同时把“允许跳过 / 必须阻断 / 带风险继续”固化成 AI-PIKit native policy-as-code 合同。

新增命令：

- `pik-policy-lock`
- `pik-policy-verify`
- `pik-policy-diff`

新增能力：

- public workflow 现在会写 `WORKFLOW_FACADE.json` 和 `WORKFLOW_FACADE.md`，把 preflight、policy、docs、graph、evidence、workflow gates 和下一步建议命令汇总成一个无感编排层。
- public workflow 只执行轻量检查，不会自动运行 `pik-docs-index --run`、`pik-graph-build --run` 或 `pik-refresh-run`。
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
- `npm run verify:full-command-surface`: PASS, 68 / 68 commands executed
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
- `docs/quality-dashboard.html` / `docs/product.html`：命令面更新为 68 / 68，并接入新增报告。

## 2026-06-25: Documentation Surface Sync

本阶段目标：把 HTML 文档从旧的产品说明状态同步到当前 AI-PIKit 能力面，避免页面只讲品牌和基础流程，却漏掉 MVP3.5 refresh control、local GraphRAG、Graphify hardening、quality dashboard 和 65 个命令面的实际用法。

更新内容：

- `docs/product.html`：更新为 MVP3.5 / 65 命令口径，补充 `pik-preflight`、`pik-refresh-plan`、`pik-refresh-run`、graph-lite/full-strict 等执行预算说明。
- `docs/technical-guide.html`：补齐 `.planning/refresh/`、文档/RAG 生命周期、Graphify impact/risk/freshness、runtime install/status、全量命令面和 troubleshooting。
- `docs/quality-dashboard.html`：增加验证脚本说明和 65 个命令的覆盖矩阵，让 QA Dashboard 可以作为当前质量入口。
- `docs/commands.html`：已保持 65 / 65 命令覆盖，作为完整命令使用手册继续保留。

验证证据：

- `npm run verify:docs`: PASS, links/issues clean
- `npm run verify:full-command-surface`: PASS, 65 / 65 commands executed
- `npm run verify:mvp35`: PASS
- `npm run verify:quality`: PASS, includes local RAG, privacy, Graphify, runtime and visual checks

## 2026-06-25: MVP3.5 Execution Budget & Freshness Control

本阶段目标：让 AI-PIKit 在保持 GraphRAG / Graphify 增强能力的同时，避免每个任务都触发重刷新。普通 workflow 只做轻量提醒，真正重刷新必须来自显式命令或 strict policy gate。

新增命令：

- `pik-preflight`
- `pik-refresh-plan`
- `pik-refresh-run`
- `pik-mode-status`
- `pik-mode-set`

新增能力：

- `.planning/refresh/REFRESH_STATE.json` 记录上次 GraphRAG / Graphify 成功刷新所在 commit。
- `pik-preflight` 只读取状态和 git diff，显示 GraphRAG / Graphify 距离 HEAD 落后几个 commit，不执行重刷新。
- `pik-refresh-plan` 判断落后 commit 是否改到了文档源或代码地图相关路径；无关 commit 显示 `behind-unrelated` 并建议跳过。
- `pik-refresh-run --rag|--graph|--all` 是显式刷新入口；它会写 `REFRESH_RUN.md`，并在成功后更新 `REFRESH_STATE.json`。
- `pik-docs-index --run` 和 `pik-graph-build --run` 也会更新刷新账本，因为它们本身就是显式重命令。
- `pik-mode-set` 支持 `default-local-rag`、`graph-lite`、`full-strict` 三种执行预算模式。
- `pik-policy-check --strict` 接入 `freshness.preflight`，可以让 stale 作为 policy failure，但不会自动重建。

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

本阶段目标：让 AI-PIKit 不只“能查文档、能跑 workflow”，而是能证明 RAG 答案、规格引用、代码影响面、验证证据和完成策略是可信的。

新增命令：

- `pik-rag-golden-add`
- `pik-rag-golden-run`
- `pik-rag-eval`
- `pik-citation-audit`
- `pik-trace-build`
- `pik-trace-query`
- `pik-trace-audit`
- `pik-policy-list`
- `pik-policy-check`
- `pik-policy-explain`
- `pik-help-skills`

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

- `pik-rag-init-local`
- `pik-privacy-audit`
- `pik-offline-lock`
- `pik-outbound-audit`
- `pik-license-audit`
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

- `pik-docs-extract`
- `pik-docs-diff`
- `pik-docs-citations`
- `pik-graph-impact`
- `pik-graph-risk`
- `pik-graph-freshness`
- `pik-workflow-audit`
- `pik-completion-check`
- `verify:docs-extract`
- `verify:graph-hardening`

证据报告：

- `verification/reports/docs-extract-citation-check.md`
- `verification/reports/graph-hardening-check.md`

## 2026-06-25: MVP1 Native `pik-*` Workflow Surface

本阶段目标：把 GSD 从用户入口移出去，保留为参考设计，建立 AI-PIKit 自己的命令面、workflow guard 和 runtime pack。

完成内容：

- `pik-init`
- `pik-codebase-scan`
- `pik-docs-scan`
- `pik-graph-build`
- `pik-evidence-record`
- `pik-runtime-install`
- `pik-debug`
- `pik-plan-phase`
- `pik-execute-phase`
- `pik-verify-work`
- `pik-complete-milestone`

设计结论：

- 用户只调用 `pik-*`。
- GSD 只作为 workflow 参考，不作为用户命令面。
- Codex、Claude Code、GitHub Copilot 通过 runtime command pack 接入同一套本地 CLI。

证据报告：

- `verification/reports/latest.md`
- `verification/reports/runtime-pack-status.md`
- `verification/reports/schema-check.md`
- `verification/reports/naming-check.md`

## 后续 Roadmap

下一阶段建议叫 **MVP4 Knowledge Reliability Mode**：

- 增强 RAG answer audit。
- 增加 `pik-docs-sync`，把文档更新后的 scan/extract/diff/index/citation 串成一个稳定流程。
- 增加更细的 GraphRAG query route：local / global / drift / basic。
- 增加项目级 QA Dashboard，让文档、代码图、trace、policy 和 evidence 关系可视化。
- 继续保持默认 local-only，不把保密项目资料默认发送到外部 provider。
