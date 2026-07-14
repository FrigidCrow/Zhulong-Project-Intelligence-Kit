# Zhulong 架构说明

Zhulong Project Intelligence Kit，文档缩写 **Zhulong**，把 AI coding runtime 和目标项目的工程上下文分开。Codex、Claude Code、GitHub Copilot 负责执行；Zhulong 负责把项目状态、代码影响面、按需启用的文档依据、验证证据和完成前 gate 组织成可检查的本地制品。

```mermaid
flowchart LR
  R["Codex / Claude Code / GitHub Copilot"] --> C["zl-* CLI"]
  A["User intent / bounded Goal grant"] --> C
  C --> W["Workflow guard"]
  C --> K["Document Policy / RAG Backend"]
  C --> G["Graphify code map"]
  C --> E["Evidence / Trace / Policy"]
  W --> P[".planning/workflows"]
  K --> PK[".planning/knowledge"]
  G --> PG[".planning/graphs"]
  E --> PE[".planning/evidence + .planning/trace + .planning/policies"]
```

## 1. Workflow Kernel

Zhulong 自己拥有 workflow kernel。GSD 只作为参考设计，不再作为用户命令面。

当前公开入口全部是 `zl-*`：

- `zl-debug`
- `zl-plan-phase`
- `zl-execute-phase`
- `zl-code-review`
- `zl-verify-work`
- `zl-complete-milestone`
- `zl-workflow-run`
- `zl-completion-check`

Workflow guard 会检查：

- context
- codebase
- docs
- graph
- interaction policy
- current-workflow execution authorization
- later result acceptance or bounded Goal authorization
- structured decisions and open questions
- plan
- implementation
- verification
- evidence
- writeback

任一 gate 不通过，`zl-completion-check` 就不能通过。该命令只刷新审计并报告 `completion eligible` 或 `completion blocked`，不把 workflow 写成完成；状态变更由显式的 `zl workflow complete` 负责。

### Authorization and Goal state

默认策略是 `interactive + auto_advance: false`。一个 workflow 推荐后续 `zl-*` 命令不构成执行授权，debug 的“调查/分析/诊断”也不构成修复授权。当前用户消息授权的是它明确要求的当前工作，不会预先接受尚未生成的产物；普通交互必须在产物完成后再绑定一次用户验收，原始消息明确要求完成/关闭时除外。多阶段自动推进则使用来自用户原始消息的有界 Goal 授权。

自然语言多 MVP 授权先被编译为项目内的结构化 milestone contract，再保存为 `.planning/goals/<authorization-id>/AUTHORIZATION.json`，活动指针位于 `.planning/goals/ACTIVE.json`。每个合同保存 exact objective、actions、allowed paths、acceptance、权限与 digest；child workflow 必须使用 exact objective，并携带授权 ID、milestone 与 digest。只有 milestone 名称的旧 grant 限制为非修改型 workflow。依赖、commit、push、merge、release 还要通过 `zl workflow permission-check` 消费权限，超出范围时 fail closed。

本地 CLI 无法密码学验证聊天消息作者，因此 workflow alias 不自动注入 `--source user-message`。该标记只能由直接响应当前用户消息的 runtime 按共同合同附加，并在状态中作为 runtime assertion 审计；agent-selected downstream workflow 不得附加。确定性 kernel 负责合同、evidence、acceptance 与 completion 的 artifact 约束，消息来源边界仍由 Codex、Claude Code、Copilot 的 runtime instruction 层负责。

workflow 的 plan、implementation、verification 不再接受任意字符串，而是要求 `.planning/workflows/<workflow-id>/` 下与当前 workflow ID、证据类型、完成状态和内容摘要绑定的类型化 artifact。durable evidence 与 writeback 同样必须绑定当前 workflow，避免历史文件替当前任务通过 gate。

## 2. Document Policy / RAG Backend Layer

文档层是按需能力，用于任何把资料作为需求、验收、合规或运行依据的项目，例如：

- PRD 与需求规范
- QA 与验收标准
- ADR 与会议决策
- 设计文档与 API / DB 约定
- 测试规格、运行手册和交付说明

