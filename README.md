<p align="center">
  <img src="docs/assets/zhulong-icon.png" width="112" alt="Zhulong icon">
</p>

<h1 align="center">Zhulong（烛龙）</h1>

<p align="center">
  <strong>Zhulong Project Intelligence Kit</strong><br>
  Local AI engineering intelligence for context-heavy software projects.
</p>

<p align="center">
  <a href="docs/product.html">Product</a>
  · <a href="docs/commands.html">Commands</a>
  · <a href="docs/technical-guide.html">Technical Guide</a>
  · <a href="docs/quality-plan.md">Quality Plan</a>
  · <a href="verification/reports/latest.md">Latest Verification</a>
</p>

<p align="center">
  <img alt="Node.js 18+" src="https://img.shields.io/badge/node-%3E%3D18-339933">
  <img alt="Local first" src="https://img.shields.io/badge/default-local--first-0f766e">
  <img alt="RAG optional" src="https://img.shields.io/badge/RAG-optional-7c3aed">
  <img alt="License review needed" src="https://img.shields.io/badge/license-review--needed-f59e0b">
</p>

## What Is Zhulong?

Zhulong Kit is a local project intelligence layer for AI coding work. It helps an AI assistant read project state, check specification evidence, inspect code impact, run workflow gates, and write back verification records before a change is called done.

It is not a replacement for Codex, Claude Code, GitHub Copilot, GraphRAG, or Graphify. It is the local coordination layer that makes those tools act with project memory and evidence.

```text
zhulong
  -> read project state
  -> query specs, QA notes, meeting notes, and design docs
  -> inspect code maps and impact areas
  -> run workflow gates and verification
  -> write evidence, risks, and follow-up records
```

## Naming

| Role | Name |
| --- | --- |
| Main brand | Zhulong（烛龙） |
| Full name | Zhulong Project Intelligence Kit |
| Short name | Zhulong Kit |
| Primary CLI | `zhulong` |
| Short CLI alias | `zl` |
| Legacy compatibility | `pik` / `pik-*` |

The repository is in the Zhulong rename transition. New docs should use `Zhulong` and `zhulong`; existing `pik-*` commands remain compatibility entry points until the full CLI and runtime skill migration lands.

## Quick Start

Use the root CLI form for the new brand:

```bash
zhulong init --target "$PWD" \
  --template brownfield-monorepo \
  --name my_project \
  --mode existing \
  --doc-policy reference \
  --rag none

zhulong codebase scan --target "$PWD"
zhulong docs sync --target "$PWD"
zhulong verify --target "$PWD"
```

The short alias is intended for daily use:

```bash
zl docs sync --target "$PWD"
zl workflow completion-check --target "$PWD"
zl cockpit build --target "$PWD"
```

During the migration, the legacy commands still work:

```bash
pik-init --target "$PWD" --template brownfield-monorepo --mode existing
pik-docs-sync --target "$PWD"
pik-completion-check --target "$PWD"
```

## Core Capabilities

| Capability | What It Does | Typical Command |
| --- | --- | --- |
| Workflow guard | Tracks plan, implementation, verification, evidence, and completion gates. | `zhulong workflow status` |
| Document intelligence | Scans local specs, QA, notes, docs, and optional RAG outputs. | `zhulong docs sync` |
| Code map | Reads Graphify outputs for impact, risk, freshness, and graph queries. | `zhulong graph impact` |
| Evidence loop | Records tests, decisions, risks, and writeback artifacts under `.planning/`. | `zhulong evidence record` |
| Quality audit | Checks citation grounding, structure, privacy, policies, and completion readiness. | `zhulong workflow completion-check` |
| Cockpit | Builds a local static dashboard for project status and evidence. | `zhulong cockpit build` |

## Project Modes

