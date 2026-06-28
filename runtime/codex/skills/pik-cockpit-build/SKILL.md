---
name: pik-cockpit-build
description: AI-PIKit local project cockpit for Codex. Use when the user asks for a project cockpit, leader demo, visual report, project health view, or a Graphify/RAG/evidence status summary.
---

# AI-PIKit Project Cockpit

This is the Codex runtime entrypoint for `$pik-cockpit-build`.

## Invocation

- Treat `$pik-cockpit-build` as the project cockpit / visualization command.
- Use it when the user asks for 驾驶舱, leader 演示, 可视化报告, 项目健康度, or a Graphify / RAG / evidence summary.
- Preserve `$pik-cockpit-build` in user-facing notes.

## Required Flow

1. Resolve the project root from the current working directory.
2. Run the local AI-PIKit cockpit builder:

```bash
{{PIK_CLI}} cockpit build --target "$PWD"
```

3. Report the generated local file:

```text
.planning/cockpit/index.html
```

4. If the cockpit shows stale or missing Graphify/RAG evidence, explain the next command from the generated cockpit report instead of refreshing automatically.

## Boundaries

- This command is local-only by default.
- It must not call external LLMs or remote RAG providers.
- It must not trigger hidden heavy refresh.
- It reads existing Graphify, GraphRAG/RAG, workflow, quality, privacy, and evidence artifacts only.
- GraphRAG index, Graphify build, and refresh-run require explicit user approval through `--run`, `--index`, or `pik-refresh-run`.
- Preserve evidence writeback: cockpit summarizes evidence state, but completion still requires meaningful verification records.
