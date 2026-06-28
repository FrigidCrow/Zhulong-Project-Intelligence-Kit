# AI-PIKit 全量测试计划

Generated: 2026-06-25

## 1. 目的

这份计划用于验证 AI-PIKit 每个阶段的核心能力是否真实可用，而不是只看文档或命令是否存在。

测试目标：

- 覆盖所有 `pik-*` public command。
- 覆盖所有 public workflow。
- 覆盖文档抽取、citation、RAG、GraphRAG、本地隐私、Graphify、workflow gate、evidence、runtime pack、license、policy、help skills、project cockpit。
- 连续执行两轮全量测试，观察结果是否稳定。
- 正式测试阶段如出现失败，只记录失败，不在同一测试轮内修复。
- 维护者在大改或发布前额外运行 `npm run dev:audit:full`，生成命令/skills/feature scorecard、AI-PIKit / GSD / Superpowers 对标、时间拆分和 token 统计边界；它补充正式测试轮，不替代 Round 1 / Round 2。

## 2. 测试阶段规则

正式测试分为两轮：

```text
Round 1: full-test-round-1
Round 2: full-test-round-2
```

每轮执行同一组命令。任何失败都必须写入报告：

```text
verification/reports/full-test-round-1.md
verification/reports/full-test-round-1.json
verification/reports/full-test-round-2.md
verification/reports/full-test-round-2.json
```

失败记录格式：

```text
命令:
预期:
实际:
证据:
影响:
是否阻断发布:
```

正式测试开始后，失败不在同一轮修复。修复必须进入下一轮开发循环。

维护者内部审计产物固定在：

```text
.pik-audit/latest/
verification/reports/developer-audit-summary.md
```

`.pik-audit/` 已被 git ignore，只保留可提交摘要。最近一次完整审计为 `PASS 96 / A`，覆盖 71 个命令、33 个 runtime skill/prompt 和 feature gates；最新三方 benchmark 为 AI-PIKit `90 / A`、GSD `88 / B`、Superpowers `82 / B`，其中 GSD / Superpowers 使用本机真实 skill/plugin 文件做 `skill-pack-backed-replay`。`Benchmark comparison: 87` 是 12 行混合对标矩阵的平均值，不是 AI-PIKit 单体能力分。

## 3. 命令覆盖矩阵

### 初始化 / 基础

| 命令 | 验证点 |
| --- | --- |
| `pik` | help 可输出命令总览 |
| `pik-init` | 新项目、既存项目均可生成 `.planning/` |
| `pik-verify` | 检查必需文件和目录 |
| `pik-map` | 生成轻量代码结构说明 |

### Codebase

| 命令 | 验证点 |
| --- | --- |
| `pik-codebase` | alias 等价于 `pik-codebase-scan` |
| `pik-codebase-scan` | 生成 source/test/config inventory |
| `pik-codebase-status` | 输出 codebase 与 graph 状态 |

### 文档 / RAG

| 命令 | 验证点 |
| --- | --- |
| `pik-docs-scan` | 生成 `RAG_SOURCES.md` |
| `pik-docs-status` | 输出文档状态 |
| `pik-docs-normalize` | 归一化文本类文档 |
| `pik-docs-extract` | 本地抽取 md/txt/csv/pdf/docx/xlsx |
| `pik-docs-diff` | 识别文档新增、变更、删除 |
| `pik-docs-citations` | 生成 source citation |
| `pik-docs-index` | 生成 RAG handoff |
| `pik-docs-index --run` | 执行本地 RAG index，并通过 privacy guard |
| `pik-docs-query` | 本地关键词查询 |
| `pik-docs-query --rag` | 执行本地 GraphRAG query |
| `pik-rag-init-local` | 初始化 Ollama + LanceDB 本地 GraphRAG |

### MVP3 Evidence Quality

| 命令 | 验证点 |
| --- | --- |
| `pik-rag-golden-add` | 增加 golden case |
| `pik-rag-golden-run` | 跑 golden case，输出 PASS/FAIL |
| `pik-rag-eval` | 汇总 RAG/citation 质量 |
| `pik-citation-audit` | 校验 citation 指向存在的源文件 |
| `pik-trace-build` | 建立 文档 -> 代码 -> 测试 -> evidence trace matrix |
| `pik-trace-query` | 查询 trace matrix |
| `pik-trace-audit` | 校验 trace matrix 完整性 |

### MVP3.5 Refresh Control

| 命令 | 验证点 |
| --- | --- |
| `pik-preflight` | 只做轻量检查，输出 commit distance 和 `heavy refresh executed: no` |
| `pik-refresh-plan` | 区分无关 commit 与文档/代码相关 commit |
| `pik-refresh-run` | 显式刷新 RAG/Graphify 后更新 `REFRESH_STATE.json` |
| `pik-mode-status` | 输出当前执行预算模式 |
| `pik-mode-set` | 可切换 `default-local-rag`、`graph-lite`、`full-strict` |

### Graphify / 代码地图

| 命令 | 验证点 |
| --- | --- |
| `pik-graph-build` | 生成 Graphify handoff |
| `pik-graph-build --run` | 执行 Graphify command 前通过 privacy guard |
| `pik-graph-status` | 输出 graph 状态 |
| `pik-graph-query` | 查询 graph/report |
| `pik-graph-diff` | 比较 baseline 和当前 graph |
| `pik-graph-diff --save-baseline` | 保存 baseline |
| `pik-graph-impact` | 生成影响面 |
| `pik-graph-risk` | 生成风险报告 |
| `pik-graph-freshness --strict` | stale graph 返回非 0 |

