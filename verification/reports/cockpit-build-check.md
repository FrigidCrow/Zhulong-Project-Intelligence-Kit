# AI-PIKit Cockpit Build Verification

生成时间: 2026-06-28T05:46:34.300Z

## 摘要

- 状态: PASS
- 问题数: 0

## 覆盖场景

- Standalone cockpit template sample renders from `templates/cockpit/sample-data.json`.
- Stable `cockpit-viewmodel.v1` is written and consumed by the viewer.
- Safe Graphify HTML is copied into `.planning/cockpit/assets/graphify/`.
- Unsafe Graphify HTML with external URL/CDN is blocked and reported as WARN.
- Missing RAG evidence renders `WAIVED_WITH_RISK` without failing the build.
- Large Graphify graphs switch to an aggregated community preview.
- `cockpit-data.json` includes graphify, rag, workflow, quality, and privacy.
- No fixture invokes GraphRAG index or Graphify build.

## 运行结果

- template sample render: exit 0
```text
cockpit sample rendered templates/cockpit/sample.html
```
- safe graphify html: exit 0
```text
cockpit build PASS
heavy refresh executed: no
output .planning/cockpit/index.html
```
- unsafe graphify html: exit 0
```text
cockpit build WARN
heavy refresh executed: no
output .planning/cockpit/index.html
```
- no rag fixture: exit 0
```text
cockpit build WARN
heavy refresh executed: no
output .planning/cockpit/index.html
```
- large graph aggregated view: exit 0
```text
cockpit build PASS
heavy refresh executed: no
output .planning/cockpit/index.html
```

## 问题

未发现 cockpit build 问题。

## 复现

- `node '/Users/frigidcrow/Documents/Project-Intelligence-Kit /scripts/verify-cockpit-build.mjs'`
