# Zhulong RAG Command Verification

生成时间: 2026-07-10T00:45:03.251Z

## 摘要

- 状态: PASS
- 问题数: 0

## Commands Covered

- `zl docs scan`
- `zl docs status`
- `zl docs normalize`
- `zl docs index`
- `zl docs index --run`
- `zl docs query`
- `zl docs query --rag`
- `zl docs query --backend graphrag`
- `zl-docs-scan`
- `zl-docs-status`
- `zl-docs-normalize`
- `zl-docs-index`
- `zl-docs-index --run`
- `zl-docs-query`
- `zl-docs-query --rag`

## Evidence

- zl docs scan: found documents 3
- zl docs scan: found QA-101.md
- zl docs scan: found minutes.txt
- zl docs scan: found approval.csv
- zl-docs-scan: found documents 3
- zl docs status: found Total source documents: 3
- zl-docs-status: found Total source documents: 3
- zl docs normalize: found normalized 3
- zl docs normalize: found QA-101.md
- zl-docs-normalize: found normalized 3
- zl docs query: found RAG_COMMAND_SENTINEL
- zl docs query: found QA-101.md
- zl-docs-query: found RAG_MINUTES_SENTINEL
- zl-docs-query: found minutes.txt
- zl docs index: found backend document RAG handoff
- zl docs index: found zl-docs-index --target <repo> --run
- zl-docs-index: found backend document RAG handoff
- zl docs index --run: found status success
- zl docs index --run: found FAKE_RAG_INDEX_OK
- zl docs index --run: found Status: success
- zl-docs-index --run: found status success
- zl docs query --rag: found RAG_ANSWER_SENTINEL_42420
- zl docs query --rag: found Status: success
- zl docs query --backend graphrag: found RAG_ANSWER_SENTINEL_42420
- zl-docs-query --rag: found RAG_ANSWER_SENTINEL_42420
- zl-docs-status after RAG: found RAG backend: graphrag
- zl-docs-status after RAG: found Index status: Indexed by configured RAG command

## Fixture Paths

- Work root: `/var/folders/8x/r_vcd1b9087b2z66wcry685c0000gn/T/zhulong-rag-commands-K9Vh6m`
- Project root: `/var/folders/8x/r_vcd1b9087b2z66wcry685c0000gn/T/zhulong-rag-commands-K9Vh6m/project`
- Reproduce command: `node '/Users/frigidcrow/Documents/Zhulong-Project-Intelligence-Kit/scripts/verify-rag-commands.mjs'`

## Issues

No RAG command issues found.
