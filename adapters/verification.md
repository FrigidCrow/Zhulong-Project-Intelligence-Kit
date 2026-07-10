# Verification Adapter

Verification is the closure adapter.

## Responsibilities

- Record what was tested.
- Record what was not tested.
- Capture build/lint/test/e2e output summaries.
- Capture graph freshness when structure changed.
- Record deployment and rollback notes when relevant.
- Link evidence back to the relevant issue, debug, or phase record.

## Verification Record

Every non-trivial change should answer:

- What changed?
- What command or manual check proved it?
- What evidence was captured?
- What remains risky?
- How can it be rolled back?

Zhulong facade:

```bash
zl-evidence-record --target <repo> "<summary>" --command "<command>" --result "<result>"
zl-evidence-record --target <repo> "<summary>" --writeback .planning/issues/<issue>.md
```