Zhulong 现在把“文档严格程度”和“RAG 后端”分开配置。`zl-init` 默认是轻量模式：

```text
document_policy: reference
rag_backend: none
execution_budget.profile: graph-lite
privacy.network_policy: local_only
```

这意味着非文档密集型项目可以使用完整的 `rag none` 路线，不安装 GraphRAG，也不需要本地模型。workflow、codebase、Graphify、policy、evidence 和 completion gate 保持有效；少量文档仍然可以被 `zl-docs-sync` 扫描、抽取、直接查询和引用审计。只有 `zl-docs-index --run` 和 `zl-docs-query --rag` 会明确失败，避免误触发 GraphRAG。

文档密集或规格严格项目推荐在初始化时选择本地 RAG：

```bash
zl-init --target "$PWD" --doc-policy strict --rag local --setup-rag skip
```

本地 RAG 使用：

- `graphrag-workspace/settings.yaml`
- Ollama 本地 LLM，默认 `qwen2.5:7b`
- Ollama 本地 embedding，默认 `bge-m3`
- LanceDB
- `http://127.0.0.1:11434`
- 不需要 `GRAPHRAG_API_KEY`

关键命令：

```bash
zl-docs-scan --target "$PWD"
zl-docs-extract --target "$PWD"
zl-rag-init-local --target "$PWD"
zl-docs-index --target "$PWD" --run
zl-docs-query --target "$PWD" --rag "退款规则的依据是什么？"
```

文档更新后应重跑：

```bash
zl-docs-sync --target "$PWD"
zl-docs-query --target "$PWD" "退款规则依据"
zl-answer-audit --target "$PWD"
```

默认 `zl-docs-sync` 只做 scan / diff / extract / citation audit，并写 `STALE_NEEDS_REFRESH`；需要重建本地 GraphRAG index 时才显式运行 `zl-docs-sync --target "$PWD" --index`。

## 3. Conditional Frontend Design Layer

前端设计能力属于 workflow 决策层，而不是独立美术生成器。`zl-ui-phase` 读取 `project.manifest.yml`、依赖、设计资料、token、组件和现有页面，通过 `core/design/taste-adapter.md` 输出 `preserve`、`evolve`、`create` 或 `system` 的 Frontend Design Decision。后续 plan、execute、review 和 verify 只消费这份合同，不重新选择风格。

上游 `design-taste-frontend` 以固定 commit 保存在 `third_party/taste-skill/`，用于许可证追溯与升级差异检查；runtime 只加载 Zhulong Adapter，避免上游硬规则与项目事实形成第二套权威。Codex、Claude Code 和 GitHub Copilot 的 `zl-ui-phase` 都通过渲染后的 `ZL_KIT_ROOT` 指向同一 Adapter。

```mermaid
flowchart LR
  U["User + project evidence"] --> UI["zl-ui-phase"]
  M["frontend_design config"] --> UI
  T["Zhulong Taste Adapter"] --> UI
  UI --> D["Frontend Design Decision"]
  D --> P["plan"]
  P --> X["execute"]
  X --> R["code review + verify"]
```

## 4. Graphify Code Map Layer

Graphify 是代码地图后端。Zhulong 不重写 Graphify，而是负责：

- 执行配置中的 Graphify command。
- 同步 `graphify-out/graph.json` 到 `.planning/graphs/graph.json`。
- 同步 `graphify-out/GRAPH_REPORT.md` 到 `.planning/graphs/GRAPH_REPORT.md`。
- 在 workflow guard 中检查 graph 是否存在、是否 stale。

关键命令：

```bash
zl-graph-build --target "$PWD" --run
zl-graph-query --target "$PWD" "PaymentService"
zl-graph-impact --target "$PWD" --files "src/a.js"
zl-graph-risk --target "$PWD"
zl-graph-freshness --target "$PWD" --strict
```

## 5. Evidence Quality & Policy Mode

MVP3 增加了一层证据质量控制。它不只记录 evidence，还检查 evidence 是否可靠。

