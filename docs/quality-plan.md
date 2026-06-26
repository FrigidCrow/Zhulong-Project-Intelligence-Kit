# AI Project Intelligence Kit Quality Plan

Status: implemented quality baseline with active enhancement backlog  
Date: 2026-06-25  
Full name: **AI Project Intelligence Kit**  
Documentation abbreviation: **AI-PIKit**  
Skill and command namespace: **`pik-*`**

## 1. 质量目标

AI-PIKit 的质量目标不是“命令能跑起来”这么低，而是证明它真的能让 AI 在项目上下文、仕様依据、代码影响面和验证闭环里工作。

目标能力可以拆成 6 条：

1. 用户在 Codex、Claude Code、GitHub Copilot 或 shell 中调用 `pik-*`，不会被引导回 `gsd-*`。
2. 新项目和既存项目都能接入，且不会搬动原项目源码。
3. 文档密集型项目可以扫描、归一化、查询文档；配置 RAG/GraphRAG 时可以显式执行并留下结果。
4. Graphify 可以作为代码地图后端被 AI-PIKit 调用、同步、查询、diff，并进入 workflow gate。
5. Workflow guard 能真实阻断未完成工作，不是只在 prompt 里提醒。
6. 每次“完成”都有 evidence、writeback、测试/验证记录和可复跑报告。

质量判断原则：

- 已验证范围内必须 100% 有证据；没有跑过的能力只能标为未验证，不能写成已支持。
- 每个关键能力都必须落到本地 artifact，例如 `.planning/knowledge/`、`.planning/graphs/`、`.planning/workflows/`、`.planning/evidence/`。
- 任何 runtime 适配都必须最终落到同一套本地 `pik-*` 命令，不允许三套逻辑分叉。
- GSD 只作为参考设计；AI-PIKit 自己的 workflow contract、guard state 和 evidence loop 才是当前质量边界。

## 2. 命名和兼容性质量线

对外命名必须统一：

| 类型 | 标准 |
| --- | --- |
| 产品全名 | AI Project Intelligence Kit |
| 文档缩写 | AI-PIKit |
| 命令/skills | `pik-*` |
| 禁止混用 | `AI PIK`、仅作为品牌名的 `PIK`、用户入口中的 `gsd-*` |

当前仍允许保留的内部兼容名：

| 标记 | 为什么暂时保留 |
| --- | --- |
| `PIK_CLI` | runtime pack 模板变量，改名会影响安装渲染兼容性 |
| `PIK_ARGS` | skill 参数占位，属于内部模板变量 |
| `PIK_KIT_ROOT` | runtime 安装上下文变量 |

当前已固化：

- `npm run verify:naming` 扫描 README、docs、runtime、core templates、scripts 和 generated report。
- 对外文档中出现 `Project Intelligence Kit` 时必须带 `AI` 前缀。
- 对外文档中出现 `PIK` 时必须是 `pik-*` 命令、内部模板变量或明确兼容说明。

## 3. 当前必跑验证

每次改 AI-PIKit 代码、runtime pack、workflow 或核心文档后，至少跑：

```bash
npm run check
npm run verify:integration
```

当前默认期望：

```text
PASS 132
FAIL 0
WARN 1
```

`WARN 1` 仅代表默认没有启用真实 live GraphRAG。只要本地 fixture RAG、Graphify fixture、runtime pack、workflow guard 和 evidence 均通过，这个 WARN 可以接受。

真实 GraphRAG 需要单独跑：

```bash
GRAPHRAG_API_KEY=<your key> npm run verify:integration -- --live-graphrag
```

最近一次外部 LLM live GraphRAG fixture 验证：

```text
Date: 2026-06-25
Scope: 脱敏 fixture 文档，不使用真实项目文档
Result: PASS 136 / FAIL 0 / WARN 0
Evidence: verification/reports/latest.md, verification/reports/latest.json
```

当前默认模式已经是 Local GraphRAG Default Mode：Ollama + LanceDB + local-only privacy audit，不需要外部 API key。外部 LLM live GraphRAG 只作为显式 opt-in smoke，用脱敏 fixture 验证外部接入能力。

当前已经固化：

