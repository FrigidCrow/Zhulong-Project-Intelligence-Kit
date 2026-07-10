# Zhulong Init Policy Verification

生成时间: 2026-07-10T03:50:55.078Z

## 摘要

- 状态: PASS
- 问题数: 0

## 覆盖场景

- default `reference + rag none + local_only`
- `strict + rag none` hard fail
- external RAG requires `--allow-external-rag`
- `strict + rag local + setup-rag skip` writes local setup plan without heavy refresh
- `docs-reference` / `docs-strict` aliases map to compatible internal profiles
- interactive `zl-init --interactive` prompts project type, document policy, RAG backend, and setup mode
- `rag none` blocks `zl-docs-index --run` and `zl-docs-query --rag`

## 证据

- zl init --target <tmp>/zhulong-init-policy-apWjI4/reference-none --template greenfield-app --name reference_none --mode new --force: exit 0
- default init policy: found Document policy: reference
- default init rag: found RAG backend: none
- default init heavy: found Heavy refresh executed: no
- default config document_policy: document_policy is reference
- default config rag_backend: rag_backend is none
- default config profile: profile is graph-lite
- default config spec disabled: spec_context disabled
- default config graphrag disabled: graphrag disabled
- default INIT_PROFILE: found RAG backend: `none`
- default no graphrag workspace: path absent reference-none/graphrag-workspace/settings.yaml
- zl mode status --target <tmp>/zhulong-init-policy-apWjI4/reference-none: exit 0
- default mode document policy: found Document policy: reference
- default mode rag backend: found RAG backend: none
- default mode internal profile: found Internal profile: graph-lite
- zl docs index --target <tmp>/zhulong-init-policy-apWjI4/reference-none --run: exit 1
- rag none index blocked: found RAG backend disabled
- rag none index report: found RAG backend disabled
- zl docs query --target <tmp>/zhulong-init-policy-apWjI4/reference-none --rag INIT_POLICY_SENTINEL: exit 1
- rag none query blocked: found RAG backend disabled
- zl init --target <tmp>/zhulong-init-policy-apWjI4/strict-none --doc-policy strict --rag none --force: exit 1
- strict none rejected: found strict requires --rag local or --rag external
- zl init --target <tmp>/zhulong-init-policy-apWjI4/external-blocked --doc-policy strict --rag external --force: exit 1
- external without opt-in rejected: found External RAG is disabled by default
- zl init --target <tmp>/zhulong-init-policy-apWjI4/external-allowed --doc-policy strict --rag external --allow-external-rag --force: exit 0
- external opt-in init: found RAG backend: external
- external opt-in config: external rag opt-in recorded
- external risk report: found project document content
- zl init --target <tmp>/zhulong-init-policy-apWjI4/strict-local --template brownfield-monorepo --mode existing --doc-policy strict --rag local --setup-rag skip --force: exit 0
- strict local init: found Document policy: strict
- strict local rag: found RAG backend: local
- strict local config: strict local policy recorded
- strict local models: default local models recorded
- strict local provider: local GraphRAG provider configured
- strict local setup plan: found Heavy refresh executed: no
- zl mode status --target <tmp>/zhulong-init-policy-apWjI4/strict-local: exit 0
- strict local mode status: found Document policy: strict
- strict local mode profile: found Internal profile: full-strict
- zl init --target <tmp>/zhulong-init-policy-apWjI4/mode-aliases --doc-policy reference --rag none --force: exit 0
- zl mode set --target <tmp>/zhulong-init-policy-apWjI4/mode-aliases docs-strict: exit 0
- mode set docs-strict: found Document policy: strict
- mode set docs-strict backend: found RAG backend: local
- mode set docs-strict profile: found Internal profile: full-strict
- mode strict config: docs-strict maps to strict/local
- zl mode set --target <tmp>/zhulong-init-policy-apWjI4/mode-aliases docs-reference: exit 0
- mode set docs-reference: found Document policy: reference
- mode set docs-reference profile: found Internal profile: graph-lite
- mode reference config: docs-reference maps to graph-lite
- zl init --target <tmp>/zhulong-init-policy-apWjI4/interactive-wizard --interactive --force <interactive>: exit 0
- interactive wizard banner: found Zhulong init wizard
- interactive project prompt: found Project type
- interactive policy output: found Document policy: strict
- interactive rag output: found RAG backend: local
- interactive config mode: interactive wizard records strict/local
- interactive init profile: found Mode: new
- interactive local setup plan: found Setup mode: `skip`

## 复现

- `node '<kit-root>/scripts/verify-init-policy.mjs'`

## 问题

未发现 init policy 断链。