| Scenario | Recommended Setup | Avoid By Default |
| --- | --- | --- |
| Lightweight or low-doc project | `--doc-policy reference --rag none` | Do not install or run RAG unless needed. |
| Spec-heavy Japanese project | `--doc-policy strict --rag local` | Do not use external providers without explicit approval. |
| Existing codebase | Run codebase scan, docs sync, then graph build if impact analysis matters. | Do not move source files into `.planning/`. |
| Document refresh | Run docs sync first; index only when explicitly needed. | Do not auto-run heavy GraphRAG refresh. |
| Release or handoff | Run completion check, policy checks, and quality closure. | Do not treat missing evidence as done. |

## Local-First Defaults

Zhulong defaults to local-only behavior. RAG and Graphify integrations are optional and explicit. Heavy commands such as index rebuilds, graph rebuilds, refresh runs, outbound audits, and external RAG are not hidden inside daily workflow commands.

Important defaults:

- `.planning/` stores generated project intelligence artifacts.
- `reference` mode records missing evidence as risk instead of blocking normal development.
- `strict` mode turns missing citation, stale graph, stale RAG, and policy failures into blockers.
- External RAG requires explicit opt-in.
- Generated cockpit pages are static local HTML.

## Runtime Packs

Zhulong ships command packs for coding runtimes:

| Runtime | Current Location | Rename Plan |
| --- | --- | --- |
| Codex | `runtime/codex/skills/pik-*` | Add canonical `zhulong-*` skills, keep `pik-*` wrappers. |
| Claude Code | `runtime/claude-code/skills/pik-*` | Add canonical `zhulong-*` skills and permission templates. |
| GitHub Copilot | `runtime/github-copilot/prompts/pik-*.prompt.md` | Add `zhulong-*.prompt.md` prompts and keep legacy prompts for one cycle. |

See [docs/zhulong-extraction-and-local-plan.md](docs/zhulong-extraction-and-local-plan.md) for the full rename plan.

## Documentation

| Document | Purpose |
| --- | --- |
| [Product page](docs/product.html) | Brand and product explanation. |
| [Commands](docs/commands.html) | Command reference and examples. |
| [Technical guide](docs/technical-guide.html) | Architecture, workflow, RAG, Graphify, runtime, and validation walkthrough. |
| [Quality plan](docs/quality-plan.md) | Test matrix, quality gates, and evidence standards. |
| [Rename and extraction plan](docs/zhulong-extraction-and-local-plan.md) | Screenshot extraction plus Zhulong migration plan. |
| [Runtime command packs](docs/runtime-command-packs.md) | Codex, Claude Code, and GitHub Copilot pack installation notes. |
| [Latest verification](verification/reports/latest.md) | Latest local verification report. |

## Development

```bash
npm run check
npm run verify:docs
npm run verify:docs-completeness
npm run verify:full-command-surface
```

Release-style verification:

```bash
npm run verify:quality
npm run verify:quality-closure
npm run verify:business-chain
```

Note: the current `verify:naming` script still enforces the old AI-PIKit naming rules. The Zhulong rename plan includes updating that verifier before using it as a release gate again.

## Repository Rename Checklist

When you rename the GitHub repository, use this local sequence:

```bash
cd ..
mv "Project-Intelligence-Kit " "zhulong-project-intelligence-kit"
cd "zhulong-project-intelligence-kit"
git remote set-url origin git@github.com:<owner>/zhulong-project-intelligence-kit.git
git remote -v
```

The current local folder name appears to contain a trailing space. Remove it during the rename so shell commands and GitHub paths stay clean.

## Icon

- Canonical PNG mark for README, docs, and GitHub avatar: [docs/assets/zhulong-icon.png](docs/assets/zhulong-icon.png)
- Same selected mark kept at the previous concept path for compatibility: [docs/assets/zhulong-icon-concept.png](docs/assets/zhulong-icon-concept.png)

## License

This package is currently private and does not declare a public distribution license yet. Before public release, complete the license decision and keep third-party license notes accurate.
