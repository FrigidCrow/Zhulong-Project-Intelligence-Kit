# Context Packets: {{PROJECT_NAME}}

This directory stores AI-PIKit context packets generated before debug, execution, or
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
for `$pik-debug`, `$pik-execute-phase`, `$pik-plan-phase`, and related flows.

## Handoffs

Workflow helpers such as `pik-debug` and `pik-execute-phase` write AI-PIKit native
workflow handoff records under:

```text
.planning/context/handoffs/
```

Each handoff links the public AI-PIKit command, workflow contract, reference design,
and context packet. GSD may appear as reference design only; the active command
surface remains `pik-*`.

After verification, create a durable record when the work is non-trivial:

```bash
pik-evidence-record --target <repo> "<summary>" --command "<command>" --result "<result>"
```
