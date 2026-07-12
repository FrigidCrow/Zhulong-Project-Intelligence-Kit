# Zhulong 全量测试计划

Generated: 2026-06-25

## 1. 目的

这份计划用于验证 Zhulong 每个阶段的核心能力是否真实可用，而不是只看文档或命令是否存在。

测试目标：

- 覆盖所有 `zl-*` public command。
- 覆盖所有 public workflow。
- 覆盖文档抽取、citation、RAG、GraphRAG、本地隐私、Graphify、workflow gate、evidence、runtime pack、license、policy、help skills、project cockpit。
- 连续执行两轮全量测试，观察结果是否稳定。
- 正式测试阶段如出现失败，只记录失败，不在同一测试轮内修复。
- 维护者在大改或发布前额外运行 `npm run dev:audit:full`，生成命令/skills/feature scorecard、Zhulong / GSD / Superpowers 对标、时间拆分和 token 统计边界；它补充正式测试轮，不替代 Round 1 / Round 2。

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
.zl-audit/latest/
verification/reports/developer-audit-summary.md
```

`.zl-audit/` 已被 git ignore，只保留可提交摘要。当前公开命令面为 74 个，runtime skill/prompt 为 33 个；历史完整审计分数仅代表当次基线，不能替代当前 verifier 结果。最新三方 benchmark 也属于历史对标证据，不作为 Zhulong 的永久能力分。

## 3. 命令覆盖矩阵

### 初始化 / 基础

| 命令 | 验证点 |
| --- | --- |
| `zl` | help 可输出命令总览 |
| `zl-init` | 新项目、既存项目均可生成 `.planning/`，并写入 `reference/strict` 文档策略和 `none/local/external` RAG 后端 |
| `zl-verify` | 检查必需文件和目录 |
| `zl-map` | 生成轻量代码结构说明 |

### Codebase

| 命令 | 验证点 |
| --- | --- |
| `zl-codebase` | alias 等价于 `zl-codebase-scan` |
| `zl-codebase-scan` | 生成 source/test/config inventory |
| `zl-codebase-status` | 输出 codebase 与 graph 状态 |

### 文档 / RAG

| 命令 | 验证点 |
| --- | --- |
| `zl-docs-scan` | 生成 `RAG_SOURCES.md` |
| `zl-docs-status` | 输出文档状态 |
| `zl-docs-normalize` | 归一化文本类文档 |
| `zl-docs-extract` | 本地抽取 md/txt/csv/pdf/docx/xlsx |
| `zl-docs-diff` | 识别文档新增、变更、删除 |
| `zl-docs-citations` | 生成 source citation |
| `zl-docs-index` | 生成 RAG handoff |
| `zl-docs-index --run` | 执行本地 RAG index，并通过 privacy guard |
| `zl-docs-query` | 本地关键词查询 |
| `zl-docs-query --rag` | 执行本地 GraphRAG query |
| `zl-rag-init-local` | 初始化 Ollama + LanceDB 本地 GraphRAG |

### MVP3 Evidence Quality

| 命令 | 验证点 |
| --- | --- |
| `zl-rag-golden-add` | 增加 golden case |
| `zl-rag-golden-run` | 跑 golden case，输出 PASS/FAIL |
| `zl-rag-eval` | 汇总 RAG/citation 质量 |
| `zl-citation-audit` | 校验 citation 指向存在的源文件 |
| `zl-trace-build` | 建立 文档 -> 代码 -> 测试 -> evidence trace matrix |
| `zl-trace-query` | 查询 trace matrix |
| `zl-trace-audit` | 校验 trace matrix 完整性 |

### MVP3.5 Refresh Control

| 命令 | 验证点 |
| --- | --- |
| `zl-preflight` | 只做轻量检查，输出 commit distance 和 `heavy refresh executed: no` |
| `zl-refresh-plan` | 区分无关 commit 与文档/代码相关 commit |
| `zl-refresh-run` | 显式刷新 RAG/Graphify 后更新 `REFRESH_STATE.json` |
| `zl-mode-status` | 输出当前执行预算模式 |
| `zl-mode-set` | 可切换 `docs-reference`、`docs-strict`，并兼容 `default-local-rag`、`graph-lite`、`full-strict` |

### Graphify / 代码地图

| 命令 | 验证点 |
| --- | --- |
| `zl-graph-build` | 生成 Graphify handoff |
| `zl-graph-build --run` | 执行 Graphify command 前通过 privacy guard |
| `zl-graph-status` | 输出 graph 状态 |
| `zl-graph-query` | 查询 graph/report |
| `zl-graph-diff` | 比较 baseline 和当前 graph |
| `zl-graph-diff --save-baseline` | 保存 baseline |
| `zl-graph-impact` | 生成影响面 |
| `zl-graph-risk` | 生成风险报告 |
| `zl-graph-freshness --strict` | stale graph 返回非 0 |

### Privacy / Policy / License

| 命令 | 验证点 |
| --- | --- |
| `zl-privacy-audit` | local-only 配置通过，外部配置失败 |
| `zl-offline-lock` | 写入 offline lock |
| `zl-outbound-audit` | 默认无外发行为 |
| `zl-license-audit` | 输出 license 风险 |
| `zl-policy-list` | 列出 policy |
| `zl-policy-check` | 执行 policy 并写报告 |
| `zl-policy-explain` | 解释指定 policy |
| `zl-policy-lock` | 生成 policy snapshot 和 hash |
| `zl-policy-verify` | 验证当前配置未偏离 lock，并执行轻量 policy checks |
| `zl-policy-diff` | 输出 lock 与当前配置的字段级差异 |

### Evidence / Runtime / Help

| 命令 | 验证点 |
| --- | --- |
| `zl-evidence-record` | 写 evidence record |
| `zl-evidence-record --writeback` | 写回 issue/debug/phase |
| `zl-evidence-status` | 输出 evidence 状态 |
| `zl-runtime-install` | 三种 runtime pack 可安装 |
| `zl-runtime-status` | 三种 runtime pack 可检查 |
| `zl-help-skills` | 根据提问推荐合适 `zl-*` 命令 |
| `zl help skills` | canonical help skills 路径可用 |
| `zl-cockpit-build` | 基于 `templates/cockpit/index.template.html` 和 `cockpit-viewmodel.v1` 生成 `.planning/cockpit/index.html`，展示 Graphify/RAG/workflow/quality/privacy 状态；支持搜索、节点详情、legend 过滤和大图聚合；稳定样例见 `templates/cockpit/sample.html` |

### Workflow

| 命令 | 验证点 |
| --- | --- |
| `zl-new-milestone` | 生成 native workflow state / handoff |
| `zl-spec-phase` | 生成 native workflow state / handoff |
| `zl-discuss-phase` | 生成 native workflow state / handoff |
| `zl-ui-phase` | 生成 native workflow state / handoff；greenfield landing 为 `create/full`，自然演进为 `evolve/constrained`，成熟设计为 `preserve/audit-only`，Dashboard 为 `system/disabled`；用户请求覆盖 manifest，manifest 覆盖自动判断 |
| `zl-debug` | 生成 native workflow state / handoff |
| `zl-plan-phase` | 生成 native workflow state / handoff |
| `zl-execute-phase` | 生成 native workflow state / handoff |
| `zl-code-review` | 生成 native workflow state / handoff |
| `zl-verify-work` | 生成 native workflow state / handoff |
| `zl-complete-milestone` | 生成 native workflow state / handoff |
| `zl-workflow-run` | 通用 workflow 入口 |
| `zl-workflow-status` | 输出 gate 状态 |
| `zl-workflow-continue` | 标记人工 gate |
| `zl-workflow-audit` | 输出失败原因和下一条命令 |
| `zl-gate-check` | gate 完整时通过 |
| `zl-completion-check` | 完成前硬检查 |

## 4. 质量脚本覆盖

每轮必须执行：

```bash
npm run check
npm run verify:quality
npm run verify:integration
npm run verify:full-command-surface
npm run verify:skills-usability
npm run verify:taste-adapter
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
verify:ci
```

本地 GraphRAG / Ollama 是环境集成层，不是 GitHub Actions 的确定性前置：

```text
verify:quality:local-rag
```

`verify:quality-closure` 再聚合：

```text
verify:skills-usability
verify:workflow-closure
verify:cockpit-build
verify:docs-completeness
```

## 5. 成功标准

一轮测试成功条件：

- `FAIL = 0`
- 新增报告均存在
- `zl-help-skills` 输出至少 3 条推荐
- `zl-policy-check` 输出 PASS
- `zl-rag-golden-run` 至少 1 条 golden PASS
- `zl-trace-audit` 输出 PASS
- `zl-completion-check` 对完整 fixture 输出 `completion allowed`
- `verify:skills-usability` 证明 33 个 runtime skill/prompt 可用
- `verify:cockpit-build` 证明 project cockpit 独立模板、假数据样例和 `cockpit-viewmodel.v1` 可用，不触发 GraphRAG/Graphify 重刷新，并能处理 Graphify HTML、fallback 图、大图聚合和 RAG 缺失风险
- `verify:docs-completeness` 证明命令手册 74 个独立锚点和 README 跳转完整
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
