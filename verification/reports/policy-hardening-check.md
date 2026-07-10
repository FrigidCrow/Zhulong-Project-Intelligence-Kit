# Zhulong Policy Hardening & Guard Contract Verification

生成时间: 2026-07-10T03:51:04.982Z

## 摘要

- 状态: PASS
- 问题数: 0

## 证据

- zl init --target <tmp>/zhulong-policy-hardening-ZfXk2B/project --template greenfield-app --name policy_hardening_fixture --mode new --force: exit 0
- zl mode set --target <tmp>/zhulong-policy-hardening-ZfXk2B/project full-strict: exit 0
- zl codebase scan --target <tmp>/zhulong-policy-hardening-ZfXk2B/project: exit 0
- zl docs scan --target <tmp>/zhulong-policy-hardening-ZfXk2B/project: exit 0
- zl docs extract --target <tmp>/zhulong-policy-hardening-ZfXk2B/project: exit 0
- zl docs citations --target <tmp>/zhulong-policy-hardening-ZfXk2B/project POLICY_HARDENING_SPEC: exit 0
- zl privacy offline-lock --target <tmp>/zhulong-policy-hardening-ZfXk2B/project: exit 0
- zl policy lock --target <tmp>/zhulong-policy-hardening-ZfXk2B/project: exit 0
- policy lock: found policy lock PASS
- policy lock no heavy: found heavy refresh executed: no
- POLICY_LOCK hash: found snapshotHash
- zl policy verify --target <tmp>/zhulong-policy-hardening-ZfXk2B/project: exit 0
- policy verify: found policy verify PASS
- policy verify no heavy: found heavy refresh executed: no
- zl policy diff --target <tmp>/zhulong-policy-hardening-ZfXk2B/project: exit 0
- policy diff clean: found policy diff CLEAN
- zl policy diff --target <tmp>/zhulong-policy-hardening-ZfXk2B/project: exit 1
- policy diff changed: found policy diff CHANGED
- POLICY_DIFF field: found privacy.allow_external_rag
- zl policy verify --target <tmp>/zhulong-policy-hardening-ZfXk2B/project: exit 1
- policy verify unsafe: found policy verify FAIL
- policy verify unsafe external: found allow_external_rag
- zl policy verify --target <tmp>/zhulong-policy-hardening-ZfXk2B/project: exit 0
- zl policy verify --target <tmp>/zhulong-policy-hardening-ZfXk2B/project: exit 1
- full-strict stale: found STALE_NEEDS_REFRESH
- full-strict stale no heavy: found heavy refresh executed: no
- zl policy verify --target <tmp>/zhulong-policy-hardening-ZfXk2B/project: exit 1
- full-strict missing citation: found evidence.citations
- full-strict missing citation fail: found FAIL
- zl init --target <tmp>/zhulong-policy-hardening-ZfXk2B/graph-lite-project --template greenfield-app --name graph_lite_fixture --mode new --force: exit 0
- zl mode set --target <tmp>/zhulong-policy-hardening-ZfXk2B/graph-lite-project graph-lite: exit 0
- zl codebase scan --target <tmp>/zhulong-policy-hardening-ZfXk2B/graph-lite-project: exit 0
- zl privacy offline-lock --target <tmp>/zhulong-policy-hardening-ZfXk2B/graph-lite-project: exit 0
- zl workflow run --target <tmp>/zhulong-policy-hardening-ZfXk2B/graph-lite-project debug GRAPH_LITE no docs: exit 0
- graph-lite workflow: found WAIVED_WITH_RISK
- zl workflow continue --target <tmp>/zhulong-policy-hardening-ZfXk2B/graph-lite-project --gate plan --evidence graph-lite plan accepted: exit 0
- zl workflow continue --target <tmp>/zhulong-policy-hardening-ZfXk2B/graph-lite-project --gate implementation --evidence graph-lite implementation accepted: exit 0
- zl workflow continue --target <tmp>/zhulong-policy-hardening-ZfXk2B/graph-lite-project --gate verification --evidence graph-lite verification accepted: exit 0
- zl evidence record --target <tmp>/zhulong-policy-hardening-ZfXk2B/graph-lite-project graph-lite evidence --command manual --result passed --writeback .planning/issues/graph-lite.md: exit 0
- zl workflow completion-check --target <tmp>/zhulong-policy-hardening-ZfXk2B/graph-lite-project: exit 0
- graph-lite completion allowed: found completion allowed
- graph-lite completion waiver: found WAIVED_WITH_RISK
- graph-lite workflow audit waiver: found WAIVED_WITH_RISK
- heavy refresh guard POLICY_VERIFY.md: found Heavy refresh executed: no
- heavy refresh guard POLICY_DIFF.md: found Heavy refresh executed: no
- heavy refresh guard WORKFLOW_FACADE.md: found Heavy refresh executed: no

## Fixture 路径

- Work root: `<tmp>/zhulong-policy-hardening-ZfXk2B`
- Strict project: `<tmp>/zhulong-policy-hardening-ZfXk2B/project`
- Graph-lite project: `<tmp>/zhulong-policy-hardening-ZfXk2B/graph-lite-project`
- 复现命令: `node '<kit-root>/scripts/verify-policy-hardening.mjs'`

## 问题

未发现 policy hardening 问题。
