# AI-PIKit Schema Check

生成时间: 2026-06-28T10:22:12.752Z

## 摘要

- 状态: PASS
- 问题数: 0

## Evidence

- workflow audit before gates: found workflow guard FAIL
- workflow audit next command: found next plan:
- workflow audit after evidence: found workflow guard PASS
- project manifest schema: ../../../../../../../Users/frigidcrow/Documents/Project-Intelligence-Kit /schemas/project.manifest.schema.json
- project manifest schema: JSON parsed with keys $schema, title, type, required, properties
- generated project manifest: project.manifest.yml
- project.manifest.yml: schema-required top-level keys checked (project, knowledge, workflow, privacy)
- issue record schema: ../../../../../../../Users/frigidcrow/Documents/Project-Intelligence-Kit /schemas/issue-record.schema.md
- issue record schema: markdown sections checked
- phase record schema: ../../../../../../../Users/frigidcrow/Documents/Project-Intelligence-Kit /schemas/phase-record.schema.md
- phase record schema: markdown sections checked
- active workflow pointer: .planning/workflows/ACTIVE.json
- active workflow pointer: JSON parsed with keys id, workflow, updatedAt
- workflow state: .planning/workflows/debug-schema-validation-smoke/WORKFLOW_STATE.json
- workflow state: JSON parsed with keys id, workflow, request, status, createdAt, updatedAt, contextPacket, handoff, manualGates
- workflow state markdown: .planning/workflows/debug-schema-validation-smoke/WORKFLOW_STATE.md
- workflow plan record: .planning/workflows/debug-schema-validation-smoke/PLAN.md
- workflow implementation record: .planning/workflows/debug-schema-validation-smoke/IMPLEMENTATION.md
- workflow verification record: .planning/workflows/debug-schema-validation-smoke/VERIFICATION.md
- workflow context packet: .planning/context/debug-schema-validation-smoke.md
- workflow handoff: .planning/context/handoffs/debug-schema-validation-smoke-HANDOFF.md
- evidence index: .planning/evidence/INDEX.md
- evidence index: markdown sections checked
- evidence record: .planning/evidence/20260628T102212Z-schema-validation-evidence.md
- evidence record: markdown sections checked
- debug writeback target: .planning/debug/schema-debug.md

## Fixture Paths

- Work root: `/var/folders/8x/r_vcd1b9087b2z66wcry685c0000gn/T/aipikit-schema-IdOC18`
- Project root: `/var/folders/8x/r_vcd1b9087b2z66wcry685c0000gn/T/aipikit-schema-IdOC18/project`
- Reproduce command: `node '/Users/frigidcrow/Documents/Project-Intelligence-Kit /scripts/verify-schema.mjs'`

## Issues

No schema issues found.
