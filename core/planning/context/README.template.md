# Context Packets: {{PROJECT_NAME}}

This directory stores Zhulong context packets generated before debug, execution, or
review work.

Context packets are deterministic project snapshots for coding agents. They
collect pointers to:

- current workflow state
- specification context
- glossary terms
- code-map artifacts
- verification expectations
- evidence writeback expectations

They are not a substitute for source verification. Treat them as a starting map
for `$zl-debug`, `$zl-execute-phase`, `$zl-plan-phase`, and related flows.

## Handoffs

Workflow helpers such as `zl-debug` and `zl-execute-phase` write Zhulong native
workflow handoff records under:

```text
.planning/context/handoffs/
```

Each handoff links the public Zhulong command, workflow contract, reference design,
and context packet. GSD may appear as reference design only; the active command
surface remains `zl-*`.

After verification, create a durable record when the work is non-trivial:

```bash
zl-evidence-record --target <repo> "<summary>" --command "<command>" --result "<result>"
```