```bash
npm run verify:docs
npm run verify:docs-update
npm run verify:rag
npm run verify:rag-local
npm run verify:docs-extract
npm run verify:docs-sync
npm run verify:answer-audit
npm run verify:knowledge-reliability
npm run verify:graph-hardening
npm run verify:privacy-strict
npm run verify:license
npm run verify:mvp3
npm run verify:mvp35
npm run verify:workflow-facade
npm run verify:policy-hardening
npm run verify:full-command-surface
npm run verify:schema
npm run verify:visual
npm run verify:naming
npm run verify:runtime
npm run verify:quality
npm run verify:all
```

其中 `verify:docs-update` 是文档更新 fixture：先扫描初始文档，再新增一份議事録，重跑 scan/normalize/query，并证明新内容被本地知识层命中。`verify:rag` 会专项测试 `pik docs ...` 和 `pik-docs-*` 的 RAG 命令矩阵。`verify:rag-local` 会真实运行 `pik-rag-init-local`、`pik-privacy-audit`、本地 GraphRAG index/query，并证明不需要外部 key。`verify:docs-extract` 覆盖 md/txt/csv/pdf/docx/xlsx 抽取、citation 和 docs diff。`verify:docs-sync` 覆盖 `pik-docs-sync` 默认轻量同步、文档新增/修改/删除 stale 标记和 `--index` 显式重索引。`verify:answer-audit` 覆盖无参数 answer audit、`--from`、`--answer`、坏 citation、missing citation profile 状态和 workflow facade 只提示不自动运行。`verify:knowledge-reliability` 覆盖 docs sync -> docs query -> answer audit 主路径。`verify:graph-hardening` 覆盖 Graph impact/risk/freshness 和 stale graph 负例。`verify:privacy-strict` 覆盖 offline lock、outbound audit 和危险外部命令阻断。`verify:license` 输出 license 元数据和商用风险摘要。`verify:mvp35` 覆盖 refresh/preflight/mode 控制、相关/无关 commit 判断、显式刷新账本和文档同步要求。`verify:workflow-facade` 覆盖 public workflow 的无感编排层和 no heavy refresh 约束。`verify:policy-hardening` 覆盖 policy lock/verify/diff、四态状态语义、profile 阻断和 no heavy refresh 约束。`verify:schema` 会创建临时项目并真实生成 manifest、workflow state、handoff、evidence record/writeback，再检查这些核心产物的必要结构。

`verify:mvp3` 覆盖 Evidence Quality & Policy Mode：RAG golden、citation audit、trace matrix、policy check、help skills。`verify:full-command-surface` 会逐个执行 `package.json` 中所有 `pik-*` 和 `pik` bin 命令，确认命令入口不是只写在文档里。

## 4. 测试矩阵

