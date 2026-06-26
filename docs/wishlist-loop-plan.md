# Wishlist Loop Plan

Status: active loop plan  
Date: 2026-06-25

## Gold

AI Project Intelligence Kit should expose **AI-PIKit commands** as the stable user
interface.

The user should say:

```text
$pik-debug
$pik-plan-phase
$pik-execute-phase
$pik-code-review
```

The user should not need to say:

```text
$gsd-debug
$gsd-plan-phase
$gsd-execute-phase
$gsd-code-review
```

GSD is the current workflow backend. It should remain replaceable. Future AI-PIKit
versions may swap the workflow backend without changing the user-facing command
namespace.

## Loop Method

Each loop follows:

```text
plan
  -> implement
  -> verify
  -> record evidence
  -> update next loop
```

The loop stops only when the wishlist is satisfied or a blocking dependency is
explicitly recorded.

## Loop 1: AI-PIKit Command Facade

Status: implemented in MVP1 skeleton

Goal: make `pik-*` the public namespace.

Deliverables:

- Documentation says `pik-*` is the external command layer.
- Generated `AGENTS.md` treats `pik-*` as public commands.
- Manifest records the workflow backend and command mapping.
- CLI exposes `pik-init`, `pik-verify`, `pik-map`, `pik-docs-scan`, and
  `pik-docs-status` aliases.

Verification:

- `npm run check`
- temp-project smoke test using both `node bin/pik.mjs ...` and `pik-*` symlink
  aliases.

Result:

- `package.json` exposes `pik-init`, `pik-verify`, `pik-map`,
  `pik-docs-scan`, and `pik-docs-status`.
- `bin/pik.mjs` maps executable aliases back to the existing implementation.
- Generated manifests include `command_facade` with GSD as the current
  replaceable backend.
- Generated `AGENTS.md` documents `pik-*` as the public command layer.

## Loop 2: Context Packet Generator

Status: implemented in MVP skeleton

Goal: make AI-PIKit able to generate context packets before backend execution.

Possible commands:

```bash
pik-context-debug --target <repo> "<bug description>"
pik-context-execute --target <repo> "<change request>"
```

Deliverables:

- Context packet file format.
- Deterministic source reads from `.planning/STATE.md`, `.planning/knowledge/`,
  `.planning/graphs/`, and source search.
- Writeback into debug/phase records.

Result:

- `package.json` exposes `pik-context-debug` and `pik-context-execute`.
- `bin/pik.mjs` writes packets to `.planning/context/`.
- Packets include command routing, workflow state, spec context, code-map
  context, testing context, verification plan, and open risks.
- Packets still do not call semantic RAG or Graphify automatically; that belongs
  to later loops.

## Loop 3: Workflow Backend Adapter

Status: superseded by AI-PIKit native workflow guard

Original goal: wrap current GSD flows behind AI-PIKit command names.

Current position: GSD is reference design only. AI-PIKit now owns native
workflow contracts, guard state, handoff files, and evidence writeback.

Possible public commands:

```text
$pik-debug
$pik-plan-phase
$pik-execute-phase
$pik-code-review
```

Historical reference mapping:

```text
$pik-debug        -> $gsd-debug
$pik-plan-phase   -> $gsd-plan-phase
$pik-execute-phase -> $gsd-execute-phase
$pik-code-review  -> $gsd-code-review
```

Deliverables:

- Backend adapter documentation.
- Generated agent instructions that route `pik-*` to the configured backend.
- Optional AI-PIKit skills or command templates for environments that support custom
  command registration.
- Executable CLI aliases that generate context packets and backend handoff
  records:
  - `pik-debug`
  - `pik-plan-phase`
  - `pik-execute-phase`
  - `pik-code-review`
  - `pik-verify-work`

Result:

- `package.json` exposes all five workflow aliases.
- `bin/pik.mjs` generates a context packet and a backend handoff record for
  each workflow command.
- Handoffs preserve the public `pik-*` command and record the current GSD
  backend invocation.
- The CLI does not execute chat-runtime skills directly. Later loops add native
  runtime command packs for Codex, Claude Code, and GitHub Copilot.

## Loop 4: Spec Context Indexing

Status: implemented in MVP skeleton

Goal: turn scanned document sources into queryable spec context.

Deliverables:

- normalized text workspace
- GraphRAG or other RAG adapter hook
- source citation requirements
- glossary-aware query guidance

MVP boundary:

- `pik-docs-normalize` handles local text-like docs (`.md`, `.txt`, `.csv`).
- `pik-docs-query` performs local keyword lookup with source citations.
- PDF/Word/Excel text extraction remains future adapter work.

Result:

- `package.json` exposes `pik-docs-normalize` and `pik-docs-query`.
- `pik-docs-normalize` writes local normalized text under
  `.planning/knowledge/normalized/`.
