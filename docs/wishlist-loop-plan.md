# Wishlist Loop Plan

Status: active loop plan  
Date: 2026-06-25

## Gold

Zhulong Project Intelligence Kit should expose **Zhulong commands** as the stable user
interface.

The user should say:

```text
$zl-debug
$zl-plan-phase
$zl-execute-phase
$zl-code-review
```

The user should not need to say:

```text
$gsd-debug
$gsd-plan-phase
$gsd-execute-phase
$gsd-code-review
```

GSD is the current workflow backend. It should remain replaceable. Future Zhulong
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

## Loop 1: Zhulong Command Facade

Status: implemented in MVP1 skeleton

Goal: make `zl-*` the public namespace.

Deliverables:

- Documentation says `zl-*` is the external command layer.
- Generated `AGENTS.md` treats `zl-*` as public commands.
- Manifest records the workflow backend and command mapping.
- CLI exposes `zl-init`, `zl-verify`, `zl-map`, `zl-docs-scan`, and
  `zl-docs-status` aliases.

Verification:

- `npm run check`
- temp-project smoke test using both `node bin/zl.mjs ...` and `zl-*` symlink
  aliases.

Result:

- `package.json` exposes `zl-init`, `zl-verify`, `zl-map`,
  `zl-docs-scan`, and `zl-docs-status`.
- `bin/zl.mjs` maps executable aliases back to the existing implementation.
- Generated manifests include `command_facade` with GSD as the current
  replaceable backend.
- Generated `AGENTS.md` documents `zl-*` as the public command layer.

## Loop 2: Context Packet Generator

Status: implemented in MVP skeleton

Goal: make Zhulong able to generate context packets before backend execution.

Possible commands:

```bash
zl-context-debug --target <repo> "<bug description>"
zl-context-execute --target <repo> "<change request>"
```

Deliverables:

- Context packet file format.
- Deterministic source reads from `.planning/STATE.md`, `.planning/knowledge/`,
  `.planning/graphs/`, and source search.
- Writeback into debug/phase records.

Result:

- `package.json` exposes `zl-context-debug` and `zl-context-execute`.
- `bin/zl.mjs` writes packets to `.planning/context/`.
- Packets include command routing, workflow state, spec context, code-map
  context, testing context, verification plan, and open risks.
- Packets still do not call semantic RAG or Graphify automatically; that belongs
  to later loops.

## Loop 3: Workflow Backend Adapter

Status: superseded by Zhulong native workflow guard

Original goal: wrap current GSD flows behind Zhulong command names.

Current position: GSD is reference design only. Zhulong now owns native
workflow contracts, guard state, handoff files, and evidence writeback.

Possible public commands:

```text
$zl-debug
$zl-plan-phase
$zl-execute-phase
$zl-code-review
```

Historical reference mapping:

```text
$zl-debug        -> $gsd-debug
$zl-plan-phase   -> $gsd-plan-phase
$zl-execute-phase -> $gsd-execute-phase
$zl-code-review  -> $gsd-code-review
```

Deliverables:

- Backend adapter documentation.
- Generated agent instructions that route `zl-*` to the configured backend.
- Optional Zhulong skills or command templates for environments that support custom
  command registration.
- Executable CLI aliases that generate context packets and backend handoff
  records:
  - `zl-debug`
  - `zl-plan-phase`
  - `zl-execute-phase`
  - `zl-code-review`
  - `zl-verify-work`

Result:

- `package.json` exposes all five workflow aliases.
- `bin/zl.mjs` generates a context packet and a backend handoff record for
  each workflow command.
- Handoffs preserve the public `zl-*` command and record the current GSD
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

- `zl-docs-normalize` handles local text-like docs (`.md`, `.txt`, `.csv`).
- `zl-docs-query` performs local keyword lookup with source citations.
- PDF/Word/Excel text extraction remains future adapter work.

Result:

- `package.json` exposes `zl-docs-normalize` and `zl-docs-query`.
- `zl-docs-normalize` writes local normalized text under
  `.planning/knowledge/normalized/`.
- `zl-docs-query` searches normalized text and returns source-path citations
  with source line numbers.
- Non-text document types remain metadata-only until a document extraction/RAG
  adapter is added.

## Loop 5: Code Map Integration

Status: implemented in MVP skeleton

