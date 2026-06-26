# AI Project Intelligence Kit（AI-PIKit）

AI Project Intelligence Kit，文档缩写 AI-PIKit，是一个面向文档密集型软件开发的 AI 工程上下文框架。

它不是替代 Codex、Claude Code 或 GitHub Copilot，也不是把 GSD、GraphRAG、Graphify 简单捆绑在一起。AI-PIKit 的目标是让 AI 在写代码之前进入项目上下文、仕様依据、代码影响面和验证闭环。

```text
pik 命令
  -> 读取项目状态
  -> 查询 仕様 / QA / 議事録 / 设计文档
  -> 查询 Graphify 代码地图和影响面
  -> 生成计划并实施
  -> 运行测试和验证
  -> 写回决策、证据、风险和后续事项
```

## 文档入口

| 文档 | 用途 | 文件 |
| --- | --- | --- |
| 产品宣传页 | 面向介绍、展示和讲清 AI-PIKit 的品牌定位 | [docs/product.html](docs/product.html) |
| 命令使用手册 | 每个 `pik-*` 命令的用途、用法、示例和产出 | [docs/commands.html](docs/commands.html) |
| 技术教程 | 从架构、目录、guard、RAG、Graphify、runtime 到验证闭环的完整教学 | [docs/technical-guide.html](docs/technical-guide.html) |
| 质量计划 | 围绕目标能力的测试矩阵、质量 gate、增强路线和证据标准 | [docs/quality-plan.md](docs/quality-plan.md) |
| QA Dashboard | 本地验证状态、质量脚本和截图证据的可视化入口 | [docs/quality-dashboard.html](docs/quality-dashboard.html) |
| 架构说明 | Markdown 版架构记录 | [docs/architecture.md](docs/architecture.md) |
| Runtime command pack | Codex / Claude Code / GitHub Copilot 安装说明 | [docs/runtime-command-packs.md](docs/runtime-command-packs.md) |
| 愿望单 | 当前产品方向和历史决策 | [docs/wishlist.md](docs/wishlist.md) |
| 完整测试计划 | 两轮全量测试的命令矩阵、流程、失败记录规则和报告路径 | [docs/full-test-plan.md](docs/full-test-plan.md) |
| Changelog | 每个阶段做了什么、验证证据在哪里、下一阶段边界是什么 | [docs/changelog.md](docs/changelog.md) |
| 验证报告 | 最近一次完整验证结果 | [verification/reports/latest.md](verification/reports/latest.md) |
| 增强报告 | 基于质量计划的本次增强总结、证据和后续边界 | [verification/reports/quality-enhancement-report.md](verification/reports/quality-enhancement-report.md) |
| Workflow / Policy 增强报告 | 本次无感编排层和 policy-as-code 合同的实施总结 | [verification/reports/workflow-policy-enhancement-report.md](verification/reports/workflow-policy-enhancement-report.md) |

HTML 文档可以直接用浏览器打开，不需要启动服务。

## 当前定位

AI-PIKit 是一个 **AI 工程上下文框架**，由四层组成：

| 层 | 作用 | 当前实现 |
| --- | --- | --- |
| Workflow guard | 任务状态、计划、实现、验证、完成前 gate | AI-PIKit native workflow，GSD 仅作参考设计 |
| 文档证据 | 仕様、QA、議事録、设计文档、术语、需求追踪 | 本地扫描 + 可配置 GraphRAG/RAG |
| 代码地图 | 调用链、依赖、影响面、高风险模块 | 可配置 Graphify |
| Evidence loop | 测试输出、验证记录、风险、后续事项 | `.planning/evidence/` 和 writeback |

稳定外部入口是 `pik-*`。不要把 `gsd-*` 当作 AI-PIKit 的用户命令；GSD 只作为 workflow 设计参考。

## 快速开始

### 新项目

```bash
cd /path/to/new-project

pik-init --target "$PWD" --template greenfield-app --name my_new_project --mode new
pik-codebase-scan --target "$PWD"
pik-docs-scan --target "$PWD"
pik-verify --target "$PWD"
```

### 既存项目

```bash
cd /path/to/existing-project

pik-init --target "$PWD" --template brownfield-monorepo --name existing_project --mode existing
pik-codebase-scan --target "$PWD"
pik-codebase-status --target "$PWD"
pik-docs-scan --target "$PWD"
pik-docs-normalize --target "$PWD"
pik-docs-extract --target "$PWD"
pik-rag-init-local --target "$PWD"
pik-offline-lock --target "$PWD"
pik-graph-build --target "$PWD" --run
pik-preflight --target "$PWD"
pik-verify --target "$PWD"
```