```mermaid
flowchart TD
  D["docs / citations"] --> T["trace matrix"]
  G["Graphify graph"] --> T
  X["tests"] --> T
  E["evidence records"] --> T
  T --> P["policy check"]
  P --> C["policy lock / verify / diff"]
  Q["RAG golden / eval"] --> P
  L["privacy / license"] --> P
```

新增制品：

- `.planning/quality/rag-goldens.json`
- `.planning/quality/RAG_GOLDEN_RESULTS.md`
- `.planning/quality/RAG_EVAL.md`
- `.planning/knowledge/CITATION_AUDIT.md`
- `.planning/trace/TRACE_MATRIX.json`
- `.planning/trace/TRACE_AUDIT.md`
- `.planning/policies/POLICY_CHECK.md`
- `.planning/policies/POLICY_LOCK.md`
- `.planning/policies/POLICY_VERIFY.md`
- `.planning/policies/POLICY_DIFF.md`
- `.planning/help/HELP_SKILLS.md`

关键命令：

```bash
zl-rag-golden-run --target "$PWD"
zl-citation-audit --target "$PWD"
zl-trace-build --target "$PWD"
zl-trace-audit --target "$PWD"
zl-policy-check --target "$PWD" --strict
zl-policy-lock --target "$PWD"
zl-policy-verify --target "$PWD"
zl-policy-diff --target "$PWD"
zl-help-skills --target "$PWD" "我现在是文档更新情况，有没有适合我的命令"
```

MVP6 开始，workflow / policy gate 使用四态语义：`PASS`、`FAIL`、`WAIVED_WITH_RISK`、`STALE_NEEDS_REFRESH`。公开语义是 `reference` / `strict`：`reference` 可以带风险跳过文档并写 `WAIVED_WITH_RISK`，`strict` 对 stale、missing citation 和外部 provider 硬阻断。内部 profile `graph-lite`、`default-local-rag`、`full-strict` 继续兼容，但不作为新用户的一层概念。policy lock/verify/diff 只做轻量检查，不触发 GraphRAG index 或 Graphify build。

## 6. Runtime Adapter Layer

Codex、Claude Code、GitHub Copilot 的适配方式不同，但功能不分叉：

| Runtime | 文件形式 | 用户调用 |
| --- | --- | --- |
| Codex | `SKILL.md` | `$zl-debug` |
| Claude Code | `SKILL.md` | `/zl-debug` |
| GitHub Copilot | `*.prompt.md` | `/zl-debug` |

Runtime pack 只负责把用户带到同一套本地 CLI：

```bash
zl-runtime-install --runtime codex --dest ~/.codex/skills
zl-runtime-install --runtime claude-code --dest ~/.claude/skills
zl-runtime-install --runtime github-copilot --dest .github/prompts
```

可信边界仍然是本地 `zl-*` 命令和 `.planning/` artifact。

安装器会为三种 runtime 注入同一份授权合同：默认只执行当前 Skill；“建议下一步”不得自动串行调用；debug 默认 diagnose-only；用户明确要求多个 milestone 自动执行时，创建并继承一个有界授权；代理自写 evidence 不能冒充用户确认。

## 7. Developer Audit Layer

Developer Audit 是维护者专用质量控制面，不属于普通项目运行时，也不写入目标项目 `.planning/`。它读取仓库命令、runtime pack、verification reports 和 synthetic benchmark fixture，生成 `.zl-audit/latest/` 下的 scorecard。

```mermaid
flowchart LR
  A["npm run dev:audit:full"] --> I["inventory"]
  A --> C["command scores"]
  A --> S["skill scores"]
  A --> F["feature gate scores"]
  A --> B["Zhulong / GSD / Superpowers benchmark"]
  B --> T["time breakdown"]
  B --> U["token usage boundary"]
  I --> R[".zl-audit/latest"]
  C --> R
  S --> R
  F --> R
  T --> R
  U --> R
  R --> V["verification/reports/developer-audit-summary.md"]
```

