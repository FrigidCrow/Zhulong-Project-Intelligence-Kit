# Zhulong Graph Impact/Risk/Freshness Verification

生成时间: 2026-07-10T00:45:30.335Z

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

- Work root: `/var/folders/8x/r_vcd1b9087b2z66wcry685c0000gn/T/zhulong-graph-hardening-CTZnFE`
- Project root: `/var/folders/8x/r_vcd1b9087b2z66wcry685c0000gn/T/zhulong-graph-hardening-CTZnFE/project`
- Reproduce command: `node '/Users/frigidcrow/Documents/Zhulong-Project-Intelligence-Kit/scripts/verify-graph-hardening.mjs'`

## Issues

No graph hardening issues found.