既存项目接入后必须先跑 `pik-codebase-scan`。`pik-init` 只负责叠加 AI-PIKit 工作台；`pik-codebase-scan` 才会建立旧代码库的 baseline。workflow guard 的 `codebase` gate 会检查 `.planning/codebase/CODEBASE_STATUS.md`，并且既存项目要求扫描到源码数量。

接入后的更新规则：

- 原项目源码结构、入口、测试目录明显变化后，重跑 `pik-codebase-scan --target "$PWD"`。
- Graphify 输出过期或改修前需要重新判断影响面时，重跑 `pik-graph-build --target "$PWD" --run`。
- 仕様書、QA、議事録、设计文档新增或更新后，优先运行 `pik-docs-sync --target "$PWD"`。它会按 diff -> extract -> citation audit 的顺序轻量同步，并只标记 `STALE_NEEDS_REFRESH`，不会默认重建 GraphRAG。
- 默认使用本地 GraphRAG 时，第一次接入或文档来源变化后运行 `pik-rag-init-local --target "$PWD"`，再运行 `pik-docs-index --target "$PWD" --run`。

## 默认本地 GraphRAG

AI-PIKit 的默认知识后端是 **Local GraphRAG Default Mode**。默认配置不需要 `GRAPHRAG_API_KEY`，也不允许把文档发给外部 LLM provider。

本地依赖安装和检查：

```bash
python3 --version  # GraphRAG 官方要求 Python 3.10-3.12
python3 -m pip install --user graphrag
export PATH="$HOME/.local/bin:$PATH"

brew install ollama
brew services start ollama

graphrag --help
ollama --version
ollama pull qwen2.5:14b
ollama pull nomic-embed-text
```

如果你用 Ollama macOS App，也可以打开 App 让它提供本地 `ollama` CLI；关键是 `ollama --version` 可用，并且 `http://127.0.0.1:11434` 只指向本机服务。

新项目或既存项目接入后，按这个顺序准备本地知识库：

```bash
pik-docs-scan --target "$PWD"
pik-docs-normalize --target "$PWD"
pik-docs-sync --target "$PWD"
pik-rag-init-local --target "$PWD"
pik-privacy-audit --target "$PWD"
pik-docs-index --target "$PWD" --run
pik-docs-query --target "$PWD" --rag "代理承認の上限金額は？"
pik-answer-audit --target "$PWD"
```

`pik-rag-init-local` 会生成：

```text
graphrag-workspace/settings.yaml
graphrag-workspace/input/
.planning/knowledge/LOCAL_RAG_STATUS.md
.planning/knowledge/PRIVACY_AUDIT.md
```

默认本地配置是：

```text
model_provider: ollama
api_base: http://127.0.0.1:11434
llm model: qwen2.5:14b
embedding model: nomic-embed-text
vector store: lancedb
profile: local_basic
external API key: not required
```

不要把 `graphrag-workspace/settings.yaml` 或 `.planning/config.json` 改成外部 provider，除非项目明确允许外发数据。风险原因很直接：GraphRAG index 会读取输入文档并生成 text units、embedding、检索上下文；GraphRAG query 会把问题和相关上下文交给配置的模型。如果把 `model_provider` 改成 `openai`、`deepseek`、`azure` 等，或者把 `api_base` 改成外部 URL，这些内容就可能离开本机。

外部 GraphRAG 只能作为显式 opt-in：

```bash
GRAPHRAG_API_KEY=<your key> npm run verify:integration -- --live-graphrag
```

## MVP2 强化能力

当前 MVP2 强化围绕四条线：文档证据、代码影响面、workflow gate、隐私/offline。

### 文档抽取 + citation

AI-PIKit 现在可以本地抽取 `md/txt/csv/pdf/docx/xlsx`，生成 hash 索引，并用 citation 作为规格依据。

```bash
pik-docs-extract --target "$PWD"
pik-docs-citations --target "$PWD" "代理承認 上限"
pik-docs-diff --target "$PWD"
```

产物：