当前公开命令面为 74 个，runtime skill/prompt 为 33 个。历史 scorecard 与三方 benchmark 只代表当次 fixture，不作为当前能力的替代证明；当前状态以 full-command-surface、skills usability 和各功能 verifier 为准。Zhulong `graph-lite` 继续提供低成本 “Zhulong + Graphify” 模式；full-local 在无文档场景输出 `EXPECTED_BLOCK`，作为正确安全边界记录。

## 8. Local-only 安全边界

Zhulong 默认不主动上传项目数据。风险主要来自你把配置改成外部 provider。

被重点审计的配置包括：

- `.planning/config.json`
- `graphrag-workspace/settings.yaml`
- `graphrag-workspace/.env`
- `.planning/knowledge/RAG_INDEX_RESULT.md`
- `.planning/knowledge/RAG_QUERY_RESULT.md`
- `.planning/graphs/GRAPH_BUILD_RESULT.md`

保密项目建议：

```bash
zl-offline-lock --target "$PWD"
zl-privacy-audit --target "$PWD" --strict
zl-outbound-audit --target "$PWD"
zl-policy-check --target "$PWD" --strict
zl-policy-lock --target "$PWD"
zl-policy-verify --target "$PWD"
```

## 9. 验证架构

当前验证由单一 manifest 分为三层：

```bash
npm test
npm run verify:ci
npm run verify:release
npm run verify:local-rag
```

- `verify:mvp3` 验证 golden、citation、trace、policy、help skills。
- `verify:mvp35` 验证 refresh/preflight/mode、相关/无关 commit 判断和文档同步要求。
- `verify:workflow-facade` 验证 public workflow 自动写 facade、输出下一步建议并保持 no heavy refresh。
- `verify:init-policy` 验证 `zl-init` 的文档策略/RAG 后端选择、外部 RAG opt-in、`rag none` 阻断 GraphRAG 执行。
- `verify:ambiguity` 验证中英日词表、规范性关键词不误报、strict 阻断和项目词表合并。
- `verify:structure` 验证五类关键制品 mini-schema、合规率和默认/strict 状态语义。
- `verify:answer-audit` 验证引用解析率、数值漂移、无依据句比例和自动审计开关。
- `verify:guardrails` 验证 Claude Code 中性权限模板与 B1/B2/B3/B6 上下文效率约定。
- `verify:policy-hardening` 验证 policy lock/verify/diff、四态语义、profile 阻断和 no heavy refresh。
- `verify:cockpit-build` 验证 cockpit 独立模板、假数据样例、稳定 `cockpit-viewmodel.v1` 和 `zl-cockpit-build` 真实项目快照；真实快照能生成本地静态驾驶舱，安全处理 Graphify HTML，并展示 RAG/workflow/quality/privacy/evidence 状态。Graphify impact 预览借鉴 Graphify viewer 的固定图模型，支持搜索、节点详情、legend 过滤和大图 community 聚合。
- `verify:full-command-surface` 执行 `package.json` 中全部 `zl-*` / `zl` 命令。
- `verify:skills-usability` 验证 Codex / Claude Code / GitHub Copilot 33 个 skill/prompt 都能指向本地 CLI 并保留 local-only / no hidden refresh / evidence writeback 约束。
- `verify:workflow-closure` 验证新项目、既有项目、graph-lite、full-strict 四条闭环 fixture。
- `verify:docs-completeness` 验证命令手册 74 个独立锚点、详情字段和 README 跳转。
- `verify:release` 聚合质量闭环、安装 smoke 和发布就绪 gate。
- `verify:dev-audit-harness` 验证维护者内部审计机制，`dev:audit:full` 生成命令/skills/feature/benchmark scorecard 和时间/token/隔离报告。
- `verify:ci` 聚合 docs、RAG 命令、Graph hardening、privacy、license、schema、naming、runtime、visual 和 CI 配置；真实本地 GraphRAG / Ollama 由 `verify:local-rag` 追加。
- `verify:integration` 验证完整 Zhulong workflow 和 Graphify / RAG 增强链路。

完整测试计划在 [full-test-plan.md](full-test-plan.md)，阶段追踪在 [changelog.md](changelog.md)。
