# Zhulong Project Intelligence Kit Quality Plan

Status: implemented quality baseline with active enhancement backlog
Date: 2026-06-25
Full name: **Zhulong Project Intelligence Kit**
Documentation abbreviation: **Zhulong**
Skill and command namespace: **`zl-*`**

## 1. 质量目标

Zhulong 的质量目标不是“命令能跑起来”这么低，而是证明它真的能让 AI 在项目状态、代码影响面、按需文档依据和验证闭环里工作。

目标能力可以拆成 8 条：

1. 用户在 Codex、Claude Code、GitHub Copilot 或 shell 中调用 `zl-*`，不会被引导回 `gsd-*`。
2. 新项目和既存项目都能接入，且不会搬动原项目源码。
3. 文档密集型项目可以扫描、归一化、查询文档；配置 RAG/GraphRAG 时可以显式执行并留下结果。
4. Graphify 可以作为代码地图后端被 Zhulong 调用、同步、查询、diff，并进入 workflow gate。
5. Workflow guard 能真实阻断未完成工作，不是只在 prompt 里提醒。
6. 每次“完成”都有 evidence、writeback、测试/验证记录和可复跑报告。
7. 前端任务必须先产生可追踪的设计模式与权限合同；Taste 不得覆盖成熟项目设计或误用于 Dashboard。
8. Workflow 默认只执行当前 Skill；alias 不推断用户来源，当前工作授权与结果验收分离；多 milestone 自动执行必须来自用户原始消息生成的逐 milestone objective/digest 合同，完成资格检查不能自行改变状态。

质量判断原则：

- 已验证范围内必须 100% 有证据；没有跑过的能力只能标为未验证，不能写成已支持。
- 每个关键能力都必须落到本地 artifact，例如 `.planning/knowledge/`、`.planning/graphs/`、`.planning/workflows/`、`.planning/evidence/`。
- 任何 runtime 适配都必须最终落到同一套本地 `zl-*` 命令，不允许三套逻辑分叉。
- GSD 只作为参考设计；Zhulong 自己的 workflow contract、guard state 和 evidence loop 才是当前质量边界。

## 2. 命名质量线

对外命名必须统一：

| 类型 | 标准 |
| --- | --- |
| 产品全名 | Zhulong Project Intelligence Kit |
| 文档缩写 | Zhulong |
| 命令/skills | `zl-*` |
| 技术短前缀 | `ZL` 只用于命令、环境变量和内部标识 |
| 用户入口 | 只使用 `zhulong`、`zl`、`zl-*` |

内部技术标记：

| 标记 | 用途 |
| --- | --- |
| `ZL_CLI` | runtime pack CLI 模板变量 |
| `ZL_ARGS` | skill 参数占位，属于内部模板变量 |
| `ZL_KIT_ROOT` | runtime 安装上下文变量 |

当前已固化：

- `npm run verify:naming` 扫描 README、docs、runtime、core templates、scripts 和 generated report。
- 对外文档必须使用完整名称 `Zhulong Project Intelligence Kit`。
- 对外文档中出现 `ZL` 时必须是 `zl-*` 命令或内部技术标识。

## 3. 当前必跑验证

每次改 Zhulong 代码、runtime pack、workflow 或核心文档后，至少跑：

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

