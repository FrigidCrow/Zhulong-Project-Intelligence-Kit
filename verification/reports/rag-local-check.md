# Zhulong Local GraphRAG Verification

生成时间: 2026-07-10T00:45:27.023Z

## 摘要

- 状态: PASS
- 问题数: 0

## Local Profile

- LLM: `qwen2.5:7b`
- Embedding: `bge-m3`
- Provider: `ollama`
- API base: `http://127.0.0.1:11434`
- Vector store: `lancedb`
- External API key: not required
- Index timeout: 300000ms
- Query timeout: 90000ms

## Evidence

- ollama model present: qwen2.5:7b
- ollama model present: bge-m3
- local settings: file exists graphrag-workspace/settings.yaml
- local settings: found model_provider: ollama
- local settings: file exists graphrag-workspace/settings.yaml
- local settings: found api_base: http://127.0.0.1:11434
- local settings: file exists graphrag-workspace/settings.yaml
- local settings: found workflows:
- local settings: file exists graphrag-workspace/settings.yaml
- local settings: found generate_text_embeddings
- local settings: file exists graphrag-workspace/settings.yaml
- local settings: does not contain model_provider: openai
- local settings: file exists graphrag-workspace/settings.yaml
- local settings: does not contain GRAPHRAG_API_KEY
- local settings: graphrag-workspace/.env absent
- zl-privacy-audit before index: found privacy audit PASS
- zl docs index --run local: found status success
- RAG_INDEX_RESULT: file exists .planning/knowledge/RAG_INDEX_RESULT.md
- RAG_INDEX_RESULT: found Status: success
- zl docs query --rag local: found 42,420
- RAG_QUERY_RESULT: file exists .planning/knowledge/RAG_QUERY_RESULT.md
- RAG_QUERY_RESULT: found Status: success
- RAG_QUERY_RESULT: file exists .planning/knowledge/RAG_QUERY_RESULT.md
- RAG_QUERY_RESULT: found 42,420
- RAG_QUERY_RESULT: file exists .planning/knowledge/RAG_QUERY_RESULT.md
- RAG_QUERY_RESULT: found Data: Sources
- zl-privacy-audit after query: found privacy audit PASS
- PRIVACY_AUDIT: file exists .planning/knowledge/PRIVACY_AUDIT.md
- PRIVACY_AUDIT: found Status: PASS
- secret/external scan: no sk-* tokens or external URLs in fixture project
- negative privacy audit: found privacy audit FAIL
- negative privacy audit: found external URL
- negative privacy audit: external provider rejected
- negative RAG query guard: found status failed
- negative RAG query guard: file exists ../unsafe-project/.planning/knowledge/RAG_QUERY_RESULT.md
- negative RAG query guard: found Privacy audit: failed
- negative RAG query guard: unsafe query blocked before external execution

## Fixture Paths

- Work root: `/var/folders/8x/r_vcd1b9087b2z66wcry685c0000gn/T/zhulong-rag-local-cmwrFQ`
- Project root: `/var/folders/8x/r_vcd1b9087b2z66wcry685c0000gn/T/zhulong-rag-local-cmwrFQ/project`
- Reproduce command: `node '/Users/frigidcrow/Documents/Zhulong-Project-Intelligence-Kit/scripts/verify-rag-local.mjs'`

## Issues

No local GraphRAG issues found.
