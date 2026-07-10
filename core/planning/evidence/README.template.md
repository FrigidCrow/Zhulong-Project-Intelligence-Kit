# Evidence Records: {{PROJECT_NAME}}

Use this directory for durable verification evidence, decisions, risks, rollback
notes, and follow-ups.

## Zhulong Commands

```bash
zl-evidence-record --target <repo> "<summary>" --command "<command>" --result "<result>"
zl-evidence-record --target <repo> "<summary>" --writeback .planning/issues/<issue>.md
zl-evidence-status --target <repo>
```

Evidence records should connect:

- specification or requirement sources;
- code-map or source-file findings;
- verification commands and results;
- remaining risks;
- rollback notes;
- follow-ups.

Use `--writeback <path>` to append an evidence summary to an existing issue,
debug, or phase record. Shortcuts are also supported when the target can be
resolved to an existing file:

```bash
zl-evidence-record --target <repo> "<summary>" --phase <phase-slug>
zl-evidence-record --target <repo> "<summary>" --debug <debug-record>
zl-evidence-record --target <repo> "<summary>" --issue <issue-record>
```

Keep customer data, secrets, production credentials, and raw private logs out of
evidence records unless the project has an approved secure handling process.