当前默认初始化已经改为 `reference + rag none + local_only`：这是非文档密集型项目的完整路线，不安装 GraphRAG，也不会误触发 GraphRAG index，同时保留 workflow、codebase、graph、policy、evidence 和 completion gate。真实终端的 `zl-init --target "$PWD"` 会进入 init wizard；CI/非 TTY 验证使用显式参数，不等待输入。文档密集或规格严格项目在 `zl-init` 时选择 `--doc-policy strict --rag local --setup-rag skip`，再显式准备本地 GraphRAG / Ollama / 模型。外部 LLM live GraphRAG 只作为显式 opt-in smoke，用脱敏 fixture 验证外部接入能力。

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
npm run verify:security-governance
npm run verify:license
npm run verify:mvp3
npm run verify:mvp35
npm run verify:workflow-facade
npm run verify:policy-hardening
npm run verify:init-policy
npm run verify:cockpit-build
npm run verify:full-command-surface
npm run verify:schema
npm run verify:visual
npm run verify:design
npm run verify:pages
npm run verify:public-release
npm run verify:naming
npm run verify:runtime
npm run verify:dev-audit-harness
npm run verify:quality
npm run verify:quality:local-rag
npm run verify:all
```

其中 `verify:quality` 是不依赖 Ollama、GraphRAG CLI 或外部网络的可重现 CI gate；`verify:quality:local-rag` 在其后追加真实本地 RAG 集成验证。`verify:docs-update` 是文档更新 fixture：先扫描初始文档，再新增一份議事録，重跑 scan/normalize/query，并证明新内容被本地知识层命中。`verify:rag` 会专项测试 `zl docs ...` 和 `zl-docs-*` 的 RAG 命令矩阵。`verify:rag-local` 会真实运行 `zl-rag-init-local`、`zl-privacy-audit`、本地 GraphRAG index/query，并证明不需要外部 key；默认 index 超时 300 秒、query 超时 90 秒，慢模型或 GraphRAG query 卡住会报告失败而不是无限等待。`verify:docs-extract` 覆盖 md/txt/csv/pdf/docx/xlsx 抽取、citation 和 docs diff。`verify:docs-sync` 覆盖 `zl-docs-sync` 默认轻量同步、文档新增/修改/删除 stale 标记和 `--index` 显式重索引。`verify:answer-audit` 覆盖无参数 answer audit、`--from`、`--answer`、坏 citation、missing citation profile 状态和 workflow facade 只提示不自动运行。`verify:knowledge-reliability` 覆盖 docs sync -> docs query -> answer audit 主路径。`verify:graph-hardening` 覆盖 Graph impact/risk/freshness 和 stale graph 负例。`verify:privacy-strict` 覆盖 offline lock、outbound audit 和危险外部命令阻断。`verify:security-governance` 覆盖默认 local-only、外部 RAG opt-in、风险报告和 Codex / Claude Code / GitHub Copilot runtime 例外边界。`verify:license` 输出 license 元数据和商用风险摘要。`verify:mvp35` 覆盖 refresh/preflight/mode 控制、相关/无关 commit 判断、显式刷新账本和文档同步要求。`verify:workflow-facade` 覆盖 public workflow 的无感编排层和 no heavy refresh 约束。`verify:policy-hardening` 覆盖 policy lock/verify/diff、四态状态语义、profile 阻断和 no heavy refresh 约束。`verify:init-policy` 覆盖 `zl-init` 文档策略/RAG 后端选择、strict 强制 RAG、外部 RAG opt-in、rag none 阻断 GraphRAG 执行。`verify:cockpit-build` 覆盖项目驾驶舱、Graphify HTML 安全复制/阻断、fallback 图、RAG 证据面板和 no hidden heavy refresh。`verify:schema` 会创建临时项目并真实生成 manifest、workflow state、handoff、evidence record/writeback，再检查这些核心产物的必要结构。

`verify:mvp3` 覆盖 Evidence Quality & Policy Mode：RAG golden、citation audit、trace matrix、policy check、help skills。`verify:full-command-surface` 会逐个执行 `package.json` 中所有 `zl-*` 和 `zl` bin 命令，确认命令入口不是只写在文档里。

## 3.1 Developer Audit / Benchmark

Developer Audit 是维护者专用的产品级审计产物，不属于普通用户命令面，不新增 `zl-*`。它补足普通 verifier 没覆盖的三件事：逐项打分、同题对标、时间/token/隔离统计。

运行入口：

```bash
npm run verify:dev-audit-harness
npm run dev:audit:quick
npm run dev:audit:full
npm run dev:audit:ragas-style
npm run dev:audit:promptfoo-redteam
npm run dev:audit:benchmark
```

产物：

```text
.zl-audit/latest/AUDIT_REPORT.md
.zl-audit/latest/COMMAND_SCORES.md
.zl-audit/latest/SKILL_SCORES.md
.zl-audit/latest/SKILL_BEHAVIOR_SCORES.md
.zl-audit/latest/FEATURE_SCORES.md
.zl-audit/latest/SECURITY_GOVERNANCE_CHECK.md
.zl-audit/latest/RAGAS_STYLE_KNOWLEDGE_SCORES.md
.zl-audit/latest/PROMPTFOO_STYLE_REDTEAM_SCORES.md
.zl-audit/latest/QUALITY_CONTROL_SCORECARD.md
.zl-audit/latest/BENCHMARK_COMPARISON.md
.zl-audit/latest/TIME_BREAKDOWN.md
.zl-audit/latest/TOKEN_USAGE.md
verification/reports/developer-audit-summary.md
verification/reports/quality-control-summary.md
```

## 3.2 Long-Term Quality Control Scorecard

Zhulong 长期质量控制采用 100 分制，并把结构分、行为分、安全治理和对标分分开读：

| 维度 | 权重 | 主要证据 |
| --- | ---: | --- |
| Static Skill Quality | 10 | `SKILL_SCORES`, `verify:skills-usability` |
| Trigger Accuracy | 15 | `SKILL_BEHAVIOR_SCORES` 正负样本 |
| Command / Tool Trajectory | 20 | `COMMAND_SCORES`, `zl-*` 调用、禁止命令、heavy refresh 记录 |
| Workflow / Evidence Closure | 20 | `FEATURE_SCORES`, workflow gate、测试、evidence、writeback |
| Knowledge / RAG Quality | 15 | citation、answer audit、RAG local、Ragas-style faithfulness/context recall |
| Safety / Governance | 10 | `SECURITY_GOVERNANCE_CHECK`, privacy strict、offline lock、外部 RAG opt-in |
| Efficiency / Stability | 10 | time breakdown、token 状态、memory isolation、flake rate |

发布门槛：

```text
A >= 90: 可发布
B 80-89: 可发布，但必须记录风险
C 70-79: 只能内部试用
F < 70: 阻断
任何 privacy / data leakage / evidence critical FAIL: 直接阻断
```

新增维护者入口：

```bash
npm run dev:audit:skill-behavior
npm run dev:audit:ragas-style
npm run dev:audit:promptfoo-redteam
npm run verify:security-governance
npm run verify:quality:daily
npm run verify:quality:release
```

`SKILL_SCORES` 是结构质量分；`SKILL_BEHAVIOR_SCORES` 是 deterministic 行为契约分，覆盖每个 runtime skill/prompt 的 explicit invocation、implicit invocation、near miss、negative、adversarial 五类用例。外部机制采用借鉴口径：OpenAI Agent Skill Evals 用于 skill eval 结构，SkillsBench 用于 with-skill / without-skill delta，Ragas-style 本地代理指标用于 RAG 可信度，Promptfoo-style 本地红队矩阵和 OWASP/NIST 用于安全治理。当前不接外部 SaaS，不调用外部模型。

方法论链接已在 2026-06-29 复核。Zhulong 采用“本地确定性验证为主，外部框架补盲区”的路线：

| 方法论 / 来源 | 覆盖维度 | 采用方式 |
| --- | --- | --- |
| [OpenAI Agent Skills docs](https://developers.openai.com/codex/skills) | Static Skill Quality, Trigger Accuracy | 作为 runtime skill/prompt 包结构、`SKILL.md`、触发说明和插件分发边界的依据。 |
| [OpenAI Testing Agent Skills Systematically with Evals](https://developers.openai.com/blog/eval-skills) | Trigger Accuracy, Command / Tool Trajectory | 直接采用 `prompt -> trace/artifacts -> checks -> score` 结构，落到 `SKILL_BEHAVIOR_SCORES`。 |
| [SkillsBench paper](https://arxiv.org/abs/2602.12670) / [SkillsBench 1.1](https://www.skillsbench.ai/blogs/skillsbench-1-1) | Trigger Accuracy, Benchmark comparison | 借鉴 with_skill / without_skill paired delta，落到 `BENCHMARK_COMPARISON.skill_delta`。 |
| [Anthropic Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) | Workflow / Evidence Closure, Efficiency / Stability | 借鉴 trajectory + outcome、deterministic grader、regression eval 的分层思路。 |
| [Ragas agent metrics](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/agents/) | Knowledge / RAG Quality | 本地代理 ToolCallAccuracy、ToolCallF1、AgentGoalAccuracy 等指标，落到 `RAGAS_STYLE_KNOWLEDGE_SCORES`。 |
| [Promptfoo Agent Skills](https://www.promptfoo.dev/docs/integrations/agent-skill/) | Safety / Governance | 本地代理 eval/redteam matrix，落到 `PROMPTFOO_STYLE_REDTEAM_SCORES`；不调用 Promptfoo SaaS。 |
| [OWASP Top 10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/) | Safety / Governance | 治理映射，用于 prompt injection、tool misuse、agent boundary、越权和数据泄露检查。 |
| [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework) / [NIST AI 600-1 GenAI Profile](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence) | Safety / Governance, release gate | 治理映射，用于 `SECURITY_GOVERNANCE_CHECK` 和 release gate 的 risk management 口径。 |

采用边界：

- 直接采用项会落到本地 deterministic 脚本和 `.zl-audit/latest/` 分数。
- Ragas-style / Promptfoo-style 是本地代理指标，只读取 `verification/reports/` 和 `.zl-audit/`，不接外部 SaaS，不调用外部模型。
- OWASP / NIST 是治理 checklist，不是外部认证。
- 除显式 `--allow-external-rag` 外，内部项目资料、源码、GraphRAG text units、embedding/query context 和 Graphify 上下文不得外发。

最近一次完整审计：

```text
Run ID: 2026-06-28T15-45-31-164Z-23400-ae1e41
Status: PASS
Benchmark comparison: 87 / PASS
Developer audit score: 96 / A
Quality control score: 99 / A / RELEASE_OK
Zhulong: 90 / A
GSD: 88 / B
Superpowers: 82 / B
```

评分口径：

- `Benchmark comparison: 87` 是 12 行 benchmark 的保守平均，不是 Zhulong 单体分。
- Zhulong 产品分看 `Zhulong: 90 / A`。
- `graph-lite` 是低成本模式，故意不强制 GraphRAG/RAG，所以不会按 full-local 满分计算。
- `full-local` 在无文档场景输出 `EXPECTED_BLOCK`，这是正确安全边界，不能为了抬高分数假装有文档依据。
- GSD / Superpowers 是 `skill-pack-backed-replay`，不是本仓库内的可执行 CLI，也不是 live model benchmark，所以设置可信度上限。
- 后续如果要给 leader 展示，建议同时展示 `Zhulong Product Score`、`External Framework Reference Score` 和 `Live Agent Benchmark Status`，避免把保守横向均值误读为产品单体能力。

对标结论：

- Zhulong `graph-lite` 在完整文档、无文档、文档不全三种 fixture 中都能闭环；无文档场景标记 `WAIVED_WITH_RISK`。
- Zhulong full-local 在完整文档和文档不全时 PASS，在无文档场景 `EXPECTED_BLOCK`，这是正确安全边界：没有文档依据时不能假装 GraphRAG/RAG 证据完整。
- GSD / Superpowers 本轮使用本机真实 skill/plugin 文件做 `skill-pack-backed-replay`，记录 instruction pack hash、fixture、代码改修、测试和证据文件；因为不是 repository-local CLI / live model benchmark，分数设置可信度上限。
- 默认 deterministic benchmark 不调用外部 AI，token 记为 `TOKEN_USAGE_UNAVAILABLE`；本轮已额外尝试 `ZHULONG_AUDIT_REAL_AI=1 ZHULONG_AUDIT_CODEX_IGNORE_USER_CONFIG=1` 真实 Codex 子进程，并使用 `--ephemeral --ignore-user-config --ignore-rules --json`。三个 real-codex subprocess 均因当前账号不支持默认 `gpt-5.3-codex` 模型而在启动阶段失败，fixture 代码未被修改，因此没有 usage events，token 仍为 `TOKEN_USAGE_UNAVAILABLE`。

## 4. 测试矩阵

| 质量域 | 必测内容 | 当前证据 | 下一步增强 |
| --- | --- | --- | --- |
| CLI 语法 | `bin/zl.mjs` 可被 Node 解析 | `npm run check` | 增加所有 alias 的 help smoke test |
| 命令路由 | `zl-*` bin 均路由到本地 CLI | `package.json` bin + `docs-check.md` + integration | 增加所有 alias 的独立 smoke test |
| Init 策略 | `zl-init` 默认 reference + rag none；strict 不能 rag none；external 必须 opt-in | `init-policy-check.md` | 增加交互式 wizard 测试 |
| 新项目接入 | `zl-init --mode new --doc-policy reference --rag none` 生成工作台 | integration report + init-policy report | 增加空仓库、前端、后端 fixture |
| 既存项目接入 | `zl-init --mode existing --doc-policy reference --rag none` 后必须 `zl-codebase-scan` | integration report + init-policy report | 增加 monorepo、无测试项目、旧框架项目 |
| 文档扫描/抽取 | `zl-docs-scan` 生成来源清单，`zl-docs-extract` 抽取 pdf/docx/xlsx 并生成 citation 索引 | `docs-extract-citation-check.md` | 增加页码/Sheet 名和更强 chunk citation |
| 文档归一化 | `zl-docs-normalize` 写 normalized 文档 | `.planning/knowledge/normalized/` | 增加编码、日文文件名、重复文件测试 |
| 文档轻量同步 | `zl-docs-sync` 默认 diff/extract/citation audit，不触发 GraphRAG index；`--index` 才重索引 | `docs-sync-check.md` | 增加更细的 doc owner、文档类型和变更影响面分类 |
| 本地文档查询 | `zl-docs-query` 可命中 QA/需求或决策依据，并写 `DOCS_QUERY_RESULT.md/json` | `knowledge-reliability-check.md` | 增加 terminology/glossary 查询 |
| 回答依据审计 | `zl-answer-audit` 默认审最近 query；坏 citation FAIL；缺 citation 按 profile 输出 `WAIVED_WITH_RISK` 或 `FAIL` | `answer-audit-check.md` + `knowledge-reliability-check.md` | 增加 answer faithfulness / context recall / contradiction 检查 |
| RAG/GraphRAG | 默认不启用 RAG；`strict + rag local` 才配置本地 GraphRAG；`rag none` 必须阻断 `--run` / `--rag` | `init-policy-check.md` + `rag-local-check.md` + `rag-command-check.md` + live GraphRAG smoke | 增加完整 graph-local profile 和 enterprise RAG provider matrix |
| RAG 可信度 | golden case、citation audit、RAG eval | `mvp3-evidence-policy-check.md` | 增加更细的 answer faithfulness / context recall 指标 |
| Graphify build | `zl-graph-build --run` 同步 graph/report，local-only 下先过 privacy audit | integration report + `privacy-strict-check.md` | 增加真实 Graphify 大项目 smoke |
| Graph impact/risk/freshness | `zl-graph-impact`、`zl-graph-risk`、`zl-graph-freshness --strict` | `graph-hardening-check.md` | 增加调用链/path query 验证 |
| Graph diff | baseline 与当前 graph 可 diff | integration report | 增加 stale graph 负例 |
| Workflow guard | incomplete workflow 必须 FAIL | integration negative case | 增加每个 public workflow 单独负例 |
| Completion gate | evidence/writeback 缺失必须阻断 | integration report | 增加人工 gate 缺失组合测试 |
| Evidence / Schema | record、index、writeback、workflow state 可追踪 | `.planning/evidence/` + `schema-check.md` | 扩展为严格 JSON Schema 和更多 record 类型 |
| Trace matrix | 文档、代码、测试、evidence 可被聚合和查询 | `mvp3-evidence-policy-check.md` + `full-command-surface-check.md` | 增加需求 ID、测试 ID、代码符号级 trace |
| Policy mode | local-only、citation、golden、trace、graph freshness、license 统一四态结果 | `mvp3-evidence-policy-check.md` | 继续扩展 policy-as-code 规则文件 |
| Policy contract | `zl-policy-lock` 生成 snapshot/hash，`zl-policy-verify` 确认未漂移，`zl-policy-diff` 输出字段级差异 | `policy-hardening-check.md` | 增加更多 config drift 组合和项目级 waiver 审批 |
| Refresh budget | 普通 workflow 只提醒，显式命令才刷新；无关 commit 可跳过，相关 commit 推荐差分刷新 | `mvp35-refresh-control-check.md` | 增加更细的 path owner 和 monorepo sub-project 策略 |
| Workflow facade | public workflow 自动关联轻量 preflight/policy/gate 摘要，但不触发重刷新 | `workflow-facade-check.md` | 为每个 public workflow 增加专属下一步建议 |
| Help skills | 根据用户场景推荐 `zl-*` 命令组 | `mvp3-evidence-policy-check.md` + `HELP_SKILLS.md` | 增加更多场景和项目状态感知 |
| Runtime pack | Codex/Claude/Copilot 安装包生成 | `runtime-pack-status.md` + integration report | 增加 runtime 真实调用 smoke |
| 文档页面 | HTML 链接、命令覆盖、视觉不溢出 | `docs-check.md` + `visual-check.md` | 增加更多 viewport 和交互状态截图 |
| 保密边界 | 默认本地文件，不主动上传 | 文档说明 | 增加 config 审计脚本和 offline 模式 |

## 5. 黄金 E2E 场景

Zhulong 的核心质量要靠场景证明。建议把下面 6 个场景做成 fixture，并且每个场景都写入 `verification/reports/`。

### 5.1 Japanese CR-017 改修场景

目的：用日文资料 fixture 证明多语言文档密集型改修闭环可用；该 fixture 是语言覆盖，不是产品地域边界。

步骤：

```bash
npm run verify:integration
```

必须证明：

- QA/仕様文档可被 `zl-docs-query` 命中。
- Graphify fixture 能暴露 `PROXY_APPROVAL_LIMIT` 或等价影响面。
- `zl-debug`、`zl-plan-phase`、`zl-execute-phase`、`zl-verify-work` 都能生成 handoff。
- incomplete workflow 会被 `zl-completion-check` 阻断。
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

- `zl-init --mode new`
- `zl-codebase-scan`
- `zl-docs-scan`
- `zl-new-milestone`
- `zl-plan-phase`
- `zl-execute-phase`
- `zl-verify-work`
- `zl-complete-milestone`

通过标准：

- `.planning/INIT_PROFILE.md` 记录 `Mode: new`。
- workflow state 存在。
- evidence index 存在。
- completion check 对未补齐 gate、缺当前工作授权、缺结果验收/Goal、重大开放决策、历史/任意字符串 evidence 的情况会失败。
- completion check 前后 workflow status 不变，只有显式 `workflow complete` 才写入完成。
- `verify:workflow-governance` 覆盖默认 interactive、直接用户意图、多 MVP 继承、越界拒绝和撤销。

### 5.3 既存项目继续开发场景

目的：证明 brownfield 不会只 init 而没有 codebase baseline。

必测：

```bash
zl-init --target "$PWD" --template brownfield-monorepo --name legacy --mode existing
zl-codebase-scan --target "$PWD"
zl-codebase-status --target "$PWD"
zl-docs-scan --target "$PWD"
zl-graph-build --target "$PWD" --run
zl-debug --target "$PWD" "既存障害"
```

通过标准：

- `.planning/codebase/CODEBASE_STATUS.md` 存在。
- source file count 大于 0。
- graph gate 不接受 stale 或缺失 graph。
- 原 `src/`、`tests/`、`docs/` 不被移动。

### 5.4 文档更新场景

目的：解决“文档改了之后怎么办”。

必测：

1. 第一次 `zl-docs-sync`，确认写入 `DOCS_SYNC.md/json`。
2. 查询旧文档关键字，确认 `DOCS_QUERY_RESULT.md/json` 写入。
3. 新增或修改 QA/議事録。
4. 重跑 `zl-docs-sync`，确认输出 `STALE_NEEDS_REFRESH` 且 `heavy refresh executed: no`。
5. 如果配置 RAG 且需要重建索引，再显式跑 `zl-docs-sync --index`。
6. 查询新关键字，确认命中新文档。
7. 跑 `zl-answer-audit --target "$PWD"`，确认回答依据状态。

通过标准：

- `RAG_SOURCES.md` 更新来源数量或 mtime 线索。
- `DOCS_SYNC.md` 记录新增、修改或删除。
- `zl-docs-query` 能命中新规则，并写 `DOCS_QUERY_RESULT.md/json`。
- `ANSWER_AUDIT.md` 对最近 query 给出 `PASS`、`WAIVED_WITH_RISK` 或 `FAIL`。
- RAG 模式下 `RAG_INDEX_RESULT.md` 和 `RAG_QUERY_RESULT.md` 更新。

### 5.5 Runtime command pack 场景

目的：证明 Codex、Claude Code、Copilot 的差异只是入口格式不同。

必测：

```bash
zl-runtime-install --runtime codex --dest <tmp>/codex-skills
zl-runtime-status --runtime codex --dest <tmp>/codex-skills
zl-runtime-install --runtime claude-code --dest <tmp>/claude-skills
zl-runtime-status --runtime claude-code --dest <tmp>/claude-skills
zl-runtime-install --runtime github-copilot --dest <tmp>/prompts
zl-runtime-status --runtime github-copilot --dest <tmp>/prompts
```

通过标准：

- Codex 和 Claude Code 目录中有 `SKILL.md`。
- Copilot 目录中有 `*.prompt.md`。
- 模板中的 `{{ZL_CLI}}` 已被渲染为本地 CLI。
- 用户可见命令是 `$zl-*` 或 `/zl-*`，不提示用户运行 `gsd-*`。

### 5.6 保密项目场景

目的：证明默认行为不会绕过用户配置向外发送项目资料。

必测：

- 不带 `--run` 时，`zl-docs-index` 只生成 handoff，不执行外部命令。
- 不带 `--rag` 时，`zl-docs-query` 只做本地查询。
- 不带 `--run` 时，`zl-graph-build` 只生成 Graphify handoff。
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
- README、commands、technical-guide、runtime-command-packs 全部使用 Zhulong / `zl-*` 命名。
- `docs/commands.html` 覆盖 package bin 中所有 `zl-*`。
- 三个 HTML 页面桌面渲染无横向 overflow。
- `verification/reports/latest.md` 由脚本生成并作为临时报告；`verification/baselines/latest.md` 是经过确认的长期摘要。

### MVP2 gate

MVP2 应增加：

- `verify:docs`：检查文档链接、命令覆盖、命名一致性。
- `verify:visual`：Playwright 渲染 product、commands、technical-guide、quality-dashboard 和 cockpit，覆盖桌面、移动端与桌面暗色主题，截图只写入 `.zl-tmp/visual/`。
- `verify:design`：检查真实品牌素材、单一 H1、共享视觉系统、可访问性、动效边界和反模板化约束。
- `verify:pages`：组装 GitHub Pages 允许列表并阻止源码、runtime、依赖目录和符号链接进入静态站。
- `verify:public-release`：检查 Apache-2.0、npm 公开元数据、Pages 链接、社区治理文件和常见密钥模式。
- `verify:naming`：禁止旧品牌名和 `gsd-*` 用户入口混入对外文档。
- `verify:runtime`：临时目录安装三种 runtime pack，并检查 `{{ZL_CLI}}` 渲染。
- `verify:schema`：检查 manifest、issue/phase schema 文档、workflow state、context handoff、evidence record/writeback 的必要结构。
- docs update fixture：证明文档更新后 scan/normalize/query/index 的变化。

### MVP3 gate

Status: implemented for Evidence Quality & Policy Mode.

MVP3 当前完成：

- `zl-rag-golden-add`、`zl-rag-golden-run`、`zl-rag-eval`。
- `zl-citation-audit`。
- `zl-trace-build`、`zl-trace-query`、`zl-trace-audit`。
- `zl-policy-list`、`zl-policy-check`、`zl-policy-explain`。
- `zl-help-skills`。
- `npm run verify:mvp3`。
- `npm run verify:full-command-surface`。
- `docs/full-test-plan.md` 和两轮正式测试的 CI artifact 入口。

MVP3 完成标准：

- `verify:mvp3` 必须 PASS。
- `verify:full-command-surface` 必须覆盖 `package.json` 中所有 bin 命令。
- `zl-policy-check --strict` 在 fixture 上必须 PASS。
- `zl-help-skills` 必须能按问题推荐至少 3 组 `zl-*` 命令。
- 正式测试轮失败时，先写入当次 `verification/reports/full-test-round-*.md` 并上传 CI artifact，不得在同一轮里修复并覆盖事实。

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

目标：证明 Zhulong 的新命令不只是文档列表，而是能在临时项目中真实执行。

完成内容：

- `scripts/verify-mvp3-evidence-policy.mjs`
- `scripts/verify-full-command-surface.mjs`
- `scripts/run-full-test-plan.mjs`
- `verification/reports/mvp3-evidence-policy-check.md`
- `verification/reports/full-command-surface-check.md`

完成定义：

- `npm run verify:mvp3` PASS。
- `npm run verify:full-command-surface` PASS，并覆盖 `package.json` 中全部 `zl-*` / `zl` bin 命令。
- 两轮正式测试使用 `node scripts/run-full-test-plan.mjs --run-id round-1` 和 `round-2` 生成报告。

### Loop 1.6: MVP3.5 执行预算和刷新控制

Status: implemented

目标：避免每个 workflow 都重建 GraphRAG / Graphify，同时保留上下文新鲜度提醒和 strict policy gate。

新增命令：

- `zl-preflight`
- `zl-refresh-plan`
- `zl-refresh-run`
- `zl-mode-status`
- `zl-mode-set`

新增产物：

- `.planning/refresh/REFRESH_STATE.json`
- `.planning/refresh/PREFLIGHT.md`
- `.planning/refresh/REFRESH_PLAN.md`
- `.planning/refresh/REFRESH_RUN.md`
- `.planning/refresh/MODE.md`

完成定义：

- `zl-preflight` 必须显示 GraphRAG / Graphify 距离当前 HEAD 落后几个 commit，并输出 `heavy refresh executed: no`。
- 无关 commit 必须显示 `behind-unrelated`，不能要求刷新。
- 文档源相关 commit 必须推荐 `zl-refresh-run --rag`。
- 源码或测试相关 commit 必须推荐 `zl-refresh-run --graph`。
- `zl-refresh-run --rag|--graph|--all` 必须在成功后更新 `REFRESH_STATE.json`。
- `zl-mode-set` 必须支持 `docs-reference`、`docs-strict`，并兼容 `default-local-rag`、`graph-lite`、`full-strict`。
- 新增功能、命令或 skills 必须同步更新 `README.md`、`docs/changelog.md`、`docs/commands.html`、`docs/quality-plan.md`。
- `npm run verify:mvp35` 必须 PASS。

### Loop 1.7: MVP6 workflow facade 和 policy guard contract

Status: implemented

目标：把“什么时候允许跳过、什么时候必须阻断、什么时候允许带风险继续”固化成本地 policy contract，同时让日常 public workflow 自动关联轻量检查，降低命令心智负担。

新增命令：

- `zl-policy-lock`
- `zl-policy-verify`
- `zl-policy-diff`

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

- `zl-policy-lock` 必须要求 offline lock，并生成稳定 snapshot 和 SHA-256 hash。
- `zl-policy-verify` 必须对比 lock，并执行轻量 privacy、preflight、citation、graph freshness checks。
- `zl-policy-diff` 必须输出字段级差异，例如 `privacy.allow_external_rag: false -> true`。
- `PASS`、`FAIL`、`WAIVED_WITH_RISK`、`STALE_NEEDS_REFRESH` 必须在 workflow/policy/completion 里含义一致。
- `reference` / `docs-reference` 无文档允许继续，但 completion/evidence 必须写 `WAIVED_WITH_RISK`。
- `default-local-rag` 保留为 legacy 兼容 profile，对 stale 只提醒，不自动刷新。
- `strict` / `docs-strict` 对 stale RAG、stale Graphify、missing citation、外部 provider/API key/URL 必须非 0。
- public workflow 必须写 `WORKFLOW_FACADE`，并输出 `heavy refresh executed: no`。
- policy 命令不得执行 `zl-docs-index --run`、`zl-graph-build --run`、`zl-refresh-run`。
- `npm run verify:workflow-facade` 和 `npm run verify:policy-hardening` 必须 PASS。
- 新增功能、命令和验证结果必须同步更新 `README.md`、`docs/changelog.md`、`docs/commands.html`、`docs/technical-guide.html`、`docs/quality-plan.md`、`docs/quality-dashboard.html`。

### Loop 1.8: MVP4.0 Knowledge Reliability Lite

Status: implemented

目标：把“文档更新后怎么同步”和“AI 回答有没有依据”做成默认简单用法，同时保持轻量，不引入 `zl-rag-route`，不让 workflow 自动触发重任务。

新增命令：

- `zl-docs-sync`
- `zl-answer-audit`

新增产物：

- `.planning/knowledge/DOCS_SYNC.json`
- `.planning/knowledge/DOCS_SYNC.md`
- `.planning/knowledge/DOCS_QUERY_RESULT.json`
- `.planning/knowledge/DOCS_QUERY_RESULT.md`
- `.planning/quality/ANSWER_AUDIT.json`
- `.planning/quality/ANSWER_AUDIT.md`

完成定义：

- `zl-docs-sync --target <repo>` 默认必须先 diff 再 extract，并输出 `heavy refresh executed: no`。
- 文档新增、修改、删除必须让 `DOCS_SYNC` 输出 `STALE_NEEDS_REFRESH`，默认 exit 0。
- `zl-docs-sync --target <repo> --index` 才允许执行 configured GraphRAG index，并输出 `heavy refresh executed: yes`。
- `zl-docs-query` 必须写 `DOCS_QUERY_RESULT.md/json`，并提示 `zl-answer-audit --target "$PWD"`。
- `zl-answer-audit --target <repo>` 必须自动选择最近一次 `RAG_QUERY_RESULT.md`、`DOCS_QUERY_RESULT.md` 或 `CITATIONS.md`。
- 有效 citation 必须 `PASS`；不存在源文件或非法行号必须 `FAIL`。
- missing citation 在 `reference` / `docs-reference` 下必须 `WAIVED_WITH_RISK` 且 exit 0；在 `strict` / `docs-strict` 下必须 `FAIL` 且非 0。
- public workflow facade 只建议 `zl-answer-audit`，不得自动运行，也不得新增 completion 阻断。
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
- 增加 `zl-workflow-audit`，输出当前 workflow 为什么不能完成。
- 增加负例：缺 docs、缺 graph、缺 evidence、缺 writeback、manual gate 未标记。

完成定义：

- AI 声称完成时，只要 artifact 不完整，`zl-completion-check` 必须非 0。
- 报错要告诉用户下一条该跑的 `zl-*` 命令。

### Loop 4: 加强文档/RAG 能力

目标：覆盖真实多语言项目资料形态，日文资料只是其中一组回归样例。

要做：

- 增加 PDF、docx、xlsx、csv 的本地抽取策略。
- 记录文档 hash，判断文档是否更新。
- 增加 `zl-docs-diff`，展示文档来源变化。
- 增加 `zl-docs-glossary`，生成日中术语、代码别名、文档引用。
- RAG 结果必须附 source/citation；没有 citation 时只能标为 hypothesis。

完成定义：

- 文档更新后，Zhulong 能指出哪些来源变了。
- 查询答案能追到原文档路径和片段。

### Loop 5: 加强 Graphify 能力

目标：让代码地图真正提高改修/新规精度。

要做：

- 增加真实 Graphify adapter smoke。
- 增加 graph freshness 检查：源码比 graph 新时 gate warning/fail。
- 增加 `zl-graph-impact --files <changed files>`。
- 增加 `zl-graph-risk`，标出高耦合节点、入口、测试缺口。
- Graph diff 中区分新增节点、删除节点、边变化和高风险模块变化。

完成定义：

- 改代码前能查影响面。
- 改代码后能看影响面是否扩大。
- stale graph 不能被当作通过证据。

### Loop 6: 加强 runtime 实测

目标：不是“文件装进去了”，而是 runtime 真能按流程调用。

要做：

- Codex skill smoke：检查 `$zl-debug` skill 文件、frontmatter、`ZL_CLI` 渲染。
- Claude Code skill smoke：检查 `/zl-debug` skill 文件和调用说明。
- Copilot prompt smoke：检查 `.github/prompts/*.prompt.md`。
- 增加 runtime pack version stamp。
- 安装后生成 `RUNTIME_PACK_STATUS.md`。

完成定义：

- `zl-runtime-status` 不只看文件存在，还检查内容是否指向当前本地 CLI。
- 文档中 runtime 能力和实际安装内容一致。

### Loop 7: 可视化 QA 和报告

Status: implemented

目标：让质量状态一眼能看懂。

要做：

- validation 输出临时 `latest.json`。已实现。
- `verification/baselines/latest.json` 保存稳定、无时间戳的长期摘要。已实现。
- `docs/quality-dashboard.html` 展示稳定状态、双项目画像和证据分层。已实现。
- 当次 Markdown/JSON 报告通过 7 天 CI artifact 提供，视觉截图只保存在 `.zl-tmp/visual/`。已实现。

完成定义：

- dashboard 不是营销页面，而是 QA 操作台。
- 每个绿色状态都能追到稳定基线或对应 CI run。

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
| 支持 runtime | 安装目录文件、渲染后的 `ZL_CLI`、runtime status |
| 支持严格流程 | incomplete fail、complete pass、WORKFLOW_STATE.json |
| 支持 evidence loop | evidence record、INDEX、writeback section |

报告位置：

```text
verification/baselines/latest.md
verification/baselines/latest.json
verification/reports/latest.md
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
.zl-tmp/visual/*.png
```

`verification/baselines/` 进入 Git 和 Pages；`verification/reports/` 与 `.zl-tmp/visual/` 默认被 Git 忽略，前者由 CI 上传为 7 天 artifact，后者不上传。

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
npm run verify:design
npm run verify:pages
npm run verify:public-release
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
- 报错是否提示 `zl-*`，而不是 `gsd-*`。

## 10. MVP4.1 Quality Closure & Documentation Completeness Freeze

MVP4.1 是 cockpit 加入前的 70 命令历史基线，MVP4.2 加入 cockpit 后为 71 个。当前 Phase A-C 完成后，公开逻辑命令面为 74 个，runtime skill/prompt 为 33 个；长期状态以稳定验证基线为准，当次细节以 CI artifact 为准。

新增质量入口：

```bash
npm run verify:skills-usability
npm run verify:taste-adapter
npm run verify:workflow-closure
npm run verify:docs-completeness
npm run verify:quality-closure
```

报告路径：

```text
verification/reports/skills-usability-check.md/json
verification/reports/workflow-closure-check.md/json
verification/reports/docs-completeness-check.md/json
verification/reports/quality-closure-check.md/json
```

这些路径是本地和 CI 的临时输出，不进入 Git；发布级结论汇总到 `verification/baselines/`。

验证范围：

- `verify:skills-usability`：Codex / Claude Code / GitHub Copilot 三种 runtime 都安装到临时目录，10 个核心 workflow skill/prompt 全部存在，指向本地 `bin/zl.mjs`，不残留模板变量，不出现可执行意义的 `gsd-*` 指导，并包含 local-only、no hidden heavy refresh、evidence writeback 约束。
- `verify:workflow-closure`：覆盖新项目第一次闭环、既有项目文档更新、`reference` 无文档风险放行、`strict` stale / privacy 阻断；默认路径必须输出 `heavy refresh executed: no`，不得创建 `REFRESH_RUN.md`。
- `verify:docs-completeness`：历史基线从 70 扩到 71；当前检查 `docs/commands.html` 对 74 个 `zl-*` / `zl` 公开逻辑命令都有独立锚点。一览中的物理名和逻辑名都能跳转，每个详情块包含 usage、参数、示例、产物、场景等字段，README 关键命令能跳到对应详情。
- `verify:quality-closure`：聚合 `check`、`verify:quality`、`verify:full-command-surface`、`verify:integration`、`verify:runtime`、`verify:skills-usability`、`verify:workflow-closure`、`verify:cockpit-build`、`verify:init-policy`、`verify:docs-completeness`。

MVP4.1 的完成标准：

- `npm run verify:quality-closure` PASS。
- `npm run verify:full-command-surface` 在 MVP4.1 当时为 70 / 70；MVP4.2 当前为 71 / 71。
- Codex / Claude Code / GitHub Copilot 在 MVP4.1 当时共 30 个 skill/prompt 全部 PASS；MVP4.2 当前为 33 个。
- `docs/commands.html` 覆盖 100% 命令详情。
- README 能指导新项目、既有项目、日常开发、文档更新、质量验证五个主场景。
- 允许的 WARN 只能是外部 live GraphRAG fixture 未启用，并且必须解释原因。
- 不新增外部 LLM / API key 依赖。
- 不允许默认 workflow、policy、skills、docs completeness 检查偷偷触发 heavy refresh。

## 10.5. MVP4.2 Project Cockpit & Runtime Skill Usability

本阶段新增一个低频公开命令和一个 runtime skill：`zl-cockpit-build`。它的目标不是替代日常 workflow，而是把 Graphify 影响图、GraphRAG/RAG 证据链、workflow gate、quality closure、privacy/offline lock 和 evidence 状态做成本地静态驾驶舱，方便自查和 leader 演示。

新增质量入口：

```bash
npm run verify:cockpit-build
```

新增报告：

```text
verification/reports/cockpit-build-check.md/json
```

该报告是本地和 CI 的临时输出，不进入 Git。

验证范围：

- cockpit 页面模板必须独立存在于 `templates/cockpit/index.template.html`，稳定样例页必须由 `templates/cockpit/sample-data.json` 生成到 `templates/cockpit/sample.html`。
- `cockpit-data.json` 必须包含稳定 `cockpit-viewmodel.v1`，viewer 优先读取 `summary`、`impactGraph`、`evidenceChain`、`workflowRows`、`artifactGroups`、`issues`、`nextCommands`。
- `impactGraph` 必须支持 Graphify-style 的搜索、节点详情、legend 过滤和 edge confidence 展示；大图必须自动使用 `aggregated-community` 预览。
- `zl-cockpit-build --target <repo>` 生成 `.planning/cockpit/index.html`、`cockpit-data.json`、`COCKPIT_REPORT.md` 和 `assets/`。
- 有安全 Graphify HTML 时复制到 cockpit assets；Graphify HTML 含外部 URL/CDN 时阻断复制并写 WARN。
- 无 Graphify HTML 但有 `graph.json` 时，cockpit 使用内置 fallback 网状图。
- 有 RAG/citation/answer audit 报告时展示 Knowledge Evidence；无 RAG 时显示 `WAIVED_WITH_RISK`，但不失败。
- 默认输出必须包含 `heavy refresh executed: no`，且验证不得执行 GraphRAG index、Graphify build 或外部网络。
- `verify:full-command-surface` 更新为 74 / 74。
- `verify:skills-usability` 更新为 33 个 runtime skill/prompt。
- `verify:quality-closure` 聚合 `verify:cockpit-build`。

### 10.1 机械质量审计新增门禁

- `verify:ambiguity`：中英日命中、规范性词不误报、项目词表扩展、默认告警和 strict 阻断。
- `verify:structure`：五类关键 JSON 制品的 mini-schema、缺失/损坏负例和合规率。
- `verify:answer-audit`：引用解析率、数值漂移、无依据句比例、docs query 自动审计和配置关闭。
- `verify:guardrails`：Claude Code 中性权限模板、平台默认保留和上下文效率约定。
- `verify:cockpit-build`：Quality & Token Metrics 槽位、可选 token 数据和大图聚合。
- 上述检查均不得联网、下载模型或执行隐藏重刷新。

完成标准：

- `npm run verify:cockpit-build` PASS。
- `templates/cockpit/sample.html` 可直接打开，使用假数据展示 PASS 状态、Graphify 影响图、RAG 证据链、quality/privacy 状态，且不包含外部 URL。
- `npm run verify:cockpit-build` 覆盖模板样例、viewModel v1、安全/不安全 Graphify HTML、RAG 缺失和大图聚合，当前应为 5 个 case。
- `npm run verify:quality-closure` PASS。
- README、commands、technical-guide、runtime-command-packs、quality-dashboard、full-test-plan、changelog 和 verification README 均同步 cockpit 命令、报告和 no hidden refresh 边界。

## 11. 近期优先级

P0：

- 命名统一：Zhulong Project Intelligence Kit / Zhulong / `zl-*`。
- `verify:integration` 保持 FAIL 0。
- README、commands、technical-guide 与实际命令一致。
- runtime pack 不提示用户使用 `gsd-*`。
- `verify:quality`、`verify:quality-closure` 和 `verify:all` 保持可复跑。

P1：

- 保持 workflow closure fixture 覆盖新项目、既有项目、graph-lite、full-strict。
- 保持 workflow governance fixture 覆盖 Codex、Claude Code、Copilot 的同一授权合同，以及当前 workflow 证据绑定。
- 扩展 docs completeness 到更多 README 入口和 HTML 页面一致性。
- 将 QA dashboard 接入 future `latest.json` 历史趋势。

P2：

- 增加真实 Graphify smoke。
- 增加完整 graph-local profile 和 live/local/enterprise RAG provider matrix。
- 扩展 schema validation 到严格 JSON Schema、issue/phase 实例和更多负例。
- 输出更多 JSON report 字段供 dashboard 聚合。
- 规划 Frontend Experience Intelligence Mode 的调查阶段：前后端联动建模、前端可视化验证、AI 调错组件/route/state 的失败模式、截图/DOM/ARIA/视觉 diff/交互 smoke 如何进入 evidence。

P3：

- 文档 hash、docs diff、glossary。
- Graph impact/risk 命令。
- 更严格的 OS-level offline mode。
- 完整 graph-local profile：在本地 LLM 上稳定完成实体/关系抽取和 `local/global` graph search。
- 前端增强专门阶段：调查完成后再提供本地拖拽编辑器或静态 HTML editor，把画面迁移、UI 状态、组件映射、设计依据写入 `.planning/ui/SCREEN_FLOW.json`，并接入 RAG、trace、cockpit 和 Graphify impact。

## 12. 不达标时的处理规则

- 有 FAIL：不能宣称对应能力可用。
- 有 WARN：必须说明 WARN 的范围，以及是否影响当前结论。
- live provider 未跑：只能说 fixture/local 通过，不能说真实 provider 已验证。
- runtime pack 只安装但未检查内容：只能说文件存在，不能说 runtime 能正确调用。
- 文档或 graph stale：不能作为 completion evidence。
- AI runtime 对话里说完成，但 `zl-completion-check` 不通过：以 guard 为准。