### Privacy / Policy / License

| 命令 | 验证点 |
| --- | --- |
| `pik-privacy-audit` | local-only 配置通过，外部配置失败 |
| `pik-offline-lock` | 写入 offline lock |
| `pik-outbound-audit` | 默认无外发行为 |
| `pik-license-audit` | 输出 license 风险 |
| `pik-policy-list` | 列出 policy |
| `pik-policy-check` | 执行 policy 并写报告 |
| `pik-policy-explain` | 解释指定 policy |
| `pik-policy-lock` | 生成 policy snapshot 和 hash |
| `pik-policy-verify` | 验证当前配置未偏离 lock，并执行轻量 policy checks |
| `pik-policy-diff` | 输出 lock 与当前配置的字段级差异 |

### Evidence / Runtime / Help

| 命令 | 验证点 |
| --- | --- |
| `pik-evidence-record` | 写 evidence record |
| `pik-evidence-record --writeback` | 写回 issue/debug/phase |
| `pik-evidence-status` | 输出 evidence 状态 |
| `pik-runtime-install` | 三种 runtime pack 可安装 |
| `pik-runtime-status` | 三种 runtime pack 可检查 |
| `pik-help-skills` | 根据提问推荐合适 `pik-*` 命令 |
| `pik help skills` | canonical help skills 路径可用 |
| `pik-cockpit-build` | 基于 `templates/cockpit/index.template.html` 和 `cockpit-viewmodel.v1` 生成 `.planning/cockpit/index.html`，展示 Graphify/RAG/workflow/quality/privacy 状态；支持搜索、节点详情、legend 过滤和大图聚合；稳定样例见 `templates/cockpit/sample.html` |

### Workflow

| 命令 | 验证点 |
| --- | --- |
| `pik-new-milestone` | 生成 native workflow state / handoff |
| `pik-spec-phase` | 生成 native workflow state / handoff |
| `pik-discuss-phase` | 生成 native workflow state / handoff |
| `pik-ui-phase` | 生成 native workflow state / handoff |
| `pik-debug` | 生成 native workflow state / handoff |
| `pik-plan-phase` | 生成 native workflow state / handoff |
| `pik-execute-phase` | 生成 native workflow state / handoff |
| `pik-code-review` | 生成 native workflow state / handoff |
| `pik-verify-work` | 生成 native workflow state / handoff |
| `pik-complete-milestone` | 生成 native workflow state / handoff |
| `pik-workflow-run` | 通用 workflow 入口 |
| `pik-workflow-status` | 输出 gate 状态 |
| `pik-workflow-continue` | 标记人工 gate |
| `pik-workflow-audit` | 输出失败原因和下一条命令 |
| `pik-gate-check` | gate 完整时通过 |
| `pik-completion-check` | 完成前硬检查 |

## 4. 质量脚本覆盖

每轮必须执行：

```bash
npm run check
npm run verify:quality
npm run verify:integration
npm run verify:full-command-surface
npm run verify:skills-usability
npm run verify:workflow-closure
npm run verify:cockpit-build
npm run verify:docs-completeness
npm run verify:quality-closure
```

其中 `verify:quality` 必须包含：

```text
verify:docs
verify:docs-update
verify:rag
verify:rag-local
verify:docs-extract
verify:docs-sync
verify:answer-audit
verify:knowledge-reliability
verify:graph-hardening
verify:privacy-strict
verify:license
verify:mvp3
verify:mvp35
verify:workflow-facade
verify:policy-hardening
verify:schema
verify:naming
verify:runtime
verify:visual
verify:skills-usability
verify:workflow-closure
verify:cockpit-build
verify:docs-completeness
```

## 5. 成功标准

一轮测试成功条件：

- `FAIL = 0`
- 新增报告均存在
- `pik-help-skills` 输出至少 3 条推荐
- `pik-policy-check` 输出 PASS
- `pik-rag-golden-run` 至少 1 条 golden PASS
- `pik-trace-audit` 输出 PASS
- `pik-completion-check` 对完整 fixture 输出 `completion allowed`
- `verify:skills-usability` 证明 33 个 runtime skill/prompt 可用
- `verify:cockpit-build` 证明 project cockpit 独立模板、假数据样例和 `cockpit-viewmodel.v1` 可用，不触发 GraphRAG/Graphify 重刷新，并能处理 Graphify HTML、fallback 图、大图聚合和 RAG 缺失风险
- `verify:docs-completeness` 证明命令手册 71 个独立锚点和 README 跳转完整
- `verify:quality-closure` 聚合 gate 输出 PASS

两轮测试成功条件：

- Round 1 和 Round 2 均满足一轮成功条件。
- 两轮均没有 secret-shaped key 命中。
- 两轮均没有默认外发 issue。

## 6. 报告入口

正式测试报告：

```text
verification/reports/full-test-round-1.md
verification/reports/full-test-round-2.md
```

辅助报告：

```text
verification/reports/mvp3-evidence-policy-check.md
verification/reports/mvp35-refresh-control-check.md
verification/reports/full-command-surface-check.md
verification/reports/skills-usability-check.md
verification/reports/workflow-closure-check.md
verification/reports/cockpit-build-check.md
verification/reports/docs-completeness-check.md
verification/reports/quality-closure-check.md
verification/reports/latest.md
verification/reports/docs-check.md
verification/reports/visual-check.md
verification/reports/OUTBOUND_AUDIT.md
verification/reports/license-audit.md
```