| 质量域 | 必测内容 | 当前证据 | 下一步增强 |
| --- | --- | --- | --- |
| CLI 语法 | `bin/pik.mjs` 可被 Node 解析 | `npm run check` | 增加所有 alias 的 help smoke test |
| 命令路由 | `pik-*` bin 均路由到本地 CLI | `package.json` bin + `docs-check.md` + integration | 增加所有 alias 的独立 smoke test |
| 新项目接入 | `pik-init --mode new` 生成工作台 | integration report | 增加空仓库、前端、后端 fixture |
| 既存项目接入 | `pik-init --mode existing` 后必须 `pik-codebase-scan` | integration report | 增加 monorepo、无测试项目、旧框架项目 |
| 文档扫描/抽取 | `pik-docs-scan` 生成来源清单，`pik-docs-extract` 抽取 pdf/docx/xlsx 并生成 citation 索引 | `docs-extract-citation-check.md` | 增加页码/Sheet 名和更强 chunk citation |
| 文档归一化 | `pik-docs-normalize` 写 normalized 文档 | `.planning/knowledge/normalized/` | 增加编码、日文文件名、重复文件测试 |
| 文档轻量同步 | `pik-docs-sync` 默认 diff/extract/citation audit，不触发 GraphRAG index；`--index` 才重索引 | `docs-sync-check.md` | 增加更细的 doc owner、文档类型和变更影响面分类 |
| 本地文档查询 | `pik-docs-query` 可命中 QA/仕様依据，并写 `DOCS_QUERY_RESULT.md/json` | `knowledge-reliability-check.md` | 增加 terminology/glossary 查询 |
| 回答依据审计 | `pik-answer-audit` 默认审最近 query；坏 citation FAIL；缺 citation 按 profile 输出 `WAIVED_WITH_RISK` 或 `FAIL` | `answer-audit-check.md` + `knowledge-reliability-check.md` | 增加 answer faithfulness / context recall / contradiction 检查 |
| RAG/GraphRAG | 默认本地 GraphRAG，`--run`、`--rag` 执行配置命令并写结果 | `rag-local-check.md` + `rag-command-check.md` + live GraphRAG smoke | 增加完整 graph-local profile 和 enterprise RAG provider matrix |
| RAG 可信度 | golden case、citation audit、RAG eval | `mvp3-evidence-policy-check.md` | 增加更细的 answer faithfulness / context recall 指标 |
| Graphify build | `pik-graph-build --run` 同步 graph/report，local-only 下先过 privacy audit | integration report + `privacy-strict-check.md` | 增加真实 Graphify 大项目 smoke |
| Graph impact/risk/freshness | `pik-graph-impact`、`pik-graph-risk`、`pik-graph-freshness --strict` | `graph-hardening-check.md` | 增加调用链/path query 验证 |
| Graph diff | baseline 与当前 graph 可 diff | integration report | 增加 stale graph 负例 |
| Workflow guard | incomplete workflow 必须 FAIL | integration negative case | 增加每个 public workflow 单独负例 |
| Completion gate | evidence/writeback 缺失必须阻断 | integration report | 增加人工 gate 缺失组合测试 |
| Evidence / Schema | record、index、writeback、workflow state 可追踪 | `.planning/evidence/` + `schema-check.md` | 扩展为严格 JSON Schema 和更多 record 类型 |
| Trace matrix | 文档、代码、测试、evidence 可被聚合和查询 | `mvp3-evidence-policy-check.md` + `full-command-surface-check.md` | 增加需求 ID、测试 ID、代码符号级 trace |
| Policy mode | local-only、citation、golden、trace、graph freshness、license 统一四态结果 | `mvp3-evidence-policy-check.md` | 继续扩展 policy-as-code 规则文件 |
| Policy contract | `pik-policy-lock` 生成 snapshot/hash，`pik-policy-verify` 确认未漂移，`pik-policy-diff` 输出字段级差异 | `policy-hardening-check.md` | 增加更多 config drift 组合和项目级 waiver 审批 |
| Refresh budget | 普通 workflow 只提醒，显式命令才刷新；无关 commit 可跳过，相关 commit 推荐差分刷新 | `mvp35-refresh-control-check.md` | 增加更细的 path owner 和 monorepo sub-project 策略 |
| Workflow facade | public workflow 自动关联轻量 preflight/policy/gate 摘要，但不触发重刷新 | `workflow-facade-check.md` | 为每个 public workflow 增加专属下一步建议 |
| Help skills | 根据用户场景推荐 `pik-*` 命令组 | `mvp3-evidence-policy-check.md` + `HELP_SKILLS.md` | 增加更多场景和项目状态感知 |
| Runtime pack | Codex/Claude/Copilot 安装包生成 | `runtime-pack-status.md` + integration report | 增加 runtime 真实调用 smoke |
| 文档页面 | HTML 链接、命令覆盖、视觉不溢出 | `docs-check.md` + `visual-check.md` | 增加更多 viewport 和交互状态截图 |
| 保密边界 | 默认本地文件，不主动上传 | 文档说明 | 增加 config 审计脚本和 offline 模式 |

## 5. 黄金 E2E 场景

AI-PIKit 的核心质量要靠场景证明。建议把下面 6 个场景做成 fixture，并且每个场景都写入 `verification/reports/`。

### 5.1 Japanese CR-017 改修场景

目的：证明对日文档密集型改修闭环可用。

步骤：

```bash
npm run verify:integration
```

必须证明：

- QA/仕様文档可被 `pik-docs-query` 命中。
- Graphify fixture 能暴露 `PROXY_APPROVAL_LIMIT` 或等价影响面。
- `pik-debug`、`pik-plan-phase`、`pik-execute-phase`、`pik-verify-work` 都能生成 handoff。
- incomplete workflow 会被 `pik-completion-check` 阻断。
- 补齐 plan、implementation、verification、evidence、writeback 后 completion 通过。

### 5.2 新项目从 0 开发场景

目的：证明 greenfield 项目不是空口支持。

建议 fixture：

```bash
tmp/new-order-app
  docs/
  src/
  tests/
```

必测：

