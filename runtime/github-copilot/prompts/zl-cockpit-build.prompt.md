---
name: zl-cockpit-build
description: Build a Zhulong local project cockpit for visual project health, leader demos, Graphify impact, RAG evidence, privacy, and quality status.
argument-hint: optional cockpit focus
agent: agent
---

Run the Zhulong Project Intelligence Kit cockpit builder for the current workspace.

Use this prompt when the user asks for a 驾驶舱, leader 演示, 可视化报告, 项目健康度, or a Graphify / RAG / evidence summary.

1. Run `{{ZL_CLI}} cockpit build --target "$PWD"`.
2. Report `.planning/cockpit/index.html` as the local static cockpit.
3. Read `.planning/cockpit/COCKPIT_REPORT.md` before summarizing risks or stale states.
4. Do not trigger hidden heavy refresh.
5. Do not call external LLMs, external RAG providers, or remote URLs.
6. Treat Graphify and GraphRAG/RAG as existing local artifacts only.
7. If the cockpit says Graphify or RAG is stale, ask before suggesting explicit `zl-graph-build --run`, `zl-docs-sync --index`, or `zl-refresh-run`.
8. Include evidence/writeback status in the summary, but do not claim completion unless the workflow gates pass.

Keep the user-facing command name `zl-cockpit-build`.
