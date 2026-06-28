# AI-PIKit RAG Command Verification

生成时间: 2026-06-28T10:21:34.373Z

## 摘要

- 状态: PASS
- 问题数: 0

## Commands Covered

- `pik docs scan`
- `pik docs status`
- `pik docs normalize`
- `pik docs index`
- `pik docs index --run`
- `pik docs query`
- `pik docs query --rag`
- `pik docs query --backend graphrag`
- `pik-docs-scan`
- `pik-docs-status`
- `pik-docs-normalize`
- `pik-docs-index`
- `pik-docs-index --run`
- `pik-docs-query`
- `pik-docs-query --rag`

## Evidence

- pik docs scan: found documents 3
- pik docs scan: found QA-101.md
- pik docs scan: found minutes.txt
- pik docs scan: found approval.csv
- pik-docs-scan: found documents 3
- pik docs status: found Total source documents: 3
- pik-docs-status: found Total source documents: 3
- pik docs normalize: found normalized 3
- pik docs normalize: found QA-101.md
- pik-docs-normalize: found normalized 3
- pik docs query: found RAG_COMMAND_SENTINEL
- pik docs query: found QA-101.md
- pik-docs-query: found RAG_MINUTES_SENTINEL
- pik-docs-query: found minutes.txt
- pik docs index: found backend document RAG handoff
- pik docs index: found pik-docs-index --target <repo> --run
- pik-docs-index: found backend document RAG handoff
- pik docs index --run: found status success
- pik docs index --run: found FAKE_RAG_INDEX_OK
- pik docs index --run: found Status: success
- pik-docs-index --run: found status success
- pik docs query --rag: found RAG_ANSWER_SENTINEL_42420
- pik docs query --rag: found Status: success
- pik docs query --backend graphrag: found RAG_ANSWER_SENTINEL_42420
- pik-docs-query --rag: found RAG_ANSWER_SENTINEL_42420
- pik-docs-status after RAG: found RAG backend: graphrag
- pik-docs-status after RAG: found Index status: Indexed by configured RAG command

## Fixture Paths

- Work root: `/var/folders/8x/r_vcd1b9087b2z66wcry685c0000gn/T/aipikit-rag-commands-3tCvX6`
- Project root: `/var/folders/8x/r_vcd1b9087b2z66wcry685c0000gn/T/aipikit-rag-commands-3tCvX6/project`
- Reproduce command: `node '/Users/frigidcrow/Documents/Project-Intelligence-Kit /scripts/verify-rag-commands.mjs'`

## Issues

No RAG command issues found.