Goal: make code-map evidence available to Zhulong context packets.

Deliverables:

- Graphify build/status/query facade
- stale graph warning
- impact section in context packets

MVP boundary:

- `zl-graph-status` reads local `.planning/graphs/` and `graphify-out/`
  artifacts.
- `zl-graph-query` performs local keyword lookup over graph reports and graph
  JSON nodes.
- `zl-graph-build` writes a deterministic Graphify backend handoff. It does
  not run Graphify automatically.

Result:

- `package.json` exposes `zl-graph-build`, `zl-graph-status`, and
  `zl-graph-query`.
- `bin/zl.mjs` routes those aliases through the Zhulong command facade.
- Context packets now include a `Code Map Status` section with graph artifact
  presence, node/edge counts, sync notes, and a simple stale warning.
- Smoke test proved graph status, graph query, graph build handoff,
  `zl-debug` context generation, and `zl-verify` on a temporary project.

## Loop 6: Evidence Writeback

Status: implemented in MVP skeleton

Goal: make verification output durable.

Deliverables:

- evidence record command
- phase/debug writeback templates
- rollback and risk fields

MVP boundary:

- `zl-evidence-record` writes durable Markdown records under
  `.planning/evidence/`.
- `zl-evidence-status` lists local evidence records and updates
  `.planning/evidence/INDEX.md`.
- Workflow context packets and handoffs remind agents to create evidence
  records after non-trivial verification.
- MVP1 keeps evidence as linked local records. Loop 11 adds compact writeback
  into existing issue, debug, and phase backend records.

Result:

- `package.json` exposes `zl-evidence-record` and `zl-evidence-status`.
- `.planning/evidence/` templates are generated during `zl-init`.
- Evidence records include scope, specification evidence, code-map status,
  verification command/result, remaining risk, rollback, and follow-ups.
- Smoke test proved empty status, record creation, index update, evidence file
  content, and `zl-verify` directory checks.

## Loop 7: End-to-End Validation

Status: implemented in MVP skeleton

Goal: prove a Zhulong command can drive one real development task.

Acceptance flow:

```text
$zl-debug "<bug>"
  -> context packet
  -> backend workflow
  -> implementation
  -> verification
  -> evidence writeback
```

Result:

- End-to-end MVP1 smoke validation is recorded in
  `docs/mvp1-e2e-validation.md`.
- The validation proved local spec lookup, code-map lookup, Zhulong workflow
  handoff, durable evidence writeback, and `zl-verify` in one temporary
  project.
- The workflow still uses a backend handoff instead of native chat-runtime
  command registration. That remains outside the MVP1 skeleton.

## Post-MVP1 Loops

Status: open

## Loop 8: Codex Runtime Command Pack

Status: implemented for Codex

Goal: make Zhulong commands available inside Codex as native skills, not only as
shell aliases.

Deliverables:

- Codex skill pack for `zl-debug`, `zl-plan-phase`, `zl-execute-phase`,
  `zl-code-review`, and `zl-verify-work`.
- Runtime installer/status commands.
- Manifest/schema support for runtime command pack status.
- Documentation for installed command behavior and remaining runtime gaps.

Result:

- `runtime/codex/skills/` contains five valid Codex skills.
- `zl-runtime-install --runtime codex --dest <skills_dir>` renders and installs
  the skill pack.
- `zl-runtime-status --runtime codex --dest <skills_dir>` reports installed
  and rendered skills.
- Smoke test installed into a temporary skills directory and verified that
  `{{ZL_CLI}}` rendered to the absolute local Zhulong CLI command.

## Loop 9: Direct Graphify Build/Diff Adapter

Status: implemented

Goal: let Zhulong refresh and diff code-map artifacts directly through `zl-*`,
while keeping handoff mode for cautious projects.

Deliverables:

- `zl-graph-build --run` direct execution path.
- `zl-graph-diff` graph baseline comparison.
- Build and diff result artifacts under `.planning/graphs/`.
- Config/schema fields for graph baseline, build result, and diff result paths.
- Documentation that Graphify remains the backend and `zl-*` remains the
  public interface.

Result:

- `zl-graph-build` still writes `GRAPH_BUILD_HANDOFF.md` by default.
- `zl-graph-build --run` executes the configured update command, syncs
  `graphify-out/graph.json` and `graphify-out/GRAPH_REPORT.md` into
  `.planning/graphs/`, and writes `GRAPH_BUILD_RESULT.md`.