- `pik-init --mode new`
- `pik-codebase-scan`
- `pik-docs-scan`
- `pik-new-milestone`
- `pik-plan-phase`
- `pik-execute-phase`
- `pik-verify-work`
- `pik-complete-milestone`

通过标准：

- `.planning/INIT_PROFILE.md` 记录 `Mode: new`。
- workflow state 存在。
- evidence index 存在。
- completion check 对未补齐 gate 的情况会失败。

### 5.3 既存项目继续开发场景

目的：证明 brownfield 不会只 init 而没有 codebase baseline。

必测：

```bash
pik-init --target "$PWD" --template brownfield-monorepo --name legacy --mode existing
pik-codebase-scan --target "$PWD"
pik-codebase-status --target "$PWD"
pik-docs-scan --target "$PWD"
pik-graph-build --target "$PWD" --run
pik-debug --target "$PWD" "既存障害"
```

通过标准：

- `.planning/codebase/CODEBASE_STATUS.md` 存在。
- source file count 大于 0。
- graph gate 不接受 stale 或缺失 graph。
- 原 `src/`、`tests/`、`docs/` 不被移动。

### 5.4 文档更新场景

目的：解决“文档改了之后怎么办”。

必测：

1. 第一次 `pik-docs-sync`，确认写入 `DOCS_SYNC.md/json`。
2. 查询旧文档关键字，确认 `DOCS_QUERY_RESULT.md/json` 写入。
3. 新增或修改 QA/議事録。
4. 重跑 `pik-docs-sync`，确认输出 `STALE_NEEDS_REFRESH` 且 `heavy refresh executed: no`。
5. 如果配置 RAG 且需要重建索引，再显式跑 `pik-docs-sync --index`。
6. 查询新关键字，确认命中新文档。
7. 跑 `pik-answer-audit --target "$PWD"`，确认回答依据状态。

通过标准：

- `RAG_SOURCES.md` 更新来源数量或 mtime 线索。
- `DOCS_SYNC.md` 记录新增、修改或删除。
- `pik-docs-query` 能命中新规则，并写 `DOCS_QUERY_RESULT.md/json`。
- `ANSWER_AUDIT.md` 对最近 query 给出 `PASS`、`WAIVED_WITH_RISK` 或 `FAIL`。
- RAG 模式下 `RAG_INDEX_RESULT.md` 和 `RAG_QUERY_RESULT.md` 更新。

### 5.5 Runtime command pack 场景

目的：证明 Codex、Claude Code、Copilot 的差异只是入口格式不同。

必测：

```bash
pik-runtime-install --runtime codex --dest <tmp>/codex-skills
pik-runtime-status --runtime codex --dest <tmp>/codex-skills
pik-runtime-install --runtime claude-code --dest <tmp>/claude-skills
pik-runtime-status --runtime claude-code --dest <tmp>/claude-skills
pik-runtime-install --runtime github-copilot --dest <tmp>/prompts
pik-runtime-status --runtime github-copilot --dest <tmp>/prompts
```

通过标准：

- Codex 和 Claude Code 目录中有 `SKILL.md`。
- Copilot 目录中有 `*.prompt.md`。
- 模板中的 `{{PIK_CLI}}` 已被渲染为本地 CLI。
- 用户可见命令是 `$pik-*` 或 `/pik-*`，不提示用户运行 `gsd-*`。

### 5.6 保密项目场景

目的：证明默认行为不会绕过用户配置向外发送项目资料。

必测：

- 不带 `--run` 时，`pik-docs-index` 只生成 handoff，不执行外部命令。
- 不带 `--rag` 时，`pik-docs-query` 只做本地查询。
- 不带 `--run` 时，`pik-graph-build` 只生成 Graphify handoff。
- `.planning/config.json` 中外部命令必须可审计。

通过标准：

- 默认命令只写目标项目本地文件。
- 所有会执行外部命令的入口都需要显式 `--run` 或 `--rag`。
- 报告中清楚标出 live GraphRAG 是否启用。

## 6. Release Quality Gates

### MVP1 gate

MVP1 可以发布的最低标准：

- `npm run check` 通过。
- `npm run verify:integration` 结果为 `FAIL 0`。
- 默认唯一 WARN 只能是 live GraphRAG 未启用。
- README、commands、technical-guide、runtime-command-packs 全部使用 AI-PIKit / `pik-*` 命名。
- `docs/commands.html` 覆盖 package bin 中所有 `pik-*`。
- 三个 HTML 页面桌面渲染无横向 overflow。
- `verification/reports/latest.md` 是最新脚本生成，不是手写伪报告。

