# Zhulong Workflow Authorization

Zhulong separates a requested workflow from permission to enter another
workflow. A suggested next command is never authorization.

## Default: interactive

Without an explicit user request or a matching bounded-autonomy Goal:

- run only the current workflow;
- treat investigation and debugging as diagnose-only;
- do not enter implementation from spec, UI, discussion, planning, review, or
  verification;
- do not close the workflow or milestone;
- return control to the user after producing the current artifact.

`workflow.auto_advance: false` makes this the recorded project policy. Runtime
instructions enforce the cross-Skill boundary; the local CLI cannot
cryptographically prove whether its caller is a user or an agent. The current
user request authorizes the named work, but does not pre-accept the result. Interactive
completion requires a later acceptance bound to the current workflow, unless
the user explicitly requested completion/closure in the original message.
Ordinary evidence cannot impersonate acceptance.

## Explicit current-workflow intent

The user's current message may authorize one workflow. Examples:

| User intent | Authorized work |
| --- | --- |
| analyze, investigate, diagnose | diagnosis only |
| fix, implement, execute, apply | scoped implementation and verification |
| plan | planning only |
| review | review only |
| verify | verification only |
| complete or close | completion checks and closure only |

Do not infer downstream authorization from a successful current phase.

## Bounded-autonomy Goal

When the user explicitly asks to automatically execute a named milestone list
or range, the runtime may translate that natural-language grant into one
bounded authorization. The user does not need to write JSON or repeat approval
for every phase.

The runtime first writes a project-local contract file. Each entry preserves
the exact user-authorized objective and may narrow actions, paths, acceptance,
and permissions:

```json
{
  "schemaVersion": "zhulong.milestone-contracts.v1",
  "milestones": [
    {
      "id": "MVP4.0",
      "objective": "盘点运行题、旧题和候选内容",
      "actions": ["spec", "plan", "execute", "review", "verify"],
      "allowedPaths": ["content/**"],
      "acceptance": ["inventory evidence recorded"],
      "permissions": { "commit": true, "push": false }
    }
  ]
}
```

Register it with:

```text
zl workflow authorize --target <repo> \
  --goal "<goal>" \
  --contract-file ".planning/goals/MVP4_CONTRACTS.json" \
  --source user-message \
  --request "<explicit user authorization excerpt>"
```

Attach the returned authorization ID, milestone, and contract digest to every
child workflow. Use the contract's exact objective as the request. Goal-driven
children do not use `--source user-message`:

```text
zl workflow run plan-phase --target <repo> "盘点运行题、旧题和候选内容" \
  --authorization <grant-id> --milestone MVP4.0 \
  --contract-digest <digest>
```

The grant may allow spec, routine discussion, UI, plan, execution, debug repair, review,
verification, milestone completion, and advancement. It never silently grants
new dependencies, push, merge, release, external data transfer, destructive
migration, or paid services; those permissions must be explicit. The CLI grant
supports `--dependencies`, `--commit`, `--push`, `--merge`, and `--release`;
external transfer and destructive operations still require a separate stop and
user decision.

Before exercising one of those permissions, the runtime must check the active
workflow rather than trusting a copied flag:

```text
zl workflow permission-check --target <repo> --permission push
```

Legacy grants containing only `--milestones` remain valid for non-mutating
specification, UI, planning, review, and verification work. They cannot
authorize execute, debug repair, milestone completion, or advancement.

Stop at the declared milestone boundary. Pause earlier for a material product
decision, unresolved contradiction, destructive operation, privacy/export
change, or repeated verification failure that cannot be resolved inside scope.

## Completion and evidence

- `zl-completion-check` is read-only. It reports eligibility and never changes
  workflow status.
- `zl workflow complete` is the only workflow-kernel operation that writes
  `status: complete`.
- Manual gates require real project files created for the current workflow,
  with a matching evidence type and completed/passed status.
- Durable evidence and writeback must name the current workflow ID.
- Spec, UI, and discussion workflows require structured decision state with no
  unresolved contradiction, open question, or material pending decision.
- Workflow aliases never infer user origin. A runtime may append
  `--source user-message` only when a Skill is the direct response to the
  current user message. This is an auditable runtime assertion, not
  cryptographic identity proof, and it does not accept the result. Append
  `--accept-completion` only when that same message explicitly asks to complete
  or close the work.
- `zl workflow accept` records a later explicit approval after the user reviews
  the current artifact. An agent-selected downstream Skill must not claim
  either form of user intent. A matching bounded-autonomy authorization may
  satisfy both gates inside its declared scope.

## Revocation

An explicit user request to stop automatic execution must revoke the active
grant. Finish only the current safe operation, then do not start another
workflow or milestone.

```text
zl workflow revoke --target <repo> --authorization <grant-id> \
  --reason "<user request>"
```

Native runtime Goals may keep work alive across turns, but the Zhulong
authorization record is the cross-runtime source of scope and permissions.
