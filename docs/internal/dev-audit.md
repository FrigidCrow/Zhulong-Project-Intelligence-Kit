# AI-PIKit Developer Audit

AI-PIKit Developer Audit 是维护者专用的常态审计和对标机制。它不面向普通使用者，不新增公开 `pik-*` 命令，也不会进入 `docs/commands.html`。

目标是回答四个问题：

- 当前 71 个 `pik` / `pik-*` 命令是否仍然可执行、可文档化、可追溯。
- Codex / Claude Code / GitHub Copilot 的 33 个 runtime skill/prompt 是否真的能安装并引导到本地 `pik-*`。
- workflow、policy、Graphify、GraphRAG/RAG、cockpit、docs completeness 等功能 gate 是否仍然闭环。
- RAG/文档可信度、红队安全回归和 SkillsBench-style with/without skill delta 是否有本地归档。
- AI-PIKit 与 GSD / Superpowers 做同题对标时，差异在哪里，耗时和 token 怎么记录。

## 运行入口

```bash
npm run verify:dev-audit-harness
npm run dev:audit:quick
npm run dev:audit:full
npm run dev:audit:skill-behavior
npm run dev:audit:security-governance
npm run dev:audit:ragas-style
npm run dev:audit:promptfoo-redteam
npm run dev:audit:benchmark
npm run dev:audit:nightly
```

常用规则：

| 命令 | 用途 |
| --- | --- |
| `npm run verify:dev-audit-harness` | 验证 `.pik-audit/` 已被 git ignore、npm 脚本存在、fixture 能生成。 |
| `npm run dev:audit:quick` | 不重跑全部 verifier，适合日常快速生成一次内部 scorecard。 |
| `npm run dev:audit:full` | 跑命令、skills、功能 gate 和 benchmark，对应本轮正式审计。 |
| `npm run dev:audit:skill-behavior` | 生成 deterministic Skill 行为契约分，覆盖 33 个 runtime skill/prompt 的 explicit / implicit / near-miss / negative / adversarial 用例。 |
| `npm run dev:audit:security-governance` | 生成 `.pik-audit/latest/SECURITY_GOVERNANCE_CHECK.*`，复查 local-only 和外部 RAG opt-in 边界。 |
| `npm run dev:audit:ragas-style` | 生成 `.pik-audit/latest/RAGAS_STYLE_KNOWLEDGE_SCORES.*`，本地代理 Ragas 的 context recall / faithfulness / citation / tool call / goal 指标。 |
| `npm run dev:audit:promptfoo-redteam` | 生成 `.pik-audit/latest/PROMPTFOO_STYLE_REDTEAM_SCORES.*`，本地代理 Promptfoo 红队矩阵。 |
| `npm run dev:audit:benchmark` | 只跑 AI-PIKit / GSD / Superpowers 对标。 |
| `npm run dev:audit:nightly` | 维护者夜间巡检入口，默认不跑真实 AI 子进程。 |

## 产物位置

原始产物全部写入 `.pik-audit/`，并且 `.gitignore` 已经排除：

```text
.pik-audit/runs/<timestamp>/
.pik-audit/latest/
```

固定报告包括：

```text
.pik-audit/latest/AUDIT_REPORT.md
.pik-audit/latest/AUDIT_SCORECARD.json
.pik-audit/latest/AUDIT_SCORECARD.html
.pik-audit/latest/COMMAND_SCORES.md
.pik-audit/latest/SKILL_SCORES.md
.pik-audit/latest/SKILL_BEHAVIOR_SCORES.md
.pik-audit/latest/FEATURE_SCORES.md
.pik-audit/latest/SECURITY_GOVERNANCE_CHECK.md
.pik-audit/latest/RAGAS_STYLE_KNOWLEDGE_SCORES.md
.pik-audit/latest/PROMPTFOO_STYLE_REDTEAM_SCORES.md
.pik-audit/latest/QUALITY_CONTROL_SCORECARD.md
.pik-audit/latest/QUALITY_CONTROL_SCORECARD.html
.pik-audit/latest/BENCHMARK_COMPARISON.md
.pik-audit/latest/TIME_BREAKDOWN.md
.pik-audit/latest/TOKEN_USAGE.md
```