```text
.planning/knowledge/DOCUMENT_INDEX.json
.planning/knowledge/DOCUMENT_EXTRACT_REPORT.md
.planning/knowledge/extracted/
.planning/knowledge/CITATIONS.md
.planning/knowledge/DOCUMENT_DIFF.md
```

规则：没有 citation 的回答只能当作 hypothesis，不能当作仕様依据。

### Graphify impact / risk / freshness

Graphify 结果现在不只用于查询，还用于影响面、风险和过期检查。

```bash
pik-graph-impact --target "$PWD" --files "src/a.js,src/b.js"
pik-graph-risk --target "$PWD"
pik-graph-freshness --target "$PWD" --strict
```

产物：

```text
.planning/graphs/GRAPH_IMPACT.md
.planning/graphs/GRAPH_RISK.md
.planning/graphs/GRAPH_FRESHNESS.md
```

规则：`pik-graph-freshness --strict` 发现源码比 graph 新时返回非 0；stale graph 不能当作完成证据。

### Workflow gate 严格化

`pik-workflow-audit` 会把当前 workflow 缺什么证据、下一条该跑什么命令写出来。

```bash
pik-workflow-audit --target "$PWD"
pik-completion-check --target "$PWD"
```

规则：`pik-completion-check` 必须保持硬 gate。只要 context、codebase、docs、graph、plan、implementation、verification、evidence、writeback 任一 gate 不通过，就不能完成。

### Privacy strict / offline lock / outbound audit

保密项目建议初始化后立即启用：

```bash
pik-offline-lock --target "$PWD"
pik-privacy-audit --target "$PWD" --strict
pik-outbound-audit --target "$PWD"
```

产物：

```text
.planning/privacy/OFFLINE_LOCK.json
.planning/privacy/OFFLINE_LOCK.md
.planning/privacy/OUTBOUND_AUDIT.md
.planning/knowledge/PRIVACY_AUDIT.md
```

AI-PIKit 默认只允许 local-only：`127.0.0.1` / `localhost`。除 Codex、Claude Code、GitHub Copilot 这些你主动使用的 coding runtime 外，AI-PIKit 命令不应该把项目资料发送到外部服务。`pik-docs-index --run`、`pik-docs-query --rag`、`pik-graph-build --run` 都会在 local-only/offline 场景下先跑隐私审计；如果配置里出现外部 URL、外部 provider、API key 形态内容、`curl/wget/scp/ssh/rsync/nc/ftp` 等网络命令，会被阻断。

AI-PIKit 自身的外发审计报告见 [verification/reports/OUTBOUND_AUDIT.md](verification/reports/OUTBOUND_AUDIT.md)。报告中的 WARN 是检测规则、负例 fixture 或显式 opt-in live GraphRAG 的代码路径，不是默认执行行为。

不要改 `.planning/config.json`、`.planning/privacy/OFFLINE_LOCK.json`、`graphrag-workspace/settings.yaml` 里的 local-only 配置。风险原因：GraphRAG index 会读取原始文档和 text units；query 会把问题和上下文交给配置模型；Graphify build 会读取源码结构。把这些命令改成外部 endpoint 就可能造成资料外泄。

### License audit

```bash
pik-license-audit --target "$PWD"
npm run verify:license
```

最近一次本机审计：

```text
Restricted / commercial-review licenses: 0
Non-MIT or unknown items: 3
Unknown license metadata: 3
```

当前未发现明确禁止商用的 license。需要注意：AI-PIKit 目前是 `private` package，未声明公开分发 license；本机 `graphrag` CLI 和 `graphify` CLI 可执行文件存在，但本地包元数据没有提供 license，应按 review-needed 处理；Ollama Homebrew 元数据为 MIT。不要把 unknown 写成 MIT。

## MVP3 Evidence Quality & Policy Mode

MVP3 的目标是把“AI 查到了、AI 改了、AI 说测试过了”升级成可审计的证据链。它新增三类能力：RAG golden cases、trace matrix、policy check。

```bash
pik-rag-golden-add --target "$PWD" \
  --question "代理承認の上限金額は？" \
  --expect "30,000" \
  --citation "docs/qa/QA-042.md:3"

pik-rag-golden-run --target "$PWD"
pik-rag-eval --target "$PWD"
pik-citation-audit --target "$PWD"

pik-trace-build --target "$PWD"
pik-trace-query --target "$PWD" "代理承認"
pik-trace-audit --target "$PWD"

pik-policy-list --target "$PWD"
pik-policy-explain --target "$PWD" trace.matrix
pik-policy-check --target "$PWD" --strict
```