### MVP2 gate

MVP2 应增加：

- `verify:docs`：检查文档链接、命令覆盖、命名一致性。
- `verify:visual`：Playwright 渲染 product/commands/technical-guide，并保存截图。
- `verify:naming`：禁止旧品牌名和 `gsd-*` 用户入口混入对外文档。
- `verify:runtime`：临时目录安装三种 runtime pack，并检查 `{{PIK_CLI}}` 渲染。
- `verify:schema`：检查 manifest、issue/phase schema 文档、workflow state、context handoff、evidence record/writeback 的必要结构。
- docs update fixture：证明文档更新后 scan/normalize/query/index 的变化。

### MVP3 gate

Status: implemented for Evidence Quality & Policy Mode.

MVP3 当前完成：

- `pik-rag-golden-add`、`pik-rag-golden-run`、`pik-rag-eval`。
- `pik-citation-audit`。
- `pik-trace-build`、`pik-trace-query`、`pik-trace-audit`。
- `pik-policy-list`、`pik-policy-check`、`pik-policy-explain`。
- `pik-help-skills`。
- `npm run verify:mvp3`。
- `npm run verify:full-command-surface`。
- `docs/full-test-plan.md` 和两轮正式测试报告入口。

MVP3 完成标准：

- `verify:mvp3` 必须 PASS。
- `verify:full-command-surface` 必须覆盖 `package.json` 中所有 bin 命令。
- `pik-policy-check --strict` 在 fixture 上必须 PASS。
- `pik-help-skills` 必须能按问题推荐至少 3 组 `pik-*` 命令。
- 正式测试轮失败时，先写入 `verification/reports/full-test-round-*.md`，不得在同一轮里修复并覆盖事实。

## 7. 增强路线

### Loop 1: 固化基础质量脚本

Status: implemented

目标：把现在手工复核的东西自动化。

要做：

- 新增 `scripts/verify-docs.mjs`。
- 新增 `scripts/verify-docs-update-fixture.mjs`。
- 新增 `scripts/verify-naming.mjs`。
- 新增 `scripts/verify-runtime-packs.mjs`。
- 新增 `scripts/verify-visual.mjs`。
- 在 `package.json` 增加对应 npm scripts。

完成定义：

- 一个命令能跑完整 docs/naming/runtime/visual 检查。
- 失败输出能指出具体文件和行。
- 当前聚合命令：`npm run verify:quality`。
- 当前完整命令：`npm run verify:all`。

### Loop 1.5: MVP3 证据质量和完整命令面

Status: implemented

目标：证明 AI-PIKit 的新命令不只是文档列表，而是能在临时项目中真实执行。

完成内容：

- `scripts/verify-mvp3-evidence-policy.mjs`
- `scripts/verify-full-command-surface.mjs`
- `scripts/run-full-test-plan.mjs`
- `verification/reports/mvp3-evidence-policy-check.md`
- `verification/reports/full-command-surface-check.md`

完成定义：

- `npm run verify:mvp3` PASS。
- `npm run verify:full-command-surface` PASS，并覆盖 `package.json` 中全部 `pik-*` / `pik` bin 命令。
- 两轮正式测试使用 `node scripts/run-full-test-plan.mjs --run-id round-1` 和 `round-2` 生成报告。

### Loop 1.6: MVP3.5 执行预算和刷新控制

Status: implemented

目标：避免每个 workflow 都重建 GraphRAG / Graphify，同时保留上下文新鲜度提醒和 strict policy gate。

新增命令：

- `pik-preflight`
- `pik-refresh-plan`
- `pik-refresh-run`
- `pik-mode-status`
- `pik-mode-set`

新增产物：

- `.planning/refresh/REFRESH_STATE.json`
- `.planning/refresh/PREFLIGHT.md`
- `.planning/refresh/REFRESH_PLAN.md`
- `.planning/refresh/REFRESH_RUN.md`
- `.planning/refresh/MODE.md`

完成定义：

