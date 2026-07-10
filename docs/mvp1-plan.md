# MVP1 Plan: Zhulong Command Facade and Context

Status: planned  
Date: 2026-06-25  
Mode: MVP vertical slice

## Objective

MVP1 turns Zhulong Project Intelligence Kit from a template-only prototype into a
usable AI engineering context kit for document-heavy development projects.

The user should invoke Zhulong commands such as `$zl-debug` and
`$zl-execute-phase`. Zhulong's role is to make generated project instructions and
local artifacts guide those commands through a consistent context protocol while
the current backend may still map to GSD:

```text
GSD task state
  -> specification / QA / minutes context
  -> Graphify code map and impact context
  -> execution plan
  -> implementation
  -> verification
  -> evidence writeback
```

## Scope

MVP1 includes:

- revised project positioning in `README.md`
- generated `AGENTS.md` protocol for Zhulong public commands
- `.planning/knowledge/` templates for specification context
- manifest/config fields for agent runtime, spec context, code map, and evidence loop
- `zl-docs-scan` and `zl-docs-status` commands
- end-to-end verification with a temporary target project

MVP1 does not include:

- real GraphRAG indexing
- real Graphify build/query wrappers
- direct patching or forking of installed GSD skills
- Office/PDF text extraction
- automatic insertion into live `$zl-debug` backend internals

## Plan

### Task 1: Product Positioning

<read_first>

- `README.md`
- `docs/wishlist.md`

</read_first>

<action>

Update `README.md` so Zhulong is described as an AI engineering context kit for
document-heavy development. Replace the old `GraphRAG + Graphify + GSD` center
with a GSD-command-centered flow enhanced by spec context, Graphify code maps,
verification evidence, and Claude Code / Copilot / Codex usage.

</action>

<acceptance_criteria>

- `README.md` contains `AI Engineering Context Kit`.
- `README.md` includes the Zhulong native workflow flow with GraphRAG and Graphify enhancement gates.
- `README.md` names Claude Code, GitHub Copilot, and Codex.
- `README.md` states that GraphRAG is an adapter for spec context, not the whole product.

</acceptance_criteria>

### Task 2: Generated Agent Protocol

<read_first>

- `core/AGENTS.template.md`
- `docs/wishlist.md`
- `<home>/.codex/skills/gsd-debug/SKILL.md`

</read_first>

<action>

Update `core/AGENTS.template.md` so generated agent instructions define a
Zhulong command facade protocol. Agents should first read workflow state, then
check `.planning/knowledge/` and spec context, then check Graphify/code-map
evidence before risky edits, then verify and write evidence back.

</action>

<acceptance_criteria>

- `core/AGENTS.template.md` contains `Zhulong Command Facade`.
- The protocol explicitly mentions `$zl-debug` and `$zl-execute-phase`.
- The protocol names Claude Code, GitHub Copilot, and Codex as execution environments.
- The protocol requires source verification and evidence writeback.

</acceptance_criteria>

### Task 3: Knowledge Workspace Templates

<read_first>

- `core/planning/PROJECT.template.md`
- `core/planning/STATE.template.md`
- `core/planning/config.template.json`

</read_first>

<action>

Add `.planning/knowledge/` templates for document-heavy development:
`README.md`, `RAG_SOURCES.md`, `DOC_RAG_STATUS.md`, `GLOSSARY.md`, and
`REQUIREMENT_TRACE.md`. Update project/state/config templates to reference the
knowledge workspace.

</action>

<acceptance_criteria>

- `core/planning/knowledge/README.template.md` exists.
- `core/planning/knowledge/RAG_SOURCES.template.md` exists.
- `core/planning/knowledge/DOC_RAG_STATUS.template.md` exists.
- `core/planning/knowledge/GLOSSARY.template.md` exists.
- `core/planning/knowledge/REQUIREMENT_TRACE.template.md` exists.
- Generated `.planning/PROJECT.md` and `.planning/STATE.md` mention `.planning/knowledge/`.

</acceptance_criteria>

### Task 4: Manifest and Schema

<read_first>

- `core/project.manifest.yml.template`
- `schemas/project.manifest.schema.json`
- `examples/brownfield-monorepo/manifest.example.yml`

</read_first>

<action>

Add `execution_runtime`, `spec_context`, `code_map`, and `evidence_loop`
sections. Keep existing `knowledge.graphify` and `knowledge.graphrag` for
backward compatibility during MVP1.

</action>

<acceptance_criteria>

- `core/project.manifest.yml.template` lists Claude Code, GitHub Copilot, and Codex.
- `spec_context.source_paths` includes document-heavy project defaults.
- `code_map.provider` defaults to `graphify`.
- `evidence_loop.require_source_citation` and `require_test_record` are present.
- `schemas/project.manifest.schema.json` accepts the new top-level sections.

</acceptance_criteria>

### Task 5: CLI Docs Scan/Status

<read_first>

- `bin/zl.mjs`
- `core/planning/knowledge/RAG_SOURCES.template.md`
- `core/planning/knowledge/DOC_RAG_STATUS.template.md`

</read_first>

<action>

Add `zl-docs-scan --target <repo>` and `zl-docs-status --target <repo>`.
The scan command should find common project document formats under likely
document directories, write `.planning/knowledge/RAG_SOURCES.md`, and write
`.planning/knowledge/DOC_RAG_STATUS.md`. The status command should summarize
the latest scan if present.

</action>

<acceptance_criteria>

- `zl-docs-scan --target <tmp>` exits 0 after `zl-init`.
- `zl-docs-status --target <tmp>` exits 0 after scan.
- `RAG_SOURCES.md` includes discovered `.md`, `.txt`, `.csv`, `.pdf`, `.docx`, or `.xlsx` files.
- `DOC_RAG_STATUS.md` includes total document count and generation timestamp.
- `npm run check` passes.

</acceptance_criteria>

## Verification

Run:

```bash
npm run check
```

Then run an end-to-end smoke test in a temporary directory:

```bash
zl-init --target <tmp> --template brownfield-monorepo --name mvp1_test
zl-docs-scan --target <tmp>
zl-docs-status --target <tmp>
zl-graph-status --target <tmp>
zl-evidence-status --target <tmp>
zl-verify --target <tmp>
```

## Risks

- The MVP does not yet install real `$zl-debug` skills in every runtime. It
  relies on generated agent instructions, command mapping, and project artifacts.
- Document scanning is metadata-only in MVP1; it does not extract Office/PDF text.
- GraphRAG and direct Graphify execution remain adapter concepts until later
  milestones. MVP1 exposes local `zl-docs-*` and `zl-graph-*` helpers plus
  backend handoff records.

## MVP1 Success Criteria

- A new target project initialized by Zhulong has a visible knowledge workspace.
- Generated agent instructions explain how normal Zhulong commands should consume
  spec context, code maps, and evidence.
- Zhulong can produce a first document-source inventory for document-heavy projects.
- Zhulong can create local code-map status/query handoffs and durable evidence
  records through `zl-*` commands.
- The existing CLI still passes syntax and smoke verification.