产物：

```text
.planning/quality/rag-goldens.json
.planning/quality/RAG_GOLDEN_RESULTS.md
.planning/quality/RAG_EVAL.md
.planning/knowledge/CITATION_AUDIT.md
.planning/trace/TRACE_MATRIX.json
.planning/trace/TRACE_AUDIT.md
.planning/policies/POLICY_CHECK.md
```

规则：RAG 结果必须能被 golden/citation 复查；文档、代码、测试、evidence 必须能进入 trace matrix；保密项目的 `pik-policy-check --strict` 必须在 offline lock、privacy、citation、golden、trace、graph freshness、license 这些检查上给出明确 PASS/FAIL。

### Help skills

当你不确定该跑什么命令时，用：

```bash
pik-help-skills --target "$PWD" "文档更新后想确认影响面和完成前检查"
```

它会根据问题推荐 3 组最相关的 `pik-*` 命令，并在目标项目写入：

```text
.planning/help/HELP_SKILLS.md
```

这不是聊天建议，而是本地可追踪的命令推荐记录。

## MVP4.0 Knowledge Reliability Lite

MVP4.0 解决两个日常问题：文档更新后怎么同步、AI 回答有没有依据。默认用法必须简单，不要求你复制一大段回答。

### 文档更新默认同步

```bash
pik-docs-sync --target "$PWD"
```

默认 `pik-docs-sync` 只跑轻量流程：

```text
scan / diff / extract / citation audit
```

它会先根据旧的 `DOCUMENT_INDEX.json` 计算 diff，再覆盖新的文档索引，避免“刚抽取完就看不出文档变了”。发现新增、修改、删除时，报告状态写 `STALE_NEEDS_REFRESH`，但默认 exit 0，也不会跑 GraphRAG index。

产物：

```text
.planning/knowledge/DOCS_SYNC.json
.planning/knowledge/DOCS_SYNC.md
```

只有显式加 `--index` 才会触发 GraphRAG index：

```bash
pik-docs-sync --target "$PWD" --index
```

这个命令会输出 `heavy refresh executed: yes`。不带 `--index` 时必须输出 `heavy refresh executed: no`。

### 回答依据默认审计

查完文档或 RAG 后，直接运行：

```bash
pik-answer-audit --target "$PWD"
```

默认来源优先级：

1. `.planning/knowledge/RAG_QUERY_RESULT.md`
2. `.planning/knowledge/DOCS_QUERY_RESULT.md`
3. `.planning/knowledge/CITATIONS.md`

日常不需要写 `--answer "..."`。`--answer` 只作为调试 escape hatch：

```bash
pik-answer-audit --target "$PWD" --from .planning/knowledge/DOCS_QUERY_RESULT.md
pik-answer-audit --target "$PWD" --answer "回答内容 [docs/spec.md:3]"
```

产物：

```text
.planning/quality/ANSWER_AUDIT.json
.planning/quality/ANSWER_AUDIT.md
```

状态规则：

| 场景 | 状态 |
| --- | --- |
| 有 citation 且源文件存在 | `PASS` |
| citation 指向不存在文件或非法行号 | `FAIL` |
| 无 citation，`graph-lite` / `default-local-rag` | `WAIVED_WITH_RISK`，exit 0 |
| 无 citation，`full-strict` | `FAIL`，exit 1 |

`pik-docs-query` 现在也会写 `.planning/knowledge/DOCS_QUERY_RESULT.md/json`，并提示下一步运行 `pik-answer-audit --target "$PWD"`。public workflow facade 如果发现最近 query 结果但还没有 answer audit，只会把 `pik-answer-audit --target <repo>` 加到 next commands，不会自动运行、不会阻断 completion。

## MVP3.5 Execution Budget & Freshness Control

MVP3.5 解决的是“不要每次任务都把 GraphRAG 和 Graphify 全量跑一遍”的问题。AI-PIKit 现在会记录上次 GraphRAG / Graphify 成功刷新的 commit，并用轻量 preflight 提醒它们距离当前 HEAD 落后了多少个 commit。

默认规则：