- `pik-preflight` 必须显示 GraphRAG / Graphify 距离当前 HEAD 落后几个 commit，并输出 `heavy refresh executed: no`。
- 无关 commit 必须显示 `behind-unrelated`，不能要求刷新。
- 文档源相关 commit 必须推荐 `pik-refresh-run --rag`。
- 源码或测试相关 commit 必须推荐 `pik-refresh-run --graph`。
- `pik-refresh-run --rag|--graph|--all` 必须在成功后更新 `REFRESH_STATE.json`。
- `pik-mode-set` 必须支持 `default-local-rag`、`graph-lite`、`full-strict`。
- 新增功能、命令或 skills 必须同步更新 `README.md`、`docs/changelog.md`、`docs/commands.html`、`docs/quality-plan.md`。
- `npm run verify:mvp35` 必须 PASS。

### Loop 1.7: MVP6 workflow facade 和 policy guard contract

Status: implemented

目标：把“什么时候允许跳过、什么时候必须阻断、什么时候允许带风险继续”固化成本地 policy contract，同时让日常 public workflow 自动关联轻量检查，降低命令心智负担。

新增命令：

- `pik-policy-lock`
- `pik-policy-verify`
- `pik-policy-diff`

新增产物：

- `.planning/policies/POLICY_LOCK.json`
- `.planning/policies/POLICY_LOCK.md`
- `.planning/policies/POLICY_VERIFY.json`
- `.planning/policies/POLICY_VERIFY.md`
- `.planning/policies/POLICY_DIFF.json`
- `.planning/policies/POLICY_DIFF.md`
- `.planning/workflows/<workflow-id>/WORKFLOW_FACADE.json`
- `.planning/workflows/<workflow-id>/WORKFLOW_FACADE.md`

完成定义：

- `pik-policy-lock` 必须要求 offline lock，并生成稳定 snapshot 和 SHA-256 hash。
- `pik-policy-verify` 必须对比 lock，并执行轻量 privacy、preflight、citation、graph freshness checks。
- `pik-policy-diff` 必须输出字段级差异，例如 `privacy.allow_external_rag: false -> true`。
- `PASS`、`FAIL`、`WAIVED_WITH_RISK`、`STALE_NEEDS_REFRESH` 必须在 workflow/policy/completion 里含义一致。
- `graph-lite` 无文档允许继续，但 completion/evidence 必须写 `WAIVED_WITH_RISK`。
- `default-local-rag` 对 stale 只提醒，不自动刷新。
- `full-strict` 对 stale RAG、stale Graphify、missing citation、外部 provider/API key/URL 必须非 0。
- public workflow 必须写 `WORKFLOW_FACADE`，并输出 `heavy refresh executed: no`。
- policy 命令不得执行 `pik-docs-index --run`、`pik-graph-build --run`、`pik-refresh-run`。
- `npm run verify:workflow-facade` 和 `npm run verify:policy-hardening` 必须 PASS。
- 新增功能、命令和验证结果必须同步更新 `README.md`、`docs/changelog.md`、`docs/commands.html`、`docs/technical-guide.html`、`docs/quality-plan.md`、`docs/quality-dashboard.html`。

### Loop 1.8: MVP4.0 Knowledge Reliability Lite

Status: implemented

目标：把“文档更新后怎么同步”和“AI 回答有没有依据”做成默认简单用法，同时保持轻量，不引入 `pik-rag-route`，不让 workflow 自动触发重任务。

新增命令：

- `pik-docs-sync`
- `pik-answer-audit`

新增产物：

- `.planning/knowledge/DOCS_SYNC.json`
- `.planning/knowledge/DOCS_SYNC.md`
- `.planning/knowledge/DOCS_QUERY_RESULT.json`
- `.planning/knowledge/DOCS_QUERY_RESULT.md`
- `.planning/quality/ANSWER_AUDIT.json`
- `.planning/quality/ANSWER_AUDIT.md`

完成定义：