面向文档和 QA dashboard 的摘要会同步到：

```text
verification/reports/developer-audit-summary.md
verification/reports/developer-audit-summary.json
verification/reports/quality-control-summary.md
verification/reports/quality-control-summary.json
```

## 质量控制评分

`AUDIT_SCORECARD` 保留原有命令、skills、功能 gate、benchmark、成本/隔离口径；`QUALITY_CONTROL_SCORECARD` 是长期质量控制口径，固定为 100 分：

| 维度 | 权重 |
| --- | ---: |
| Static Skill Quality | 10 |
| Trigger Accuracy | 15 |
| Command / Tool Trajectory | 20 |
| Workflow / Evidence Closure | 20 |
| Knowledge / RAG Quality | 15 |
| Safety / Governance | 10 |
| Efficiency / Stability | 10 |

`SKILL_SCORES` 只证明 runtime skill/prompt 的结构合规；`SKILL_BEHAVIOR_SCORES` 证明渲染后的 Codex / Claude Code / GitHub Copilot runtime pack 是否包含正确 `pik-*` 路由、local-only/privacy、no hidden heavy refresh、evidence/writeback 和 adversarial external-RAG guard。它按每个 runtime skill/prompt 五类 case 归档，是 deterministic harness，不调用外部模型。

`RAGAS_STYLE_KNOWLEDGE_SCORES` 和 `PROMPTFOO_STYLE_REDTEAM_SCORES` 是本地代理指标：只读取 `verification/reports/` 和本地 verifier 产物，不接 Ragas / Promptfoo SaaS，不调用外部模型，不外发内部资料。

## 方法论来源

以下链接已在 2026-06-29 复核。Developer Audit 采用“本地确定性验证为主，外部框架补盲区”的方式：链接用于方法论和治理映射，不代表把内部数据提交给外部服务。

