# Workflow Guard State: {{PROJECT_NAME}}

This directory stores Zhulong workflow guard state.

`zl-workflow-run` creates one subdirectory per guarded workflow:

```text
.planning/workflows/<workflow-id>/
  WORKFLOW_STATE.json
  WORKFLOW_STATE.md
  PLAN.md
  IMPLEMENTATION.md
  VERIFICATION.md
```

`zl-gate-check` and `zl-completion-check` read these files plus document,
Graphify/code-map, test, evidence, and writeback artifacts. A workflow is not
complete until the required gates pass.