- `pik-docs-sync --target <repo>` 默认必须先 diff 再 extract，并输出 `heavy refresh executed: no`。
- 文档新增、修改、删除必须让 `DOCS_SYNC` 输出 `STALE_NEEDS_REFRESH`，默认 exit 0。
- `pik-docs-sync --target <repo> --index` 才允许执行 configured GraphRAG index，并输出 `heavy refresh executed: yes`。
- `pik-docs-query` 必须写 `DOCS_QUERY_RESULT.md/json`，并提示 `pik-answer-audit --target "$PWD"`。
- `pik-answer-audit --target <repo>` 必须自动选择最近一次 `RAG_QUERY_RESULT.md`、`DOCS_QUERY_RESULT.md` 或 `CITATIONS.md`。
- 有效 citation 必须 `PASS`；不存在源文件或非法行号必须 `FAIL`。
- missing citation 在 `graph-lite` 和 `default-local-rag` 下必须 `WAIVED_WITH_RISK` 且 exit 0；在 `full-strict` 下必须 `FAIL` 且非 0。
- public workflow facade 只建议 `pik-answer-audit`，不得自动运行，也不得新增 completion 阻断。
- `npm run verify:docs-sync`、`npm run verify:answer-audit`、`npm run verify:knowledge-reliability`、`npm run verify:full-command-surface` 必须 PASS。

### Loop 2: 扩展 fixture

目标：不要只靠 CR-017 一个样本。

要做：

- `examples/greenfield-web-app-fixture`
- `examples/brownfield-monorepo-fixture`
- `examples/docs-update-fixture`
- `examples/stale-graph-fixture`
- `examples/runtime-pack-fixture`

完成定义：

- 每个 fixture 都有 README、seed docs、expected artifacts。
- `verification/run-full-validation.mjs` 可以选择性运行 fixture。

### Loop 3: 加强 workflow guard

目标：让 guard 更接近“严格 workflow engine”。

要做：

- 每个 public workflow 定义必需 gates。
- 对不同 workflow 支持不同 completion requirements。
- 给 `WORKFLOW_STATE.json` 加 schema。
- 增加 `pik-workflow-audit`，输出当前 workflow 为什么不能完成。
- 增加负例：缺 docs、缺 graph、缺 evidence、缺 writeback、manual gate 未标记。

完成定义：

- AI 声称完成时，只要 artifact 不完整，`pik-completion-check` 必须非 0。
- 报错要告诉用户下一条该跑的 `pik-*` 命令。

### Loop 4: 加强文档/RAG 能力

目标：更贴近对日项目的资料形态。

要做：

- 增加 PDF、docx、xlsx、csv 的本地抽取策略。
- 记录文档 hash，判断文档是否更新。
- 增加 `pik-docs-diff`，展示文档来源变化。
- 增加 `pik-docs-glossary`，生成日中术语、代码别名、文档引用。
- RAG 结果必须附 source/citation；没有 citation 时只能标为 hypothesis。

完成定义：

- 文档更新后，AI-PIKit 能指出哪些来源变了。
- 查询答案能追到原文档路径和片段。

### Loop 5: 加强 Graphify 能力

目标：让代码地图真正提高改修/新规精度。

要做：

- 增加真实 Graphify adapter smoke。
- 增加 graph freshness 检查：源码比 graph 新时 gate warning/fail。
- 增加 `pik-graph-impact --files <changed files>`。
- 增加 `pik-graph-risk`，标出高耦合节点、入口、测试缺口。
- Graph diff 中区分新增节点、删除节点、边变化和高风险模块变化。

完成定义：

- 改代码前能查影响面。
- 改代码后能看影响面是否扩大。
- stale graph 不能被当作通过证据。

### Loop 6: 加强 runtime 实测

目标：不是“文件装进去了”，而是 runtime 真能按流程调用。

要做：

- Codex skill smoke：检查 `$pik-debug` skill 文件、frontmatter、`PIK_CLI` 渲染。
- Claude Code skill smoke：检查 `/pik-debug` skill 文件和调用说明。
- Copilot prompt smoke：检查 `.github/prompts/*.prompt.md`。
- 增加 runtime pack version stamp。
- 安装后生成 `RUNTIME_PACK_STATUS.md`。

完成定义：

- `pik-runtime-status` 不只看文件存在，还检查内容是否指向当前本地 CLI。
- 文档中 runtime 能力和实际安装内容一致。

### Loop 7: 可视化 QA 和报告

Status: partially implemented

目标：让质量状态一眼能看懂。

要做：

- validation 输出 `latest.json`。已实现。
- 新增 `docs/quality-dashboard.html`。已实现。
- 展示 PASS/FAIL/WARN、最近截图、runtime pack 状态、fixture 覆盖率。
- 支持打开 artifact 路径。

完成定义：

- dashboard 不是营销页面，而是 QA 操作台。
- 每个绿色状态都能点到对应证据。

## 8. 证据标准

以后任何“已支持”声明都要满足：

