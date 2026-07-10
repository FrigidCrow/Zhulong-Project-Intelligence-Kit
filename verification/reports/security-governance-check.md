# Zhulong Security Governance Verification

生成时间: 2026-07-10T04:45:26.918Z

## 摘要

- 状态: PASS
- 问题数: 0

## 质量边界

- 默认 `privacy.network_policy = local_only`。
- 默认 `privacy.allow_external_rag = false`。
- 外部 RAG 必须显式 `--allow-external-rag`，并生成风险报告。
- Codex、Claude Code、GitHub Copilot 是用户主动使用的 coding runtime 例外，不改变 Zhulong 命令默认本地边界。

## 外部机制映射

- owasp_agentic_top_10: prompt injection, tool misuse, excessive agency, identity/privilege abuse
- nist_ai_rmf: govern, map, measure, manage controls for internal AI system risk
- promptfoo_redteam: future automated adversarial prompt regression harness

## Evidence

- default init: found RAG backend: none
- default config: privacy.network_policy local_only
- default config: allow_external_rag false
- default config: allow_external_tools false
- offline lock: found privacy audit PASS
- strict privacy audit: found privacy audit PASS
- outbound audit: found outbound audit PASS
- external RAG opt-in: found External RAG is disabled by default
- external RAG risk report: found may be sent to the configured external provider
- external RAG config: allow_external_rag true after explicit opt-in
- runtime boundary Codex: found Codex
- runtime boundary Claude Code: found Claude Code
- runtime boundary GitHub Copilot: found GitHub Copilot
- runtime boundary exception: found Codex、Claude Code、GitHub Copilot 是外部 runtime
- local-only docs: found local-only
- allow external RAG docs: found --allow-external-rag

## Issues

No security governance issues found.

## 复现

- `node '<kit-root>/scripts/verify-security-governance.mjs'`
