# Runtime Command Packs

AI-PIKit 的 runtime command pack 用来让 Codex、Claude Code、GitHub Copilot 调用同一套本地 `pik-*` 命令。它不是三套不同实现，也不是把逻辑复制进各个 AI 工具。

核心原则：

- 用户入口保持 `pik-*`。
- GSD 只作为参考设计，不作为用户命令面。
- runtime pack 只生成技能或 prompt 文件。
- 真正可信的执行和证据落在目标项目 `.planning/`。

## 1. Codex

Codex 使用 skills 目录：

```text
~/.codex/skills/
```

安装：

```bash
pik-runtime-install --runtime codex --dest ~/.codex/skills
```

检查：

```bash
pik-runtime-status --runtime codex --dest ~/.codex/skills
```

调用方式：

```text
$pik-debug
$pik-plan-phase
$pik-execute-phase
$pik-code-review
$pik-verify-work
```

安装后重启 Codex，让新 skills 被发现。

## 2. Claude Code

Claude Code 使用 skills 目录：

```text
~/.claude/skills/
.claude/skills/
```

个人安装：

```bash
pik-runtime-install --runtime claude-code --dest ~/.claude/skills
```

项目内安装：

```bash
pik-runtime-install --runtime claude-code --dest .claude/skills
```

检查：

```bash
pik-runtime-status --runtime claude-code --dest ~/.claude/skills
```

调用方式：

```text
/pik-debug
/pik-plan-phase
/pik-execute-phase
/pik-code-review
/pik-verify-work
```

## 3. GitHub Copilot

GitHub Copilot 使用 prompt files：

```text
.github/prompts/
```

安装：

```bash
pik-runtime-install --runtime github-copilot --dest .github/prompts
```

检查：

```bash
pik-runtime-status --runtime github-copilot --dest .github/prompts
```

调用方式：

```text
/pik-debug
/pik-plan-phase
/pik-execute-phase
/pik-code-review
/pik-verify-work
```

## 4. Runtime Pack 当前内容

当前三种 runtime 都渲染同一组核心 workflow：

- `pik-new-milestone`
- `pik-spec-phase`
- `pik-discuss-phase`
- `pik-ui-phase`
- `pik-debug`
- `pik-plan-phase`
- `pik-execute-phase`
- `pik-code-review`
- `pik-verify-work`
- `pik-complete-milestone`

这些 workflow 最终都落到 AI-PIKit native workflow guard，不会提示用户运行 `gsd-*`。

## 5. Help skills

Shell 中可以直接问 AI-PIKit 当前情况适合跑什么命令：

```bash
pik-help-skills --target "$PWD" "文档更新后想确认影响面和完成前检查"
```

它会输出推荐命令，并写入：

```text
.planning/help/HELP_SKILLS.md
```

这个能力目前在 CLI 层可用。后续可以把它也暴露给 Codex / Claude Code / Copilot 的 runtime pack。

## 6. 验证方式

Runtime pack 验证：

```bash
npm run verify:runtime
```

全命令面验证：

```bash
npm run verify:full-command-surface
```

当前 `verify:full-command-surface` 会逐个执行 `package.json` 中全部 `pik-*` / `pik` bin 命令，报告写入：

```text
verification/reports/full-command-surface-check.md
verification/reports/full-command-surface-check.json
```

## 7. 安全边界

Runtime command pack 本身不上传项目数据。它只是把本地 CLI 路径渲染进 skill 或 prompt 文件。

需要注意的是：当你在 Codex、Claude Code、GitHub Copilot 中粘贴或暴露项目内容时，数据会按照对应产品的策略处理。AI-PIKit 只能保证自己的默认命令面是 local-first，并通过 `pik-privacy-audit`、`pik-offline-lock`、`pik-policy-check --strict` 检查本地配置。