| 声明 | 必须证据 |
| --- | --- |
| 支持新项目接入 | init/codebase/docs/verify 的命令输出和 `.planning/INIT_PROFILE.md` |
| 支持既存项目接入 | source count > 0 的 `CODEBASE_STATUS.md` |
| 支持文档同步 | `DOCS_SYNC.md/json`、`DOCUMENT_INDEX.json`、`DOCUMENT_DIFF.md`、`heavy refresh executed` 标记 |
| 支持文档查询 | `RAG_SOURCES.md`、`DOCS_QUERY_RESULT.md/json`、query output |
| 支持回答依据审计 | `ANSWER_AUDIT.md/json`、citation 源文件检查、profile 状态语义 |
| 支持 GraphRAG | `rag-local-check.md`、`RAG_INDEX_RESULT.md`、`RAG_QUERY_RESULT.md`、privacy audit、live/fixture 标记 |
| 支持 Graphify | `.planning/graphs/graph.json`、`GRAPH_REPORT.md`、query/diff output |
| 支持 runtime | 安装目录文件、渲染后的 `PIK_CLI`、runtime status |
| 支持严格流程 | incomplete fail、complete pass、WORKFLOW_STATE.json |
| 支持 evidence loop | evidence record、INDEX、writeback section |

报告位置：

```text
verification/reports/latest.md
verification/reports/*.png
verification/reports/latest.json
verification/reports/docs-check.md
verification/reports/docs-update-fixture.md
verification/reports/docs-sync-check.md
verification/reports/answer-audit-check.md
verification/reports/knowledge-reliability-check.md
verification/reports/rag-command-check.md
verification/reports/rag-local-check.md
verification/reports/schema-check.md
verification/reports/naming-check.md
verification/reports/runtime-pack-status.md
verification/reports/visual-check.md
```

## 9. 每次开发的推荐质量循环

普通改动：

```bash
npm run check
npm run verify:quality
npm run verify:integration
```

涉及 docs/html：

```bash
npm run check
npm run verify:docs
npm run verify:naming
npm run verify:visual
```

涉及 runtime pack：

```bash
npm run check
npm run verify:runtime
```

涉及 GraphRAG/Graphify：

```bash
npm run check
npm run verify:rag
npm run verify:integration
GRAPHRAG_API_KEY=<your key> npm run verify:integration -- --live-graphrag
```

涉及 workflow/guard：

```bash
npm run check
npm run verify:workflow-facade
npm run verify:policy-hardening
npm run verify:integration
```

并额外人工确认：

- incomplete workflow 是否非 0。
- 缺 docs、缺 graph、缺 evidence、缺 writeback 时是否都能阻断。
- 报错是否提示 `pik-*`，而不是 `gsd-*`。

## 10. 近期优先级

P0：

- 命名统一：AI Project Intelligence Kit / AI-PIKit / `pik-*`。
- `verify:integration` 保持 FAIL 0。
- README、commands、technical-guide 与实际命令一致。
- runtime pack 不提示用户使用 `gsd-*`。
- `verify:quality` 和 `verify:all` 保持可复跑。

P1：

- 增加 workflow guard 负例覆盖。
- 扩展 docs update fixture 到更多文档格式。
- 将 QA dashboard 接入 future `latest.json` 历史趋势。

P2：

- 增加真实 Graphify smoke。
- 增加完整 graph-local profile 和 live/local/enterprise RAG provider matrix。
- 扩展 schema validation 到严格 JSON Schema、issue/phase 实例和更多负例。
- 输出更多 JSON report 字段供 dashboard 聚合。

P3：

- 文档 hash、docs diff、glossary。
- Graph impact/risk 命令。
- 更严格的 OS-level offline mode。
- 完整 graph-local profile：在本地 LLM 上稳定完成实体/关系抽取和 `local/global` graph search。

## 11. 不达标时的处理规则

- 有 FAIL：不能宣称对应能力可用。
- 有 WARN：必须说明 WARN 的范围，以及是否影响当前结论。
- live provider 未跑：只能说 fixture/local 通过，不能说真实 provider 已验证。
- runtime pack 只安装但未检查内容：只能说文件存在，不能说 runtime 能正确调用。
- 文档或 graph stale：不能作为 completion evidence。
- AI runtime 对话里说完成，但 `pik-completion-check` 不通过：以 guard 为准。
