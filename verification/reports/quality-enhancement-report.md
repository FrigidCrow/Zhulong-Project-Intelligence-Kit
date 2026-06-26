# AI-PIKit 质量增强报告

Generated: 2026-06-25  
Basis: `docs/quality-plan.md`  
Scope: MVP3 Evidence Quality & Policy Mode + full command surface verification + two formal full-test rounds  
Status: implemented and verified

## 1. 本次增强目标

本次增强把 AI-PIKit 从“命令和 workflow 能跑”推进到“RAG、citation、trace、policy、help skills 和完整命令面都有可复跑证据”。

核心目标：

1. 增加 MVP3 Evidence Quality & Policy Mode。
2. 增加 `pik-help-skills`，根据用户场景推荐合适的 `pik-*` 命令组。
3. 更新 README 和所有文档入口。
4. 增加 changelog，能追溯每个阶段做了什么。
5. 增加完整测试计划和两轮正式测试报告入口。
6. 用脚本证明 `package.json` 中所有 `pik-*` / `pik` 命令都能实际执行。

## 2. 新增命令

| 命令 | 作用 | 主要产物 |
| --- | --- | --- |
| `pik-rag-golden-add` | 增加 RAG golden case | `.planning/quality/rag-goldens.json` |
| `pik-rag-golden-run` | 运行 RAG golden cases | `.planning/quality/RAG_GOLDEN_RESULTS.md` |
| `pik-rag-eval` | 汇总 RAG 可信度 | `.planning/quality/RAG_EVAL.md` |
| `pik-citation-audit` | 校验 citation 指向真实源文件 | `.planning/knowledge/CITATION_AUDIT.md` |
| `pik-trace-build` | 建立文档、代码、测试、evidence trace matrix | `.planning/trace/TRACE_MATRIX.json` |
| `pik-trace-query` | 查询 trace matrix | stdout |
| `pik-trace-audit` | 审计 trace matrix 完整性 | `.planning/trace/TRACE_AUDIT.md` |
| `pik-policy-list` | 列出内置 policy | `.planning/policies/POLICY_LIST.md` |
| `pik-policy-check` | 执行 policy checks | `.planning/policies/POLICY_CHECK.md` |
| `pik-policy-explain` | 解释指定 policy | stdout |
| `pik-help-skills` | 根据场景推荐命令 | `.planning/help/HELP_SKILLS.md` |

## 3. 新增验证脚本

| 脚本 | npm 命令 | 证明范围 |
| --- | --- | --- |
| `scripts/verify-mvp3-evidence-policy.mjs` | `npm run verify:mvp3` | golden、citation、trace、policy、help skills |
| `scripts/verify-mvp35-refresh-control.mjs` | `npm run verify:mvp35` | preflight、refresh plan、显式 refresh-run、mode、文档同步 |
| `scripts/verify-full-command-surface.mjs` | `npm run verify:full-command-surface` | `package.json` 中全部 `pik-*` / `pik` bin 命令 |
| `scripts/run-full-test-plan.mjs` | `npm run verify:full-test-plan` 或直接传 `--run-id` | 按 `docs/full-test-plan.md` 执行正式轮验证 |

## 4. 当前已生成证据

| 报告 | 当前结论 |
| --- | --- |
| `verification/reports/mvp3-evidence-policy-check.md` | PASS，MVP3 专项 issues=0 |
| `verification/reports/mvp35-refresh-control-check.md` | 新增后由 `npm run verify:mvp35` 生成 |
| `verification/reports/full-command-surface-check.md` | PASS，覆盖 `package.json` 中全部命令 |
| `verification/reports/docs-check.md` | 文档更新中会重新生成 |
| `verification/reports/latest.md` | 正式 integration 后重新生成 |
| `verification/reports/full-test-round-1.md` | PASS，issues=0 |
| `verification/reports/full-test-round-2.md` | PASS，issues=0 |

## 5. 当前质量闭环

```text
npm run check
  -> bin/pik.mjs 语法检查

npm run verify:mvp3
  -> MVP3 evidence / policy / help skills fixture

npm run verify:mvp35
  -> refresh control / mode / docs sync fixture

npm run verify:full-command-surface
  -> 所有 bin 命令逐个执行

npm run verify:quality
  -> docs / docs-update / RAG / Local GraphRAG / docs extract
  -> graph hardening / privacy strict / license
  -> MVP3 / schema / naming / runtime / visual

npm run verify:integration
  -> 端到端 workflow、Graphify、RAG、runtime、completion guard

node scripts/run-full-test-plan.mjs --run-id round-1
node scripts/run-full-test-plan.mjs --run-id round-2
  -> 两轮正式测试报告
```

## 6. 本次增强后的可信边界

可以宣称已验证：

- `pik-*` 是当前稳定命令面。
- GSD 只作为参考设计，不是用户入口。
- 默认 Local GraphRAG 不需要外部 API key。
- RAG/citation/trace/policy/help skills 已有专项验证。
- `package.json` 中全部命令入口已被 `verify:full-command-surface` 执行。
- 两轮正式测试已完成，`full-test-round-1` 和 `full-test-round-2` 都是 PASS。

不能宣称已完成：

- 大规模真实客户项目的 GraphRAG/Graphify 压力测试。
- OS 级物理断网或沙箱强制隔离。
- MCP server 形态的 runtime 集成。
- 可视化 QA 的交互式 trace graph。
- RAG faithfulness / context recall 等高级评估指标。

## 7. 后续建议

下一阶段建议进入 **MVP4 Knowledge Reliability Mode**：

1. `pik-docs-sync`：文档更新后一键 scan / extract / diff / index / citation audit。
2. `pik-answer-audit`：检查回答是否有 citation、是否命中规格、是否有幻觉风险。
3. GraphRAG query route：local / global / drift / basic 自动选择。
4. QA Dashboard 展示 trace matrix、policy check、RAG eval 和 graph impact。
5. 继续保持默认 local-only，把外部 provider 作为显式 opt-in。