- `zl-graph-diff` compares `.planning/graphs/graph.baseline.json` with the
  current `.planning/graphs/graph.json` and writes `GRAPH_DIFF.md`.
- Smoke test used a fake Graphify command to prove direct build, artifact sync,
  diff output, and query against the refreshed graph.

## Loop 10: Configurable Document RAG Adapter

Status: implemented

Goal: let Zhulong index and query document RAG backends through `zl-*`, while
keeping local keyword lookup and handoff mode as the safe defaults.

Deliverables:

- `zl-docs-index` handoff mode.
- `zl-docs-index --run` direct configured RAG index execution.
- `zl-docs-query --rag` direct configured RAG query execution.
- RAG result artifacts under `.planning/knowledge/`.
- Config/schema fields for document RAG commands and result paths.
- Runtime command guidance for using document RAG only when approved.

Result:

- `zl-docs-index` writes `.planning/knowledge/RAG_INDEX_HANDOFF.md` by default.
- `zl-docs-index --run` executes the configured index command and writes
  `.planning/knowledge/RAG_INDEX_RESULT.md`.
- `zl-docs-query --rag` executes the configured query command and writes
  `.planning/knowledge/RAG_QUERY_RESULT.md`.
- `zl-docs-query` without `--rag` remains local normalized keyword search.
- Smoke test used fake RAG index/query commands to prove handoff, direct index,
  direct query, status update, and result artifacts.

## Loop 11: Evidence Backend Writeback

Status: implemented

Goal: link durable Zhulong evidence records back into active backend issue, debug,
or phase records.

Deliverables:

- `zl-evidence-record --writeback <record>` appends a compact evidence summary
  to an existing backend record.
- `--issue`, `--debug`, and `--phase` shortcuts resolve existing records when
  possible.
- Evidence still keeps a full standalone record under `.planning/evidence/`.
- Manifest/config/schema record allowed writeback target roots.
- Runtime skills instruct Codex to write evidence back to active records.

Result:

- Evidence writeback appends an `Zhulong Evidence Writeback` section containing the
  evidence link, summary, command, result, risk, and rollback.
- Writeback targets are constrained to project-local paths.
- Smoke test proved standalone evidence creation plus writeback into issue,
  debug, and phase records.

## Loop 12: Japanese Document-Heavy Fixture

Status: implemented

Goal: prove Zhulong against a realistic Japanese document-heavy maintenance task,
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
  `zl-init`, `zl-verify`, `zl-docs-scan`, `zl-docs-normalize`,
  `zl-docs-index --run`, local document query, RAG query,
  `zl-graph-build --run`, graph query, graph diff, tests, and evidence
  writeback.
- The CR-017 acceptance test fails before the implementation and passes after
  the scripted temp-project change.
- The graph diff captures the change from `PROXY_APPROVAL_LIMIT=50000` to
  `PROXY_APPROVAL_LIMIT=30000`.
- The seeded issue receives an `Zhulong Evidence Writeback` section after
  verification.

## Loop 13: Claude Code and GitHub Copilot Runtime Packs

Status: implemented

Goal: make `zl-*` available inside the user's other coding runtimes, while
keeping GSD as a replaceable backend rather than the public command name.

Deliverables:

- Claude Code skills under `runtime/claude-code/skills/`.
- GitHub Copilot prompt files under `runtime/github-copilot/prompts/`.
- `zl-runtime-install` and `zl-runtime-status` support for `codex`,
  `claude-code`, and `github-copilot`.
- Manifest/schema/docs updated for `skills_path` and `prompts_path`.

Result:

- Claude Code can install `/zl-debug`, `/zl-plan-phase`,
  `/zl-execute-phase`, `/zl-code-review`, and `/zl-verify-work` as skills.
- GitHub Copilot can install matching slash prompt files into
  `.github/prompts/`.
- Codex support remains intact.
- All runtime packs render the local Zhulong CLI path and instruct the agent to
  gather context, check specifications, check code maps, verify, and write back
  evidence.

## Remaining Post-MVP1 Work

Status: closed for this wishlist

Remaining wishlist work:

- No known wishlist item remains open after Loop 13.
