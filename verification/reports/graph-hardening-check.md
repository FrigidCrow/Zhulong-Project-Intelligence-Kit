# Zhulong Graph Impact/Risk/Freshness Verification

生成时间: 2026-07-10T04:45:25.666Z

## 摘要

- 状态: PASS
- 问题数: 0

## Evidence

- zl graph freshness: found Freshness: fresh
- GRAPH_FRESHNESS: found State: fresh
- zl graph impact: found matched 1
- zl graph impact: found impacted nodes
- GRAPH_IMPACT: found src/service.js
- zl graph risk: found high coupling
- GRAPH_RISK: found src/approval.js
- GRAPH_RISK: found approval.test.js
- zl graph freshness stale: found Freshness: STALE

## Fixture Paths

- Work root: `<tmp>/zhulong-graph-hardening-vdpdpn`
- Project root: `<tmp>/zhulong-graph-hardening-vdpdpn/project`
- Reproduce command: `node '<kit-root>/scripts/verify-graph-hardening.mjs'`

## Issues

No graph hardening issues found.
