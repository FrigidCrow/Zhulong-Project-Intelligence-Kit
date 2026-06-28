---
name: pik-cockpit-build
description: AI-PIKit local project cockpit for leader demos, visual reports, project health, Graphify impact, RAG evidence, and quality status.
---

# AI-PIKit Project Cockpit

Use this when the user invokes `/pik-cockpit-build` or asks for a project cockpit, leader demo, 可视化报告, 项目健康度, or Graphify / RAG / evidence summary.

## Required Flow

1. From the repository root, run:

   ```bash
   {{PIK_CLI}} cockpit build --target "$PWD"
   ```

2. Open or report the generated local static page:

   ```text
   .planning/cockpit/index.html
   ```

3. Read `.planning/cockpit/COCKPIT_REPORT.md` before explaining stale, missing, or risk states.

## Local Contract

- Keep the user-facing command name `/pik-cockpit-build`.
- The cockpit command is local-only and does not use an external LLM.
- It reads existing `.planning/`, `graphify-out/`, and `verification/reports/` artifacts.
- It must not run GraphRAG index, Graphify build, or hidden heavy refresh.
- If newer Graphify/RAG data is needed, ask the user before suggesting explicit `--run`, `--index`, or `pik-refresh-run`.
- Mention evidence/writeback state from the cockpit, but do not claim completion unless workflow and evidence gates pass.
