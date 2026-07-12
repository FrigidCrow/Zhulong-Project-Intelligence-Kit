# Runtime Command Packs

Zhulong 的 runtime command pack 用来让 Codex、Claude Code、GitHub Copilot 调用同一套本地 `zl-*` 命令。它不是三套不同实现，也不是把逻辑复制进各个 AI 工具。

核心原则：

- 用户入口保持 `zl-*`。
- GSD 只作为参考设计，不作为用户命令面。
- runtime pack 只生成技能或 prompt 文件。
- 真正可信的执行和证据落在目标项目 `.planning/`。
- 文档严格程度和 RAG 后端由项目第一次 `zl-init` 决定；真实终端可以直接运行 `zl-init --target "$PWD"` 进入向导，runtime skill 默认使用显式参数，避免等待输入。runtime skill 不会偷偷安装 RAG、切换外部 provider 或触发 GraphRAG index。

推荐接入顺序：

```bash
# 非文档密集型项目的完整路线
zl-init --target "$PWD" --doc-policy reference --rag none

# 文档密集 / 规格严格 / 本地知识后端
zl-init --target "$PWD" --doc-policy strict --rag local --setup-rag skip

# 明确允许外部 RAG 的项目才使用
zl-init --target "$PWD" --doc-policy strict --rag external --allow-external-rag
```

## 1. Codex

Codex 使用 skills 目录：

```text
~/.codex/skills/
```

安装：

```bash
zl-runtime-install --runtime codex --dest ~/.codex/skills
```

检查：

```bash
zl-runtime-status --runtime codex --dest ~/.codex/skills
```

调用方式：

```text
$zl-debug
$zl-plan-phase
$zl-execute-phase
$zl-code-review
$zl-verify-work
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
zl-runtime-install --runtime claude-code --dest ~/.claude/skills
```

项目内安装：

```bash
zl-runtime-install --runtime claude-code --dest .claude/skills
```

检查：

```bash
zl-runtime-status --runtime claude-code --dest ~/.claude/skills
```

调用方式：

```text
/zl-debug
/zl-plan-phase
/zl-execute-phase
/zl-code-review
/zl-verify-work
```

## 3. GitHub Copilot

GitHub Copilot 使用 prompt files：

```text
.github/prompts/
```

安装：

```bash
zl-runtime-install --runtime github-copilot --dest .github/prompts
```

检查：

```bash
zl-runtime-status --runtime github-copilot --dest .github/prompts
```

调用方式：

```text
/zl-debug
/zl-plan-phase
/zl-execute-phase
/zl-code-review
/zl-verify-work
```

## 4. Runtime Pack 当前内容

当前三种 runtime 都渲染同一组核心 workflow，加一个低频可视化入口：

- `zl-new-milestone`
- `zl-spec-phase`
- `zl-discuss-phase`
- `zl-ui-phase`
- `zl-debug`
- `zl-plan-phase`
- `zl-execute-phase`
- `zl-code-review`
- `zl-verify-work`
- `zl-complete-milestone`
- `zl-cockpit-build`

这些 workflow 命令最终都落到 Zhulong native workflow guard，不会提示用户运行 `gsd-*`。

`zl-cockpit-build` 不属于日常 workflow guard，它是项目驾驶舱入口：当用户说“驾驶舱”“leader 演示”“可视化报告”“项目健康度”或“把 Graphify / RAG / evidence 状态汇总给我看”时，runtime skill/prompt 会调用 `zl-cockpit-build --target "$PWD"`，生成 `.planning/cockpit/index.html`。它只读取已有本地 artifact，不运行 GraphRAG index、不运行 Graphify build、不访问外网。稳定展示样例不依赖项目 artifact，位置是 `templates/cockpit/sample.html`；真实项目快照缺 artifact 时才显示 `WAIVED_WITH_RISK`。

安装渲染时，每个 Markdown skill / prompt 还会追加同一段 **Zhulong Local Runtime Contract**：

- 指向本地 `bin/zl.mjs`。
- 默认 local-only，不把项目文档路由到外部 provider。
- 默认 `reference + rag none` 可以不安装 GraphRAG；`strict + rag local` 需要用户显式准备本地 GraphRAG/Ollama 模型。
- workflow 命令不得隐藏触发 heavy refresh；GraphRAG index、Graphify build、refresh-run 必须来自显式 `--run`、`--index` 或 `zl-refresh-run`。
- meaningful verification 必须用 `zl-evidence-record` 和 `--writeback` 留证。

### 内置 Taste Adapter

