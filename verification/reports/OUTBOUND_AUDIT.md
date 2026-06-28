# AI-PIKit Outbound Audit

Generated: 2026-06-28T05:45:37.831Z

## Summary

- Status: PASS
- Checked files/commands: 7
- Issues: 0
- Warnings: 18
- Allowed coding runtimes outside AI-PIKit boundary: Codex, Claude Code, GitHub Copilot

## Checked Surface

- `package.json`
- `bin/pik.mjs`
- `verification/run-full-validation.mjs`
- `scripts/verify-rag-local.mjs`
- `scripts/verify-rag-commands.mjs`
- `core/planning/config.template.json`
- `core/project.manifest.yml.template`

## Issues

No default outbound behavior found outside localhost/local commands.

## Warnings

- `bin/pik.mjs`: non-default implementation, detection rule, negative fixture, or explicit opt-in surface: network-capable command is not allowed in local-only mode: curl
- `bin/pik.mjs`: non-default implementation, detection rule, negative fixture, or explicit opt-in surface: network-capable command is not allowed in local-only mode: wget
- `bin/pik.mjs`: non-default implementation, detection rule, negative fixture, or explicit opt-in surface: network-capable command is not allowed in local-only mode: scp
- `bin/pik.mjs`: non-default implementation, detection rule, negative fixture, or explicit opt-in surface: network-capable command is not allowed in local-only mode: sftp
- `bin/pik.mjs`: non-default implementation, detection rule, negative fixture, or explicit opt-in surface: network-capable command is not allowed in local-only mode: ssh
- `bin/pik.mjs`: non-default implementation, detection rule, negative fixture, or explicit opt-in surface: network-capable command is not allowed in local-only mode: rsync
- `bin/pik.mjs`: non-default implementation, detection rule, negative fixture, or explicit opt-in surface: network-capable command is not allowed in local-only mode: nc
- `bin/pik.mjs`: non-default implementation, detection rule, negative fixture, or explicit opt-in surface: network-capable command is not allowed in local-only mode: netcat
- `bin/pik.mjs`: non-default implementation, detection rule, negative fixture, or explicit opt-in surface: network-capable command is not allowed in local-only mode: telnet
- `bin/pik.mjs`: non-default implementation, detection rule, negative fixture, or explicit opt-in surface: network-capable command is not allowed in local-only mode: ftp
- `bin/pik.mjs`: non-default implementation, detection rule, negative fixture, or explicit opt-in surface: network-capable command is not allowed in local-only mode: lftp
- `bin/pik.mjs`: non-default implementation, detection rule, negative fixture, or explicit opt-in surface: external API key reference is not allowed: GRAPHRAG_API_KEY
- `verification/run-full-validation.mjs`: non-default implementation, detection rule, negative fixture, or explicit opt-in surface: external URL is not allowed in local-only mode: https://api.deepseek.com
- `verification/run-full-validation.mjs`: non-default implementation, detection rule, negative fixture, or explicit opt-in surface: external model_provider is not allowed: openai
- `verification/run-full-validation.mjs`: non-default implementation, detection rule, negative fixture, or explicit opt-in surface: external API key reference is not allowed: GRAPHRAG_API_KEY
- `scripts/verify-rag-local.mjs`: non-default implementation, detection rule, negative fixture, or explicit opt-in surface: external model_provider is not allowed: openai
- `scripts/verify-rag-local.mjs`: non-default implementation, detection rule, negative fixture, or explicit opt-in surface: external API key reference is not allowed: GRAPHRAG_API_KEY
- `core/planning/config.template.json`: non-default implementation, detection rule, negative fixture, or explicit opt-in surface: external API key reference is not allowed: GRAPHRAG_API_KEY

## Boundary Statement

AI-PIKit commands are local file/CLI operations by default. Data can still leave the machine if the user manually configures external providers, changes command strings to network-capable tools, or pastes project context into Codex, Claude Code, or GitHub Copilot.
