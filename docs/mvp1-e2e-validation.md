# MVP1 End-to-End Validation

Date: 2026-06-25

## Scenario

Temporary project: `e2e_smoke`

Validation goal:

```text
spec evidence
  -> code-map evidence
  -> Zhulong workflow handoff
  -> durable evidence writeback
  -> project verification
```

## Commands

```bash
zl-init --target <tmp> --template brownfield-monorepo --name e2e_smoke
zl-docs-scan --target <tmp>
zl-docs-normalize --target <tmp>
zl-docs-query --target <tmp> 承認条件
zl-graph-status --target <tmp>
zl-graph-query --target <tmp> PaymentService
zl-debug --target <tmp> "PaymentService should reject non-admin approval"
zl-evidence-record --target <tmp> "PaymentService approval rule verified" \
  --command "node --check src/payment.ts" \
  --result "passed" \
  --risk "No semantic GraphRAG adapter in MVP1" \
  --rollback "restore previous PaymentService implementation" \
  --source "docs/approval.md:3"
zl-evidence-status --target <tmp>
zl-verify --target <tmp>
```

## Observed Evidence

Document query returned:

```text
docs/approval.md:3 承認条件は管理者のみ。PaymentService must reject non-admin approval.
```

Code-map query returned:

```text
.planning/graphs/GRAPH_REPORT.md:3 PaymentService owns approve and admin authorization.
.planning/graphs/graph.json:node:1 {"id":"PaymentService","type":"class","source_location":"src/payment.ts:1"}
```

Workflow handoff created:

```text
.planning/context/debug-paymentservice-should-reject-non-admin-approval.md
.planning/context/handoffs/debug-paymentservice-should-reject-non-admin-approval-HANDOFF.md
backend $gsd-debug PaymentService should reject non-admin approval
```

Evidence status returned:

```text
records 1
20260624T163017Z-paymentservice-approval-rule-verified.md
```

`zl-verify` passed required file, directory, placeholder, and JSON checks.

## Result

MVP1 proves the Zhulong-shaped loop:

```text
user runs zl-* command
  -> Zhulong gathers local spec/code-map context
  -> Zhulong preserves current GSD backend routing as an implementation detail
  -> Zhulong writes durable context and evidence artifacts
  -> Zhulong verifies the local workspace shape
```

## Remaining Gaps

- Chat-runtime native command registration was not implemented in MVP1. Later
  loops added Codex, Claude Code, and GitHub Copilot runtime packs.
- GraphRAG semantic indexing was not executed by Zhulong in MVP1. Later loops added
  configured direct RAG indexing/query commands.
- Graphify execution was represented by handoff/status/query over artifacts in
  MVP1. Later loops added configured direct Graphify execution.
- Evidence records were linked local records in MVP1. Later loops added compact
  writeback into existing issue, debug, and phase backend records.