`zl-ui-phase` runtime 会读取 Zhulong 内置的 `core/design/taste-adapter.md`，不要求用户单独安装 `design-taste-frontend`。它先读取项目 manifest、依赖、设计证据、token、组件和既有页面，再选择：

- `create`：新营销页面，Taste 可完整参与。
- `evolve`：自然演进项目，Taste 只在保留品牌基础上增强。
- `preserve`：成熟设计系统，Taste 只审计。
- `system`：Dashboard 和密集产品 UI，关闭营销页 Taste。

三种 runtime 都必须生成同样的 Frontend Design Decision。用户明确要求与项目设计证据高于 Taste；`preserve` 禁止无批准增加字体、颜色体系、圆角体系、组件库、图标库或动效依赖。

## 5. Help skills

Shell 中可以直接问 Zhulong 当前情况适合跑什么命令：

```bash
zl-help-skills --target "$PWD" "文档更新后想确认影响面和完成前检查"
```

它会输出推荐命令，并写入：

```text
.planning/help/HELP_SKILLS.md
```

这个能力目前在 CLI 层可用。后续如果发现高频使用，再考虑补独立 runtime skill；当前不把所有 `npm run verify:*` 暴露成日常 skill，避免命令心智过重。

## 6. 实际调用例

Runtime pack 的使用方式是“在 AI 工具里叫 skill / prompt，skill 再调用本地 CLI”。它不会在 Codex、Claude Code、Copilot 里复制一套业务逻辑。

Codex 中可以这样说：

```text
$zl-debug 退款上限与业务规则不一致。先查可用依据和影响面，再给我修复计划。
```

Claude Code / GitHub Copilot 中可以这样说：

```text
/zl-plan-phase CR-017 退款上限修复。需要先确认需求依据和 Graphify 影响面。
```

本地 CLI 最终会读取目标项目 `.planning/`，并把 context、workflow、evidence、policy 报告写回目标项目。runtime skill 默认不会安装 RAG、不会切换外部 provider、不会隐藏触发 GraphRAG index 或 Graphify build。需要刷新时必须显式使用 `--run`、`--index` 或 `zl-refresh-run`。

## 7. 验证方式

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

当前 `verify:full-command-surface` 会逐个执行 `package.json` 中全部 `zl-*` / `zl` bin 命令，报告写入：

```text
verification/reports/full-command-surface-check.md
verification/reports/full-command-surface-check.json
verification/reports/skills-usability-check.md
verification/reports/skills-usability-check.json
```

`verify:skills-usability` 会把 Codex、Claude Code、GitHub Copilot 三套 pack 安装到临时目录，检查 11 个核心 skill/prompt 是否都存在、是否指向本地 CLI、是否没有模板变量、是否没有可执行意义的 `gsd-*` 指令，以及是否包含 local-only、no hidden heavy refresh、evidence writeback 约束。它还检查 `zl-ui-phase` 是否引用内置 Adapter、四种设计模式、Frontend Design Decision 和 preserve 保护边界。三种 runtime 合计应为 33 个渲染项。

`dev:audit:full` 是维护者内部审计，会把这 33 个 runtime skill/prompt 纳入 scorecard。最近一次完整审计中 Runtime skills 为 100 / A，摘要见 `verification/reports/developer-audit-summary.md`；原始安装检查和评分表在 `.zl-audit/latest/SKILL_SCORES.md`。注意：scorecard 的 `Benchmark comparison` 是 Zhulong、GSD、Superpowers 多场景混合平均，不是 runtime pack 单独评分；runtime pack 可用性看 Runtime skills 和 `verify:skills-usability`。

## 8. 安全边界

Runtime command pack 本身不上传项目数据。它只是把本地 CLI 路径渲染进 skill 或 prompt 文件。

Claude Code 还提供 `runtime/claude-code/settings.template.json` 作为中性起点。它不内置 `permissions.deny` 规则，也不改写 hooks、bypass 或 auto 模式，因此保留 Claude Code 的平台默认和用户自主配置。如果组织有保密、出网或变更控制要求，应在 managed、project 或 local scope 单独添加组织策略，而不由 kit 对所有用户一刀切。runtime installer 不会自动覆盖现有项目设置。

需要注意的是：当你在 Codex、Claude Code、GitHub Copilot 中粘贴或暴露项目内容时，数据会按照对应产品的策略处理。Zhulong 只能保证自己的默认命令面是 local-first，并通过 `zl-privacy-audit`、`zl-offline-lock`、`zl-policy-check --strict` 检查本地配置。