- 普通 `pik-debug`、`pik-plan-phase`、`pik-execute-phase` 只读取刷新状态并提醒，不自动重建 GraphRAG 或 Graphify。
- `pik-preflight` 和 `pik-refresh-plan` 不执行重刷新，只写报告。
- 真正执行刷新必须用 `pik-refresh-run --rag`、`pik-refresh-run --graph`、`pik-refresh-run --all`，或已有显式命令 `pik-docs-index --run`、`pik-graph-build --run`。
- 如果落后的 commit 只改了无关文件，AI-PIKit 会显示 `behind-unrelated`，建议跳过。
- 如果落后的 commit 改了 `docs` / `documents` / `仕様書` 等文档源，推荐差分刷新 GraphRAG。
- 如果落后的 commit 改了源码、测试或代码地图关注路径，推荐差分刷新 Graphify。

常用命令：

```bash
pik-preflight --target "$PWD"
pik-refresh-plan --target "$PWD"
pik-refresh-run --target "$PWD" --rag
pik-refresh-run --target "$PWD" --graph
pik-mode-status --target "$PWD"
pik-mode-set --target "$PWD" graph-lite
```

产物：

```text
.planning/refresh/REFRESH_STATE.json
.planning/refresh/PREFLIGHT.md
.planning/refresh/REFRESH_PLAN.md
.planning/refresh/REFRESH_RUN.md
.planning/refresh/MODE.md
```

三种模式：

| 模式 | 用途 |
| --- | --- |
| `default-local-rag` | 默认模式。本地 GraphRAG + Graphify 都参与，但 stale 只提醒，不自动重建。 |
| `graph-lite` | 轻量模式。适合先只用 AI-PIKit + Graphify/codebase，RAG 缺失可以标记 `WAIVED_WITH_RISK`。 |
| `full-strict` | 严格模式。相关文档或代码变更导致 stale 时，`pik-preflight --strict` / policy 会失败。 |

新增能力或命令时必须同步更新 `README.md`、`docs/changelog.md`、`docs/commands.html` 和 `docs/quality-plan.md`。`npm run verify:mvp35` 会检查这条规则。

## MVP6 Workflow Facade & Policy Guard Contract

MVP6 解决的是“命令越来越多，开发时不应该都记住”的问题。日常开发优先调用 public workflow：

```bash
pik-new-milestone --target "$PWD" "CR-017 代理承認上限修正"
pik-spec-phase --target "$PWD" "仕様確認"
pik-discuss-phase --target "$PWD" "未決事項整理"
pik-ui-phase --target "$PWD" "画面影響確認"
pik-plan-phase --target "$PWD" "実装計画"
pik-execute-phase --target "$PWD" "実装"
pik-verify-work --target "$PWD" "検証"
pik-complete-milestone --target "$PWD" "CR-017 完了"
pik-debug --target "$PWD" "代理承認上限が仕様と違う"
```

这些 public workflow 会无感调用轻量检查：preflight、policy check、docs/code/graph/evidence 状态和 workflow gate 汇总。它们会写：

```text
.planning/workflows/<workflow-id>/WORKFLOW_FACADE.json
.planning/workflows/<workflow-id>/WORKFLOW_FACADE.md
```

规则：public workflow 不会自动执行 heavy refresh。也就是说它不会悄悄跑 `pik-docs-index --run`、`pik-graph-build --run` 或 `pik-refresh-run`。如果 GraphRAG 或 Graphify stale，它只会输出 `STALE_NEEDS_REFRESH` 和推荐命令；是否刷新由你显式决定，或由 strict policy gate 阻断。

MVP6 同时新增 policy-as-code 合同，不引入 OPA，先用 AI-PIKit native snapshot：

```bash
pik-offline-lock --target "$PWD"
pik-policy-lock --target "$PWD"
pik-policy-verify --target "$PWD"
pik-policy-diff --target "$PWD"
```

产物固定在：

```text
.planning/policies/POLICY_LOCK.json
.planning/policies/POLICY_LOCK.md
.planning/policies/POLICY_VERIFY.json
.planning/policies/POLICY_VERIFY.md
.planning/policies/POLICY_DIFF.json
.planning/policies/POLICY_DIFF.md
```

统一状态语义：

| 状态 | 含义 |
| --- | --- |
| `PASS` | 可以作为完成证据。 |
| `FAIL` | 必须阻断。 |
| `WAIVED_WITH_RISK` | 允许继续，但报告必须写明风险和缺失依据。 |
| `STALE_NEEDS_REFRESH` | RAG/Graphify 可能落后；是否阻断由 profile 决定。 |

