# Runtime Command Packs

AI-PIKit 的 runtime command pack 用来让 Codex、Claude Code、GitHub Copilot 调用同一套本地 `pik-*` 命令。它不是三套不同实现，也不是把逻辑复制进各个 AI 工具。

核心原则：

- 用户入口保持 `pik-*`。
- GSD 只作为参考设计，不作为用户命令面。
- runtime pack 只生成技能或 prompt 文件。
- 真正可信的执行和证据落在目标项目 `.planning/`。
- 文档严格程度和 RAG 后端由项目第一次 `pik-init` 决定；真实终端可以直接运行 `pik-init --target "$PWD"` 进入向导，runtime skill 默认使用显式参数，避免等待输入。runtime skill 不会偷偷安装 RAG、切换外部 provider 或触发 GraphRAG index。

推荐接入顺序：

```bash
# 文档少 / 无文档 / 先轻量接入
pik-init --target "$PWD" --doc-policy reference --rag none

# 对日 / 规格严格 / 本地知识后端
pik-init --target "$PWD" --doc-policy strict --rag local --setup-rag skip

# 明确允许外部 RAG 的项目才使用
pik-init --target "$PWD" --doc-policy strict --rag external --allow-external-rag
```

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

当前三种 runtime 都渲染同一组核心 workflow，加一个低频可视化入口：

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
- `pik-cockpit-build`

这些 workflow 命令最终都落到 AI-PIKit native workflow guard，不会提示用户运行 `gsd-*`。

`pik-cockpit-build` 不属于日常 workflow guard，它是项目驾驶舱入口：当用户说“驾驶舱”“leader 演示”“可视化报告”“项目健康度”或“把 Graphify / RAG / evidence 状态汇总给我看”时，runtime skill/prompt 会调用 `pik-cockpit-build --target "$PWD"`，生成 `.planning/cockpit/index.html`。它只读取已有本地 artifact，不运行 GraphRAG index、不运行 Graphify build、不访问外网。稳定展示样例不依赖项目 artifact，位置是 `templates/cockpit/sample.html`；真实项目快照缺 artifact 时才显示 `WAIVED_WITH_RISK`。

安装渲染时，每个 Markdown skill / prompt 还会追加同一段 **AI-PIKit Local Runtime Contract**：

- 指向本地 `bin/pik.mjs`。
- 默认 local-only，不把项目文档路由到外部 provider。
- 默认 `reference + rag none` 可以不安装 GraphRAG；`strict + rag local` 需要用户显式准备本地 GraphRAG/Ollama 模型。
- workflow 命令不得隐藏触发 heavy refresh；GraphRAG index、Graphify build、refresh-run 必须来自显式 `--run`、`--index` 或 `pik-refresh-run`。
- meaningful verification 必须用 `pik-evidence-record` 和 `--writeback` 留证。

## 5. Help skills

Shell 中可以直接问 AI-PIKit 当前情况适合跑什么命令：

```bash
pik-help-skills --target "$PWD" "文档更新后想确认影响面和完成前检查"
```

它会输出推荐命令，并写入：

```text
.planning/help/HELP_SKILLS.md
```

这个能力目前在 CLI 层可用。后续如果发现高频使用，再考虑补独立 runtime skill；当前不把所有 `npm run verify:*` 暴露成日常 skill，避免命令心智过重。

## 6. 验证方式

Runtime pack 验证：

```bash
npm run verify:runtime
npm run verify:skills-usability
npm run dev:audit:full
```

全命令面验证：

```bash
npm run verify:full-command-surface
```

当前 `verify:full-command-surface` 会逐个执行 `package.json` 中全部 `pik-*` / `pik` bin 命令，报告写入：

```text
verification/reports/full-command-surface-check.md
verification/reports/full-command-surface-check.json
verification/reports/skills-usability-check.md
verification/reports/skills-usability-check.json
```

`verify:skills-usability` 会把 Codex、Claude Code、GitHub Copilot 三套 pack 安装到临时目录，检查 11 个核心 skill/prompt 是否都存在、是否指向本地 CLI、是否没有模板变量、是否没有可执行意义的 `gsd-*` 指令，以及是否包含 local-only、no hidden heavy refresh、evidence writeback 约束。三种 runtime 合计应为 33 个渲染项。

`dev:audit:full` 是维护者内部审计，会把这 33 个 runtime skill/prompt 纳入 scorecard。最近一次完整审计中 Runtime skills 为 100 / A，摘要见 `verification/reports/developer-audit-summary.md`；原始安装检查和评分表在 `.pik-audit/latest/SKILL_SCORES.md`。注意：scorecard 的 `Benchmark comparison` 是 AI-PIKit、GSD、Superpowers 多场景混合平均，不是 runtime pack 单独评分；runtime pack 可用性看 Runtime skills 和 `verify:skills-usability`。

## 7. 安全边界

Runtime command pack 本身不上传项目数据。它只是把本地 CLI 路径渲染进 skill 或 prompt 文件。

需要注意的是：当你在 Codex、Claude Code、GitHub Copilot 中粘贴或暴露项目内容时，数据会按照对应产品的策略处理。AI-PIKit 只能保证自己的默认命令面是 local-first，并通过 `pik-privacy-audit`、`pik-offline-lock`、`pik-policy-check --strict` 检查本地配置。
