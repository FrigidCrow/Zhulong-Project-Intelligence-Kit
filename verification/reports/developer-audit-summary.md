# AI-PIKit Developer Audit Summary

生成时间: 2026-06-28T10:20:59.824Z

## 摘要

- Run ID: `2026-06-28T10-19-11-341Z`
- 原始产物目录: `.pik-audit/latest/`
- 命令覆盖: 71
- Runtime skill/prompt 覆盖: 33
- 功能审计状态: PASS
- 对标审计状态: PASS
- Benchmark comparison score: 87
- Token 规则: 只有真实 Codex JSONL 中存在 usage 时才统计；缺失时写 `TOKEN_USAGE_UNAVAILABLE`。
- 记忆隔离规则: 每轮使用 fresh fixture；真实 Codex 对标必须使用 `--ephemeral --ignore-rules`，需要完全不读用户配置时额外启用 `AI_PIKIT_AUDIT_CODEX_IGNORE_USER_CONFIG=1`。

## 评分怎么读

- `Benchmark comparison` 是所有 benchmark 行的保守平均分，不是 AI-PIKit 单体分。
- 本轮工具平均分: AI-PIKit=90/A, GSD=88/B, Superpowers=82/B。
- AI-PIKit `graph-lite` 是低成本模式，故意不强制 GraphRAG/RAG，评分不会按 full-local 满分计算。
- AI-PIKit `full-local` 在无文档场景输出 `EXPECTED_BLOCK`，这是正确安全边界，但会拉低横向平均。
- GSD / Superpowers 是 `skill-pack-backed-replay`，不是 repository-local CLI 或 live model benchmark，因此设置可信度上限。
- Real Codex subprocess 只单独记录环境可用性和 token usage，不成功时不混入 replay 分数。

## 对标结果

| 工具 | 模式 | 状态 | 评分 | 耗时 | Token | 隔离 |
| --- | --- | --- | --- | --- | --- | --- |
| AI-PIKit | graph-lite-dev-loop | PASS | 88 | 2453 ms | TOKEN_USAGE_UNAVAILABLE | PASS |
| AI-PIKit | full-local-graphify-graphrag | PASS | 100 | 3321 ms | TOKEN_USAGE_UNAVAILABLE | PASS |
| GSD | skill-pack-backed-replay | PASS | 88 | 261 ms | TOKEN_USAGE_UNAVAILABLE | PASS |
| Superpowers | skill-pack-backed-replay | PASS | 82 | 248 ms | TOKEN_USAGE_UNAVAILABLE | PASS |
| AI-PIKit | graph-lite-dev-loop | WAIVED_WITH_RISK | 88 | 2513 ms | TOKEN_USAGE_UNAVAILABLE | PASS |
| AI-PIKit | full-local-graphify-graphrag | EXPECTED_BLOCK | 75 | 3309 ms | TOKEN_USAGE_UNAVAILABLE | PASS |
| GSD | skill-pack-backed-replay | WAIVED_WITH_RISK | 88 | 246 ms | TOKEN_USAGE_UNAVAILABLE | PASS |
| Superpowers | skill-pack-backed-replay | WAIVED_WITH_RISK | 82 | 250 ms | TOKEN_USAGE_UNAVAILABLE | PASS |
| AI-PIKit | graph-lite-dev-loop | PASS | 88 | 2703 ms | TOKEN_USAGE_UNAVAILABLE | PASS |
| AI-PIKit | full-local-graphify-graphrag | PASS | 100 | 3896 ms | TOKEN_USAGE_UNAVAILABLE | PASS |
| GSD | skill-pack-backed-replay | PASS | 88 | 266 ms | TOKEN_USAGE_UNAVAILABLE | PASS |
| Superpowers | skill-pack-backed-replay | PASS | 82 | 270 ms | TOKEN_USAGE_UNAVAILABLE | PASS |

## 主要结论

- 本轮命令面覆盖 71 个 `pik` / `pik-*` bin，命令平均分 100。
- Runtime pack 覆盖 33 个 Codex / Claude Code / GitHub Copilot skill/prompt，平均分 100。
- 功能 gate 加权分 100，用于证明 workflow、policy、RAG、Graphify、cockpit 和 docs completeness 的闭环。
- Benchmark comparison 87 是所有对标行的保守平均分，不是 AI-PIKit 单体分；AI-PIKit 单体平均见三方横向总览。
- AI-PIKit full-local benchmark 已把 Graphify 与 GraphRAG/RAG 耗时拆开；graph-lite benchmark 用于低成本开发循环。
- GSD 与 Superpowers 本轮使用本机真实 skill/plugin 文件做 skill-pack-backed replay；real agent subprocess 另行记录，不混入 replay 分数。
- AI-PIKit 当前优势是本地可执行面最完整：`pik-*` CLI、runtime skills、`.planning/` evidence、Graphify/RAG 耗时拆分和 local-only guard 都能在同一 fixture 中落地。平均分 90/A。
- AI-PIKit 当前弱点是 full-local 路径比 graph-lite 更重，命令面也明显更大；日常开发需要继续靠 profile/policy 控制何时刷新 Graphify/RAG。
- GSD 的优势是 workflow 设计成熟，plan/execute/verify、UAT、subagent 编排和文档流程经验很强；本轮 replay 平均分 88/B。
- GSD 的短板是它不是当前项目的 repository-local AI-PIKit CLI，Codex typed-agent 能力和本地 RAG/Graphify/policy 默认融合都不是它的原生闭环。
- Superpowers 的优势是轻量、通用、TDD 和 verification-before-completion 思路清晰；本轮 replay 平均分 82/B。
- Superpowers 的短板是缺少面向文档密集型开发的项目知识层、代码影响图、citation/evidence/policy 本地闭环；更像开发纪律增强包，不是项目 intelligence layer。
- 真实 agent subprocess 状态单独统计为：AI-PIKit=FAIL, GSD=FAIL, Superpowers=FAIL。它不成功时不能证明模型执行质量，只能证明当前环境的 live-agent benchmark 条件不足。
- 因此本轮可信结论是：AI-PIKit 在“本地项目知识中枢 + 工作流 + evidence/policy + Graphify/RAG 集成”上领先；GSD 在 workflow 设计参考价值上更成熟；Superpowers 在轻量开发纪律上更简洁。

## 报告入口

- `.pik-audit/latest/AUDIT_REPORT.md`
- `.pik-audit/latest/COMMAND_SCORES.md`
- `.pik-audit/latest/SKILL_SCORES.md`
- `.pik-audit/latest/FEATURE_SCORES.md`
- `.pik-audit/latest/BENCHMARK_COMPARISON.md`
- `.pik-audit/latest/TIME_BREAKDOWN.md`
- `.pik-audit/latest/TOKEN_USAGE.md`
