# AI-PIKit 验证说明

这个目录保存 AI-PIKit 的可复跑验证。它证明 AI-PIKit 当前使用 `pik-*` 作为主动 workflow 命令面，并把 GraphRAG 和 Graphify 作为增强后端接入。

验证重点包括：

- incomplete workflow 必须被 `pik-completion-check` 阻断。
- complete workflow 必须通过 codebase、docs、graph、plan、implementation、verification、evidence、writeback gate。
- 默认 Local GraphRAG 不需要外部 API key。
- MVP3 的 golden、citation、trace、policy、help skills 必须能在 fixture 中复跑。

运行确定性验证：

```bash
npm run check
npm run verify:rag-local
npm run verify:docs-extract
npm run verify:graph-hardening
npm run verify:privacy-strict
npm run verify:license
npm run verify:mvp3
npm run verify:mvp35
npm run verify:full-command-surface
npm run verify:quality
npm run verify:integration
```

`verify:rag-local` 是默认保密路径验证。它运行 Ollama + LanceDB 的本地 GraphRAG，不需要外部 API key，并在 index/query 前后执行 `pik-privacy-audit`。

`verify:docs-extract`、`verify:graph-hardening`、`verify:privacy-strict`、`verify:license` 覆盖 MVP2 hardening：本地文档抽取/citation、Graphify impact/risk/freshness、offline privacy lock/outbound blocking、license metadata review。

`verify:mvp3` 覆盖 MVP3 Evidence Quality & Policy Mode：RAG golden cases、citation audit、trace matrix、policy check、help skills。

`verify:mvp35` 覆盖 MVP3.5 Execution Budget & Freshness Control：preflight、refresh plan、显式 refresh-run、mode 切换、相关/无关 commit 判断和文档同步要求。

`verify:full-command-surface` 会执行 `package.json` 中声明的每个 `pik-*` / `pik` bin 命令。当前全命令面报告以 `package.json` 的实际命令数量为准。

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
verification/reports/rag-command-check.md
verification/reports/rag-local-check.md
verification/reports/docs-extract-citation-check.md
verification/reports/graph-hardening-check.md
verification/reports/privacy-strict-check.md
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
verification/reports/visual-check.md
verification/reports/quality-enhancement-report.md
```

默认验证不启用 live GraphRAG，除非显式传入 `--live-graphrag`。因此默认 WARN 可以接受；任何 FAIL 都不能接受。

正式两轮全量测试命令：

```bash
node scripts/run-full-test-plan.mjs --run-id round-1
node scripts/run-full-test-plan.mjs --run-id round-2
```

正式测试轮中如果出现失败，先记录到对应报告；修复属于后续轮次，不能在同一轮里静默覆盖事实。