| 方法论 / 来源 | 在 AI-PIKit 中的落点 |
| --- | --- |
| [OpenAI Agent Skills docs](https://developers.openai.com/codex/skills) | runtime skill/prompt 包结构、`SKILL.md`、触发说明和插件分发边界。 |
| [OpenAI Testing Agent Skills Systematically with Evals](https://developers.openai.com/blog/eval-skills) | `SKILL_BEHAVIOR_SCORES` 的 prompt / artifact / check / score 结构。 |
| [SkillsBench paper](https://arxiv.org/abs/2602.12670) / [SkillsBench 1.1](https://www.skillsbench.ai/blogs/skillsbench-1-1) | `BENCHMARK_COMPARISON.skill_delta` 的 with_skill / without_skill delta。 |
| [Anthropic Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) | trajectory + outcome、deterministic grader、regression eval 的分层设计。 |
| [Ragas agent metrics](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/agents/) | `RAGAS_STYLE_KNOWLEDGE_SCORES` 的 ToolCallAccuracy / ToolCallF1 / AgentGoalAccuracy 本地代理口径。 |
| [Promptfoo Agent Skills](https://www.promptfoo.dev/docs/integrations/agent-skill/) | `PROMPTFOO_STYLE_REDTEAM_SCORES` 的 eval/redteam matrix 本地代理口径。 |
| [OWASP Top 10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/) | `SECURITY_GOVERNANCE_CHECK` 的 prompt injection、tool misuse、agent boundary、越权和数据泄露检查。 |
| [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework) / [NIST AI 600-1 GenAI Profile](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence) | release gate 的 risk management 和治理口径。 |

发布判断：

```text
RELEASE_OK: >= 90 且无 critical fail
RELEASE_WITH_RISK: 80-89 且无 critical fail
INTERNAL_ONLY: 70-79
BLOCKED: < 70
BLOCKED_CRITICAL: privacy / data leakage / evidence critical fail
```

## 对标任务和场景

固定任务：

```text
代理承認の上限を 30,000 円から 50,000 円へ変更し、仕様依据、代码影响面、测试验证、证据写回都要闭环。
```

固定场景：

| 场景 | 文档状态 | 期待 |
| --- | --- | --- |
| `docs-complete` | 仕様、QA、議事録 都存在 | AI-PIKit full-local 和 graph-lite 都应通过。 |
| `docs-missing` | 只有代码和测试 | graph-lite 可带风险继续；full-local 应阻断，不能假装有文档依据。 |
| `docs-partial` | 只有部分规格文档 | graph-lite 可继续；full-local 应尽量通过并暴露 citation 风险。 |

对标对象：

| 工具 | 本轮处理方式 |
| --- | --- |
| AI-PIKit `graph-lite-dev-loop` | 使用 AI-PIKit + Graphify，不跑 GraphRAG/RAG。 |
| AI-PIKit `full-local-graphify-graphrag` | 使用 AI-PIKit + Graphify + 本地 RAG/GraphRAG fixture。 |
| GSD | 读取本机 `~/.codex/skills/gsd-*` 核心 workflow skill，做 `skill-pack-backed-replay`。 |
| Superpowers | 使用本地 cache 或 clone 的 Superpowers plugin skill，做 `skill-pack-backed-replay`。 |

GSD / Superpowers 没有本仓库内的 `pik-*` 等价 CLI，因此报告会记录 `instruction-pack.json`、skill hash、指令摘录、fixture、代码改修、测试和证据文件，并给 replay 分数设置可信度上限。它不会假装它们拥有 AI-PIKit 的 repository-local CLI、local GraphRAG default mode 或完整 `.planning/` evidence/policy 闭环。

## Token 和记忆隔离

默认 benchmark 是 deterministic shell benchmark，不调用外部 AI，因此 token 写为：

```text
TOKEN_USAGE_UNAVAILABLE
```

真实 Codex 子进程只有显式开启才会执行：

```bash
AI_PIKIT_AUDIT_REAL_AI=1 npm run dev:audit:benchmark
```

真实模式默认使用：

```text
codex exec --ephemeral --ignore-rules --json
```

如果要完全不读用户配置，显式设置：

```bash
AI_PIKIT_AUDIT_CODEX_IGNORE_USER_CONFIG=1 AI_PIKIT_AUDIT_REAL_AI=1 npm run dev:audit:benchmark
```

如果 Codex JSONL 没有暴露 usage 事件，报告仍然写 `TOKEN_USAGE_UNAVAILABLE`，不能填 0 或估算值。

记忆隔离规则：

- 每个工具、每个场景、每轮 repeat 都使用 fresh fixture。
- 不使用 `codex resume`。
- 每轮清空 `.planning/`、`graphify-out/`、`graphrag-workspace/` 和 agent 输出。
- `.pik-audit/latest/BENCHMARK_COMPARISON.md` 必须显示 `Memory isolation: PASS`。

## 最近一次 benchmark 结果

最近一次对标审计：

```text
Run ID: 2026-06-27T19-01-06-200Z
Status: PASS
Benchmark status: PASS
Memory isolation: PASS
```

覆盖：

```text
AI-PIKit: 90 / A, 4 pass, 1 WAIVED_WITH_RISK, 1 EXPECTED_BLOCK, 0 fail
GSD: 88 / B, 2 pass, 1 WAIVED_WITH_RISK, 0 fail
Superpowers: 82 / B, 2 pass, 1 WAIVED_WITH_RISK, 0 fail
```

### Benchmark comparison 87 怎么读

`AUDIT_SCORECARD.json` 里的 `Benchmark comparison: 87` 是全部 benchmark 行的平均分，不是 AI-PIKit 单体分。本轮平均了 12 行结果：

- AI-PIKit `graph-lite-dev-loop`
- AI-PIKit `full-local-graphify-graphrag`
- GSD `skill-pack-backed-replay`
- Superpowers `skill-pack-backed-replay`
- 三种文档状态：`docs-complete`、`docs-missing`、`docs-partial`

它偏保守有三个原因：`graph-lite` 是低成本模式，不按 full-local intelligence 给满分；`full-local` 在无文档场景输出 `EXPECTED_BLOCK`，这是正确阻断但会拉低平均；GSD / Superpowers 不是本仓库内可执行 CLI，也不是 live model benchmark，所以设置可信度上限。看 AI-PIKit 产品本身，应看三方总览里的 `AI-PIKit: 90 / A`。

状态语义：

- `WAIVED_WITH_RISK`：无文档或依据不足时允许继续，但必须写风险。
- `EXPECTED_BLOCK`：full-local 模式没有文档依据时应该阻断，不能假装 GraphRAG/RAG 证据完整。
- `FAIL`：同题 workflow、测试或证据链失败。

## 本轮 AI-PIKit 耗时拆分

| 场景 | 模式 | 总耗时 | Graphify | GraphRAG/RAG | Intelligence layer |
| --- | --- | --- | --- | --- | --- |
| docs-complete | graph-lite | 2295 ms | 359 ms | 0 ms | 359 ms |
| docs-complete | full-local | 3133 ms | 236 ms | 826 ms | 1062 ms |
| docs-missing | graph-lite | 2616 ms | 361 ms | 0 ms | 361 ms |
| docs-missing | full-local | 2889 ms | 215 ms | 817 ms | 1032 ms |
| docs-partial | graph-lite | 2317 ms | 388 ms | 0 ms | 388 ms |
| docs-partial | full-local | 2811 ms | 216 ms | 710 ms | 926 ms |

## 本轮真实 Codex 子进程结果

本轮额外执行了：

```bash
AI_PIKIT_AUDIT_REAL_AI=1 AI_PIKIT_AUDIT_CODEX_IGNORE_USER_CONFIG=1 AI_PIKIT_AUDIT_CODEX_TIMEOUT_MS=60000 npm run dev:audit:full
```

真实子进程确实使用了隔离参数：

```text
--ephemeral
--ignore-user-config
--ignore-rules
--json
```

结果：AI-PIKit / GSD / Superpowers 三个 real-codex subprocess 都在启动阶段失败，fixture 代码未被修改。原因是当前 Codex CLI 默认模型 `gpt-5.3-codex` 对当前 ChatGPT account 不支持。`codex-events.jsonl` 中的关键错误为：

```text
The 'gpt-5.3-codex' model is not supported when using Codex with a ChatGPT account.
```

因此真实 AI token usage 本轮仍为 `TOKEN_USAGE_UNAVAILABLE`。这不是未执行，而是已执行且被当前账号/模型配置阻断。后续如果切换到可用 Codex 模型或 profile，再重跑 `AI_PIKIT_AUDIT_REAL_AI=1 npm run dev:audit:full`，`TOKEN_USAGE.md/json` 会继续尝试从 JSONL usage events 中提取 token。

结论：

- AI-PIKit 当前优势是 repository-local `pik-*` CLI、runtime skills、`.planning/` evidence、Graphify/RAG 耗时拆分和 local-only guard 能在同一 fixture 中落地。
- AI-PIKit 当前弱点是 full-local 比 graph-lite 更重，命令面也更大；日常开发必须继续靠 profile/policy 控制何时刷新 Graphify/RAG。
- GSD 的优势是 workflow 设计成熟，plan/execute/verify、UAT、subagent 编排和文档流程经验很强；短板是它不是当前项目的 repository-local AI-PIKit CLI，本地 RAG/Graphify/policy 默认融合不是原生闭环。
- Superpowers 的优势是轻量、通用、TDD 和 verification-before-completion 清晰；短板是缺少面向文档密集型开发的项目知识层、代码影响图、citation/evidence/policy 本地闭环。
- graph-lite 是可用的轻量模式：完整/缺失/部分文档三种状态都能继续，其中无文档为 `WAIVED_WITH_RISK`。
- full-local 在文档齐全和文档不全时 PASS，在无文档时 `EXPECTED_BLOCK`，这是正确的安全边界。
- 默认 deterministic benchmark 不统计 token；真实 token 只来自显式 `AI_PIKIT_AUDIT_REAL_AI=1` 的 Codex JSONL。

## 文档同步规则

每次这个机制或结果发生变化，必须同步更新：

- `README.md`
- `docs/quality-plan.md`
- `docs/quality-dashboard.html`
- `docs/technical-guide.html`
- `docs/product.html`
- `docs/changelog.md`
- `verification/README.md`
- `verification/reports/developer-audit-summary.md`

不要把 `dev:audit:*` 加到 `docs/commands.html`。它们是维护者 npm 脚本，不是用户使用的 `pik-*` 产品命令。
