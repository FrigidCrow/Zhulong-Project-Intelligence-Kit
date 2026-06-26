# Phase Validation: admin approval

## Scope

Validate approval rules against Japanese specification evidence and code-map impact.

## Required Checks

- [ ] Local document query finds QA-042 and CR-017.
- [ ] RAG query returns the 30,000円 proxy approval decision.
- [ ] Code map identifies `PROXY_APPROVAL_LIMIT` and `evaluateApproval`.
- [ ] Focused task test passes after implementation.
- [ ] Evidence is written back to the issue record.