- `pik-docs-query` searches normalized text and returns source-path citations
  with source line numbers.
- Non-text document types remain metadata-only until a document extraction/RAG
  adapter is added.

## Loop 5: Code Map Integration

Status: implemented in MVP skeleton

Goal: make code-map evidence available to AI-PIKit context packets.

Deliverables:

- Graphify build/status/query facade
- stale graph warning
- impact section in context packets

MVP boundary:

- `pik-graph-status` reads local `.planning/graphs/` and `graphify-out/`
  artifacts.
- `pik-graph-query` performs local keyword lookup over graph reports and graph
  JSON nodes.
- `pik-graph-build` writes a deterministic Graphify backend handoff. It does
  not run Graphify automatically.

Result:

- `package.json` exposes `pik-graph-build`, `pik-graph-status`, and
  `pik-graph-query`.
- `bin/pik.mjs` routes those aliases through the AI-PIKit command facade.
- Context packets now include a `Code Map Status` section with graph artifact
  presence, node/edge counts, sync notes, and a simple stale warning.
- Smoke test proved graph status, graph query, graph build handoff,
  `pik-debug` context generation, and `pik-verify` on a temporary project.

## Loop 6: Evidence Writeback

Status: implemented in MVP skeleton

Goal: make verification output durable.

Deliverables:

- evidence record command
- phase/debug writeback templates
- rollback and risk fields

MVP boundary:

- `pik-evidence-record` writes durable Markdown records under
  `.planning/evidence/`.
- `pik-evidence-status` lists local evidence records and updates
  `.planning/evidence/INDEX.md`.
- Workflow context packets and handoffs remind agents to create evidence
  records after non-trivial verification.
- MVP1 keeps evidence as linked local records. Loop 11 adds compact writeback
  into existing issue, debug, and phase backend records.

Result:

- `package.json` exposes `pik-evidence-record` and `pik-evidence-status`.
- `.planning/evidence/` templates are generated during `pik-init`.
- Evidence records include scope, specification evidence, code-map status,
  verification command/result, remaining risk, rollback, and follow-ups.
- Smoke test proved empty status, record creation, index update, evidence file
  content, and `pik-verify` directory checks.

## Loop 7: End-to-End Validation

Status: implemented in MVP skeleton

Goal: prove an AI-PIKit command can drive one real development task.

Acceptance flow:

```text
$pik-debug "<bug>"
  -> context packet
  -> backend workflow
  -> implementation
  -> verification
  -> evidence writeback
```

Result:

- End-to-end MVP1 smoke validation is recorded in
  `docs/mvp1-e2e-validation.md`.
- The validation proved local spec lookup, code-map lookup, AI-PIKit workflow
  handoff, durable evidence writeback, and `pik-verify` in one temporary
  project.
- The workflow still uses a backend handoff instead of native chat-runtime
  command registration. That remains outside the MVP1 skeleton.

## Post-MVP1 Loops

Status: open

## Loop 8: Codex Runtime Command Pack

Status: implemented for Codex

Goal: make AI-PIKit commands available inside Codex as native skills, not only as
shell aliases.

Deliverables:

- Codex skill pack for `pik-debug`, `pik-plan-phase`, `pik-execute-phase`,
  `pik-code-review`, and `pik-verify-work`.
- Runtime installer/status commands.
- Manifest/schema support for runtime command pack status.
- Documentation for installed command behavior and remaining runtime gaps.

Result:

- `runtime/codex/skills/` contains five valid Codex skills.
- `pik-runtime-install --runtime codex --dest <skills_dir>` renders and installs
  the skill pack.
- `pik-runtime-status --runtime codex --dest <skills_dir>` reports installed
  and rendered skills.
- Smoke test installed into a temporary skills directory and verified that
  `{{PIK_CLI}}` rendered to the absolute local AI-PIKit CLI command.

## Loop 9: Direct Graphify Build/Diff Adapter

Status: implemented

Goal: let AI-PIKit refresh and diff code-map artifacts directly through `pik-*`,
while keeping handoff mode for cautious projects.

Deliverables:

- `pik-graph-build --run` direct execution path.
- `pik-graph-diff` graph baseline comparison.
- Build and diff result artifacts under `.planning/graphs/`.
- Config/schema fields for graph baseline, build result, and diff result paths.
- Documentation that Graphify remains the backend and `pik-*` remains the
  public interface.

Result:

- `pik-graph-build` still writes `GRAPH_BUILD_HANDOFF.md` by default.
- `pik-graph-build --run` executes the configured update command, syncs
  `graphify-out/graph.json` and `graphify-out/GRAPH_REPORT.md` into
  `.planning/graphs/`, and writes `GRAPH_BUILD_RESULT.md`.