profile 规则：

| Profile | 规则 |
| --- | --- |
| `graph-lite` | 文档/RAG 缺失允许继续，但 workflow 和 completion/evidence 必须写 `WAIVED_WITH_RISK`；Graphify 仍 required；隐私问题永远 FAIL。 |
| `default-local-rag` | stale RAG / stale Graphify 只提醒，不自动刷新，也默认不阻断。 |
| `full-strict` | stale RAG、stale Graphify、missing citation、外部 provider、API key、外部 URL 都会阻断。 |

`pik-policy-lock` 会生成稳定 policy snapshot 和 SHA-256 hash。`pik-policy-verify` 会重新生成当前 snapshot，对比 lock，并执行轻量 privacy/preflight/citation/graph freshness checks。`pik-policy-diff` 会输出字段级差异，例如 `privacy.allow_external_rag: false -> true`。三个命令都会输出 `heavy refresh executed: no`，证明它们不会触发 GraphRAG index 或 Graphify build。

## 常用闭环

```bash
pik-debug --target "$PWD" "代理承認上限が仕様と違う"

pik-preflight --target "$PWD"
pik-refresh-plan --target "$PWD"
pik-codebase-scan --target "$PWD"
pik-docs-query --target "$PWD" --rag "代理承認の上限金額"
pik-answer-audit --target "$PWD"
pik-graph-build --target "$PWD" --run

pik-workflow-continue --target "$PWD" --gate plan --evidence "PLAN.md reviewed"
pik-workflow-continue --target "$PWD" --gate implementation --evidence "src/approvalPolicy.js updated"
pik-workflow-continue --target "$PWD" --gate verification --evidence "npm test passed"

pik-evidence-record --target "$PWD" \
  "代理承認上限修正を検証済み" \
  --command "npm test && npm run test:task" \
  --result "passed" \
  --writeback .planning/issues/CR-017_proxy_approval_limit.md

pik-completion-check --target "$PWD"
```

## 主要命令

完整命令说明见 [docs/commands.html](docs/commands.html)。

| 分类 | 命令 |
| --- | --- |
| 初始化 | `pik-init`, `pik-verify`, `pik-map` |
| Codebase | `pik-codebase`, `pik-codebase-scan`, `pik-codebase-status` |
| 文档/RAG | `pik-docs-scan`, `pik-docs-status`, `pik-docs-normalize`, `pik-docs-extract`, `pik-docs-diff`, `pik-docs-citations`, `pik-docs-sync`, `pik-citation-audit`, `pik-rag-init-local`, `pik-rag-golden-add`, `pik-rag-golden-run`, `pik-rag-eval`, `pik-docs-index`, `pik-docs-query`, `pik-answer-audit` |
| Graphify | `pik-graph-build`, `pik-graph-status`, `pik-graph-query`, `pik-graph-diff`, `pik-graph-impact`, `pik-graph-risk`, `pik-graph-freshness` |
| Refresh / Mode | `pik-preflight`, `pik-refresh-plan`, `pik-refresh-run`, `pik-mode-status`, `pik-mode-set` |
| Privacy / License | `pik-privacy-audit`, `pik-offline-lock`, `pik-outbound-audit`, `pik-license-audit` |
| Evidence / Trace / Policy | `pik-evidence-record`, `pik-evidence-status`, `pik-trace-build`, `pik-trace-query`, `pik-trace-audit`, `pik-policy-list`, `pik-policy-check`, `pik-policy-explain`, `pik-policy-lock`, `pik-policy-verify`, `pik-policy-diff`, `pik-help-skills` |
| Runtime | `pik-runtime-install`, `pik-runtime-status` |
| Workflow guard | `pik-workflow-run`, `pik-workflow-status`, `pik-workflow-continue`, `pik-workflow-audit`, `pik-gate-check`, `pik-completion-check` |
| Public workflow | `pik-new-milestone`, `pik-spec-phase`, `pik-discuss-phase`, `pik-ui-phase`, `pik-debug`, `pik-plan-phase`, `pik-execute-phase`, `pik-code-review`, `pik-verify-work`, `pik-complete-milestone` |

## Runtime 支持

AI-PIKit 当前支持把 workflow 命令安装到：

