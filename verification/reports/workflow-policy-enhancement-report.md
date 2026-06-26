# AI-PIKit Workflow Facade & Policy Guard Contract Report

生成时间: 2026-06-25

## 摘要

本次增强分两个主阶段实施：

1. MVP6.0 Workflow Facade：让 `pik-debug`、`pik-plan-phase`、`pik-execute-phase` 等 public workflow 自动汇总轻量上下文、policy、preflight、gate 和下一步建议，降低开发时的命令心智负担。
2. MVP6.1 Policy Guard Contract：新增 `pik-policy-lock`、`pik-policy-verify`、`pik-policy-diff`，把 “允许跳过 / 必须阻断 / 带风险继续” 固化为本地可锁定、可验证、可 diff 的 policy contract。

## 新增命令

- `pik-policy-lock --target <repo>`
- `pik-policy-verify --target <repo>`
- `pik-policy-diff --target <repo>`

## 新增产物

- `.planning/workflows/<workflow-id>/WORKFLOW_FACADE.json`
- `.planning/workflows/<workflow-id>/WORKFLOW_FACADE.md`
- `.planning/policies/POLICY_LOCK.json`
- `.planning/policies/POLICY_LOCK.md`
- `.planning/policies/POLICY_VERIFY.json`
- `.planning/policies/POLICY_VERIFY.md`
- `.planning/policies/POLICY_DIFF.json`
- `.planning/policies/POLICY_DIFF.md`

## 关键规则

- public workflow 只做轻量检查，不自动运行 GraphRAG index、Graphify build 或 refresh-run。
- policy 命令只做轻量验证，不触发 heavy refresh。
- policy / workflow gate 统一使用 `PASS`、`FAIL`、`WAIVED_WITH_RISK`、`STALE_NEEDS_REFRESH`。
- `graph-lite` 允许无文档继续，但必须写 `WAIVED_WITH_RISK`。
- `default-local-rag` 对 stale 只提醒，不自动重跑。
- `full-strict` 对 stale RAG、stale Graphify、missing citation、外部 provider、API key、外部 URL 硬阻断。

## 当前专项验证

- `npm run verify:workflow-facade`: PASS
- `npm run verify:policy-hardening`: PASS

## 证据报告

- `verification/reports/workflow-facade-check.md`
- `verification/reports/policy-hardening-check.md`

## 最终验证结果

- `npm run check`: PASS
- `npm run verify:docs`: PASS, files=19, links=81, issues=0
- `npm run verify:naming`: PASS, files=150, issues=0
- `npm run verify:workflow-facade`: PASS, issues=0
- `npm run verify:policy-hardening`: PASS, issues=0
- `npm run verify:full-command-surface`: PASS, commands=68/68, issues=0
- `npm run fixture:japanese`: PASS
- `npm run verify:quality`: PASS
- `npm run verify:integration`: PASS 132 / FAIL 0 / WARN 1
- `npm run verify:all`: PASS

`WARN 1` 来自 integration 默认未启用外部 live GraphRAG fixture。AI-PIKit 默认已经是 local-only GraphRAG；外部 live GraphRAG 只作为显式 opt-in smoke，不影响本地默认结论。

## 修正记录

integration 首轮暴露了一个旧 fixture 配置问题：`examples/japanese-doc-dev-fixture/pik.fixture.config.json` 使用 `fixture-graphrag` 作为 provider，新的 privacy gate 会正确把它判为非 local-only。已把该 fixture 改为 `graphrag-local`，并显式写入 `privacy.network_policy = local_only`、`graphrag.mode = local`、`requires_api_key = false` 和 localhost API base。修正后 `npm run verify:integration` 与 `npm run fixture:japanese` 均通过。