- `pik-graph-diff` compares `.planning/graphs/graph.baseline.json` with the
  current `.planning/graphs/graph.json` and writes `GRAPH_DIFF.md`.
- Smoke test used a fake Graphify command to prove direct build, artifact sync,
  diff output, and query against the refreshed graph.

## Loop 10: Configurable Document RAG Adapter

Status: implemented

Goal: let AI-PIKit index and query document RAG backends through `pik-*`, while
keeping local keyword lookup and handoff mode as the safe defaults.

Deliverables:

- `pik-docs-index` handoff mode.
- `pik-docs-index --run` direct configured RAG index execution.
- `pik-docs-query --rag` direct configured RAG query execution.
- RAG result artifacts under `.planning/knowledge/`.
- Config/schema fields for document RAG commands and result paths.
- Runtime command guidance for using document RAG only when approved.

Result:

- `pik-docs-index` writes `.planning/knowledge/RAG_INDEX_HANDOFF.md` by default.
- `pik-docs-index --run` executes the configured index command and writes
  `.planning/knowledge/RAG_INDEX_RESULT.md`.
- `pik-docs-query --rag` executes the configured query command and writes
  `.planning/knowledge/RAG_QUERY_RESULT.md`.
- `pik-docs-query` without `--rag` remains local normalized keyword search.
- Smoke test used fake RAG index/query commands to prove handoff, direct index,
  direct query, status update, and result artifacts.

## Loop 11: Evidence Backend Writeback

Status: implemented

Goal: link durable AI-PIKit evidence records back into active backend issue, debug,
or phase records.

Deliverables:

- `pik-evidence-record --writeback <record>` appends a compact evidence summary
  to an existing backend record.
- `--issue`, `--debug`, and `--phase` shortcuts resolve existing records when
  possible.
- Evidence still keeps a full standalone record under `.planning/evidence/`.
- Manifest/config/schema record allowed writeback target roots.
- Runtime skills instruct Codex to write evidence back to active records.

Result:

- Evidence writeback appends an `AI-PIKit Evidence Writeback` section containing the
  evidence link, summary, command, result, risk, and rollback.
- Writeback targets are constrained to project-local paths.
- Smoke test proved standalone evidence creation plus writeback into issue,
  debug, and phase records.

## Loop 12: Japanese Document-Heavy Fixture

Status: implemented

Goal: prove AI-PIKit against a realistic Japanese document-heavy maintenance task,
not only synthetic command smoke tests.

Deliverables:

- `examples/japanese-doc-dev-fixture/` with Japanese specification, QA,
  meeting minutes, design notes, test specification, source code, and tests.
- Reproducible CR-017 task where the inherited code keeps a 50,000円 proxy
  approval limit but the latest QA/minutes require 30,000円.
- Fixture-local fake document RAG adapter and fake Graphify adapter.
- Seed issue and phase records for evidence writeback.
- `npm run fixture:japanese` validation script.

Result:

- The validation script copies the fixture to a temporary project and runs
  `pik-init`, `pik-verify`, `pik-docs-scan`, `pik-docs-normalize`,
  `pik-docs-index --run`, local document query, RAG query,
  `pik-graph-build --run`, graph query, graph diff, tests, and evidence
  writeback.
- The CR-017 acceptance test fails before the implementation and passes after
  the scripted temp-project change.
- The graph diff captures the change from `PROXY_APPROVAL_LIMIT=50000` to
  `PROXY_APPROVAL_LIMIT=30000`.
- The seeded issue receives an `AI-PIKit Evidence Writeback` section after
  verification.

## Loop 13: Claude Code and GitHub Copilot Runtime Packs

Status: implemented

Goal: make `pik-*` available inside the user's other coding runtimes, while
keeping GSD as a replaceable backend rather than the public command name.

Deliverables:

- Claude Code skills under `runtime/claude-code/skills/`.
- GitHub Copilot prompt files under `runtime/github-copilot/prompts/`.
- `pik-runtime-install` and `pik-runtime-status` support for `codex`,
  `claude-code`, and `github-copilot`.
- Manifest/schema/docs updated for `skills_path` and `prompts_path`.

Result:

- Claude Code can install `/pik-debug`, `/pik-plan-phase`,
  `/pik-execute-phase`, `/pik-code-review`, and `/pik-verify-work` as skills.
- GitHub Copilot can install matching slash prompt files into
  `.github/prompts/`.
- Codex support remains intact.
- All runtime packs render the local AI-PIKit CLI path and instruct the agent to
  gather context, check specifications, check code maps, verify, and write back
  evidence.

## Remaining Post-MVP1 Work

Status: closed for this wishlist

Remaining wishlist work:

- No known wishlist item remains open after Loop 13.
