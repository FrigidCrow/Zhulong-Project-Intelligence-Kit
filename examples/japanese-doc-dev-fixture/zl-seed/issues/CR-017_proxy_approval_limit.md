# Issue: CR-017 proxy approval limit

Status: open

## Request

代理承認の上限金額を30,000円へ変更する。

## Specification Evidence

- `docs/qa/QA-042_代理承認上限.md`
- `docs/minutes/2026-06-18_承認仕様定例.md`
- `docs/change-requests/CR-017_代理承認上限.md`

## Expected Code Impact

- `src/approvalPolicy.js`
- `tests/cr017_proxy_limit.test.js`

## Verification

- [ ] `npm test`
- [ ] `npm run test:task`
- [ ] `zl-graph-diff --target <repo>`

## Evidence

Zhulong evidence writeback should be appended here after verification.