| Runtime | 安装命令 | 调用方式 |
| --- | --- | --- |
| Codex | `pik-runtime-install --runtime codex --dest ~/.codex/skills` | `$pik-debug` |
| Claude Code | `pik-runtime-install --runtime claude-code --dest ~/.claude/skills` | `/pik-debug` |
| GitHub Copilot | `pik-runtime-install --runtime github-copilot --dest .github/prompts` | `/pik-debug` |

## 本地数据边界

AI-PIKit CLI 本身是本地文件工具，不主动上传数据。

需要注意：

- Codex、Claude Code、GitHub Copilot 是外部 runtime，你在这些工具中暴露的上下文按各自产品策略处理。
- 默认 `pik-docs-index --run`、`pik-docs-query --rag` 会先执行 local-only privacy audit；如果配置里出现外部 RAG endpoint、外部 model provider 或 API key 形态内容，会被阻断。
- `pik-graph-build --run` 会执行 `.planning/config.json` 中配置的 Graphify command；local-only/offline 模式下会先执行 privacy audit，危险外部命令会被阻断。
- `.planning/`、`graphify-out/`、`graphrag-workspace/` 默认会加入 git local exclude，但这不是加密或数据防泄漏机制。

保密项目应保持 `.planning/config.json` 中的 `index_command`、`query_command`、`update_command` 指向本地服务。不要把 `model_provider`、`api_base` 或 API key 配置改成外部服务，除非项目已经完成脱敏和外部传输审批。

## 验证

```bash
npm run check
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
npm run verify:quality
npm run verify:integration
```

两轮全量测试使用：

```bash
node scripts/run-full-test-plan.mjs --run-id round-1
node scripts/run-full-test-plan.mjs --run-id round-2
```

测试计划见 [docs/full-test-plan.md](docs/full-test-plan.md)。正式测试轮如果失败，先记录到对应报告，不在同一轮里修复。

最近一次验证：

```text
PASS 132
FAIL 0
WARN 1
```

`WARN 1` 是默认未启用外部 LLM live GraphRAG fixture。它不影响默认本地 GraphRAG、fixture RAG、Graphify、runtime pack 和 workflow guard 的通过结论。

`npm run verify:rag` 会专项测试 `pik docs ...` 和 `pik-docs-*` 的 RAG 命令矩阵。`npm run verify:rag-local` 会真实运行本地 GraphRAG：Ollama + LanceDB + no external API key，并确认 query 命中 fixture 规格。最近一次 live GraphRAG fixture 验证结果为 `PASS 136 / FAIL 0 / WARN 0`，使用脱敏 fixture 文档，不使用真实项目文档。

`npm run verify:docs-sync` 会测试 `pik-docs-sync` 默认不触发 GraphRAG index、文档新增/修改/删除输出 `STALE_NEEDS_REFRESH`、`--index` 才执行 configured RAG index。`npm run verify:answer-audit` 会测试默认无参数审计最近 query、显式 `--from`、调试 `--answer`、missing citation 在不同 profile 下的状态和 workflow facade 只提示不自动运行。`npm run verify:knowledge-reliability` 会测试轻量知识可靠性主路径：docs sync -> docs query -> answer audit。`npm run verify:mvp3` 会专项测试 RAG golden、citation audit、trace matrix、policy check 和 help skills。`npm run verify:mvp35` 会专项测试 refresh/preflight/mode 控制、相关/无关 commit 判断、显式刷新账本和文档同步要求。`npm run verify:workflow-facade` 会验证 public workflow 的无感编排层和 no heavy refresh 约束。`npm run verify:policy-hardening` 会验证 policy lock/verify/diff、四态状态语义、profile 阻断规则和 policy 命令不触发重刷新。`npm run verify:full-command-surface` 会逐个执行 `package.json` 中所有 `pik-*` / `pik` bin 命令，并写入 [verification/reports/full-command-surface-check.md](verification/reports/full-command-surface-check.md)。当前全命令面为 70 / 70。

需要外部 LLM live GraphRAG fixture 验证时：

```bash
GRAPHRAG_API_KEY=<your key> npm run verify:integration -- --live-graphrag
```

## 项目结构

```text
bin/pik.mjs
core/
templates/
runtime/
adapters/
schemas/
docs/
examples/
verification/
```

AI-PIKit 接入目标项目后，会在目标项目根目录增加：

```text
AGENTS.md
project.manifest.yml
.planning/
```

不会搬动原项目源码，也不会把目标项目复制进 AI-PIKit 仓库。
