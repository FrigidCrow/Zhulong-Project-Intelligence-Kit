# Extraction Map

This file records how the first version was extracted from a concrete working
practice into a reusable template.

## Extracted As Generic

| Original practice | Generic Zhulong concept |
| --- | --- |
| Local AGENTS rules | `core/AGENTS.template.md` |
| `.planning/PROJECT.md` | durable project memory |
| `.planning/STATE.md` | resumable work state |
| `.planning/issues/ISSUE_TEMPLATE.md` | issue record schema |
| Graphify before code edits | Graphify adapter workflow contract |
| GraphRAG before business-flow claims | GraphRAG adapter workflow contract |
| Source verification after graph/RAG | source-search adapter |
| Focused tests after edits | verification adapter |
| Local-only graph/RAG/planning artifacts | manifest privacy policy |

## Removed During Extraction

- Product names and business domain details.
- Repository remote and user-specific Git identity.
- Server IPs, deployment credentials, and local runbooks.
- Concrete issue evidence, screenshots, and vendor documents.
- Project-specific subsystem names.
- Generated graph data.

## Kept As Optional Examples

- Brownfield monorepo template.
- Graph-backed analysis before edits.
- RAG-backed business context before broad claims.
- Local-only intelligence artifacts.

## Imported Field Notes

- `docs/field-notes/gsd-graphify-graphrag-sop.md`: original long-form Chinese
  SOP and lessons learned for combining GSD, Graphify, and GraphRAG.

