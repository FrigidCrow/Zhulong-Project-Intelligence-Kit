# Zhulong Outbound Audit

Generated: 2026-07-10T03:49:40.348Z

## Summary

- Status: PASS
- Checked files/commands: 7
- Issues: 0
- Warnings: 21
- Allowed coding runtimes outside Zhulong boundary: Codex, Claude Code, GitHub Copilot

## Checked Surface

- `package.json`
- `bin/zl.mjs`
- `verification/run-full-validation.mjs`
- `scripts/verify-rag-local.mjs`
- `scripts/verify-rag-commands.mjs`
- `core/planning/config.template.json`
- `core/project.manifest.yml.template`

## Issues

No default outbound behavior found outside localhost/local commands.

## Warnings

- `package.json`: non-default implementation, detection rule, negative fixture, or explicit opt-in surface: external URL is not allowed in local-only mode: https://github.com
- `package.json`: non-default implementation, detection rule, negative fixture, or explicit opt-in surface: external URL is not allowed in local-only mode: https://frigidcrow.github.io
- `package.json`: non-default implementation, detection rule, negative fixture, or explicit opt-in surface: external URL is not allowed in local-only mode: https://github.com
- `bin/zl.mjs`: non-default implementation, detection rule, negative fixture, or explicit opt-in surface: network-capable command is not allowed in local-only mode: curl
- `bin/zl.mjs`: non-default implementation, detection rule, negative fixture, or explicit opt-in surface: network-capable command is not allowed in local-only mode: wget
- `bin/zl.mjs`: non-default implementation, detection rule, negative fixture, or explicit opt-in surface: network-capable command is not allowed in local-only mode: scp
- `bin/zl.mjs`: non-default implementation, detection rule, negative fixture, or explicit opt-in surface: network-capable command is not allowed in local-only mode: sftp
- `bin/zl.mjs`: non-default implementation, detection rule, negative fixture, or explicit opt-in surface: network-capable command is not allowed in local-only mode: ssh
- `bin/zl.mjs`: non-default implementation, detection rule, negative fixture, or explicit opt-in surface: network-capable command is not allowed in local-only mode: rsync
- `bin/zl.mjs`: non-default implementation, detection rule, negative fixture, or explicit opt-in surface: network-capable command is not allowed in local-only mode: nc
- `bin/zl.mjs`: non-default implementation, detection rule, negative fixture, or explicit opt-in surface: network-capable command is not allowed in local-only mode: netcat
- `bin/zl.mjs`: non-default implementation, detection rule, negative fixture, or explicit opt-in surface: network-capable command is not allowed in local-only mode: telnet
- `bin/zl.mjs`: non-default implementation, detection rule, negative fixture, or explicit opt-in surface: network-capable command is not allowed in local-only mode: ftp
- `bin/zl.mjs`: non-default implementation, detection rule, negative fixture, or explicit opt-in surface: network-capable command is not allowed in local-only mode: lftp
- `bin/zl.mjs`: non-default implementation, detection rule, negative fixture, or explicit opt-in surface: external API key reference is not allowed: GRAPHRAG_API_KEY
- `verification/run-full-validation.mjs`: non-default implementation, detection rule, negative fixture, or explicit opt-in surface: external URL is not allowed in local-only mode: https://api.deepseek.com
- `verification/run-full-validation.mjs`: non-default implementation, detection rule, negative fixture, or explicit opt-in surface: external model_provider is not allowed: openai
- `verification/run-full-validation.mjs`: non-default implementation, detection rule, negative fixture, or explicit opt-in surface: external API key reference is not allowed: GRAPHRAG_API_KEY
- `scripts/verify-rag-local.mjs`: non-default implementation, detection rule, negative fixture, or explicit opt-in surface: external model_provider is not allowed: openai
- `scripts/verify-rag-local.mjs`: non-default implementation, detection rule, negative fixture, or explicit opt-in surface: external API key reference is not allowed: GRAPHRAG_API_KEY
- `core/planning/config.template.json`: non-default implementation, detection rule, negative fixture, or explicit opt-in surface: external API key reference is not allowed: GRAPHRAG_API_KEY

## Boundary Statement

Zhulong commands are local file/CLI operations by default. Data can still leave the machine if the user manually configures external providers, changes command strings to network-capable tools, or pastes project context into Codex, Claude Code, or GitHub Copilot.
