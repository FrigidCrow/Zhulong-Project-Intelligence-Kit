# Zhulong Project Intelligence Kit Wishlist

Status: working wishlist
Date: 2026-06-25
Full name: **Zhulong Project Intelligence Kit**
Documentation abbreviation: **Zhulong**
Command namespace: **`zl-*`**

## 1. 产品定位

Zhulong 是一个面向文档密集型软件开发的 **AI 工程上下文框架**。

它不是：

- 替代 Codex、Claude Code、GitHub Copilot 的 AI runtime。
- 单纯的文档 RAG 产品。
- 单纯的代码图谱产品。
- 把 GSD、GraphRAG、Graphify 简单绑在一起。

它要解决的是：

> 让 AI 不只是会写代码，而是在项目上下文、仕様依据、代码影响面和验证闭环里写代码。

## 2. 目标场景

Zhulong 特别适合对日文档密集型开发：

- 仕様書
- 基本設計書
- 詳細設計書
- 画面設計書
- API 定義
- DB 定義書
- テスト仕様書
- QA 票
- 議事録
- 課題管理表
- 运维手顺和发布说明

项目仍然是开发为主。文档/RAG 是为了提高改修和新规开发精度，不是把产品做成一个独立知识库。

## 3. 命名 Gold

| 类型 | 标准 |
| --- | --- |
| 产品全名 | Zhulong Project Intelligence Kit |
| 文档缩写 | Zhulong |
| skills / CLI 命令 | `zl-*` |
| 不再作为用户入口 | `gsd-*` |

GSD 只作为 workflow 思路参考。用户应该调用：

- `zl-debug`
- `zl-plan-phase`
- `zl-execute-phase`
- `zl-code-review`
- `zl-verify-work`
- `zl-completion-check`

## 4. 理想工作流

普通 AI Coding：

```text
prompt
  -> 改代码
  -> 可能跑测试
```

Zhulong 目标工作流：

```text
用户请求
  -> 读取 Zhulong workflow state
  -> 查询 仕様 / QA / 議事録 / 設計書
  -> 查询 Graphify 代码地图 / 影响面 / 风险模块
  -> 生成计划
  -> 实施
  -> 测试验证
  -> 写回决策、证据、风险和后续事项
  -> completion gate 判断是否允许完成
```

## 5. 当前已落地能力

### 5.1 Native `zl-*` workflow

当前 Zhulong 已经拥有自己的 workflow command surface：

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

每个 workflow 会写：

- `.planning/context/*.md`
- `.planning/context/handoffs/*-HANDOFF.md`
- `.planning/workflows/*/WORKFLOW_STATE.json`
- `.planning/workflows/*/WORKFLOW_STATE.md`

### 5.2 本地文档 / Local GraphRAG

当前默认是 Local GraphRAG Default Mode：

- 不需要 `GRAPHRAG_API_KEY`
- Ollama 本地 LLM
- Ollama 本地 embedding
- LanceDB
- local-only privacy audit

关键命令：

```bash
zl-docs-scan --target "$PWD"
zl-docs-extract --target "$PWD"
zl-rag-init-local --target "$PWD"
zl-docs-index --target "$PWD" --run
zl-docs-query --target "$PWD" --rag "仕様根拠は？"
```

### 5.3 Graphify 代码地图

Graphify 用于代码影响面：

```bash
zl-graph-build --target "$PWD" --run
zl-graph-query --target "$PWD" "変更対象"
zl-graph-impact --target "$PWD" --files "src/a.js"
zl-graph-risk --target "$PWD"
zl-graph-freshness --target "$PWD" --strict
```

### 5.4 Evidence / Trace / Policy

MVP3 新增：

- RAG golden case
- citation audit
- RAG eval
- trace matrix
- policy check
- help skills

关键命令：

```bash
zl-rag-golden-run --target "$PWD"
zl-citation-audit --target "$PWD"
zl-trace-build --target "$PWD"
zl-trace-audit --target "$PWD"
zl-policy-check --target "$PWD" --strict
zl-help-skills --target "$PWD" "我现在是文档更新情况，有没有适合我的命令"
```

## 6. Runtime 支持

Zhulong 明确支持：

- Codex
- Claude Code
- GitHub Copilot

安装方式：

```bash
zl-runtime-install --runtime codex --dest ~/.codex/skills
zl-runtime-install --runtime claude-code --dest ~/.claude/skills
zl-runtime-install --runtime github-copilot --dest .github/prompts
```

Runtime 适配只是入口差异。核心仍然是本地 `zl-*` CLI。

## 7. 保密边界愿望

保密项目默认应满足：

- 不需要外部 API key。
- 默认不把文档发给外部 LLM provider。
- `.planning/config.json` 中外部 URL、外部 provider、API key 形态会被审计。
- `zl-docs-index --run`、`zl-docs-query --rag`、`zl-graph-build --run` 在 local-only 模式下先过 privacy guard。

当前命令：

```bash
zl-offline-lock --target "$PWD"
zl-privacy-audit --target "$PWD" --strict
zl-outbound-audit --target "$PWD"
zl-policy-check --target "$PWD" --strict
```

## 8. 已落地能力和未来愿望

### 已落地：MVP4 Knowledge Reliability Lite

- `zl-docs-sync`：文档更新后一键 scan / diff / extract / citation audit，默认不执行 GraphRAG index，只有显式 `--index` 才重索引。
- `zl-answer-audit`：检查最近 query 或指定回答是否有 citation、citation 源文件是否存在、行号是否合法；无 citation 时按 profile 输出 `WAIVED_WITH_RISK` 或 `FAIL`。
- `zl-rag-golden-*`、`zl-rag-eval`、`zl-citation-audit`：让文档问答可以被 golden case 和 citation 复查。

### 已落地：MVP6 Policy-as-Code Lite

- `zl-policy-lock`
- `zl-policy-verify`
- `zl-policy-diff`
- 四态语义：`PASS`、`FAIL`、`WAIVED_WITH_RISK`、`STALE_NEEDS_REFRESH`
- `graph-lite`、`default-local-rag`、`full-strict` 三种 profile

### 已落地：MVP4.2 Project Cockpit

- `zl-cockpit-build`
- 稳定样例：`templates/cockpit/sample.html`
- 真实项目快照：`.planning/cockpit/index.html`
- Graphify impact、GraphRAG/RAG evidence、workflow、quality、privacy、evidence 的本地静态可视化入口

### 下一步愿望：Knowledge Reliability Deepening

- GraphRAG query route：local / global / drift / basic 自动选择，先做 dry-run / plan，再考虑真实执行。
- RAG 评估指标增强：context precision、context recall、faithfulness、answer relevancy。
- `zl-answer-audit` 增强为更细的 answer faithfulness / contradiction 检查。
- `zl-docs-sync` 增强文档 owner、文档类型、变更影响面分类。

### 下一步愿望：MCP Runtime Layer

- `zl-mcp-serve`
- 通过 MCP 暴露 tools、resources、prompts。
- Codex / Claude / Copilot 通过同一套本地 MCP server 调用 Zhulong。

### 下一步愿望：Policy-as-Code Deepening

- 项目级 policy 规则文件。
- 更严格的外发、license、文档证据和 completion policy。
- 项目级 waiver 审批和审计。
- policy diff 的变更责任人、理由和有效期。

### 下一步愿望：QA 可视化驾驶舱深化

- 文档更新影响了哪些需求。
- 仕様依据连接到哪些代码。
- 哪些测试覆盖了哪些仕様。
- 哪些 workflow gate 还没过。
- 本次 AI 修改的证据链是否完整。
- leader view 和 engineer view 的更多筛选、导出和截图证据。

### 未来专门阶段：Frontend Experience Intelligence Mode

这个阶段用于解决前端项目里“画面之间怎么迁移、哪个 UI 状态来自哪个仕様、哪个组件实现了哪个画面”的上下文问题。目标不是做一个在线设计 SaaS，而是在本地项目里提供可视化拖拽的画面迁移建模能力，并把结果变成 Zhulong 可检索、可追踪、可审计的本地 artifact。

前置调查阶段：

- 研究前后端如何联动建模：screen / route / component / API / DB / permission / backend handler / test 之间如何建立可追踪关系。
- 研究前端可视化验证怎么做：AI 改前端代码后，如何用截图、DOM snapshot、accessibility tree、route state、视觉 diff 和交互 smoke 证明它改对了。
- 研究 AI 前端常见失败：调错组件、改错 route、遗漏 loading/empty/error state、样式局部正确但页面整体错位、截图看起来对但数据流不对。
- 研究如何把视觉证据写成 artifact：截图原图、diff 图、DOM/ARIA 摘要、交互步骤、失败定位和关联代码文件必须能进入 evidence / trace / cockpit。
- 研究是否需要引入 Playwright / Storybook / component preview / visual regression 工具，并明确哪些只在本地运行。
- 调查阶段产物先写成 `docs/field-notes/frontend-experience-intelligence-research.md` 或 `.planning/ui/FRONTEND_RESEARCH.md`，再决定是否实现拖拽画布和 `zl-ui-flow-*` 命令。

未来目标：

- 本地静态或本地服务式 UI 画布，支持拖拽创建 screen、route、modal、tab、state、transition。
- 每个画面节点可以关联 画面設計書、仕様、QA、API、DB、组件文件、测试文件和 evidence。
- 迁移边可以表达点击、提交、戻る、异常、权限不足、loading、empty state 等状态。
- 画布数据不是只存图片，必须保存为结构化文件，进入 docs sync / RAG / trace。
- AI 在 `zl-ui-phase`、`zl-plan-phase`、`zl-execute-phase` 中可以读取 screen flow，理解画面迁移和影响面。
- Graphify 侧可以把 screen -> route -> component -> file -> test 的关系接入代码图。

未来候选产物：

```text
.planning/ui/SCREEN_FLOW.json
.planning/ui/SCREEN_FLOW.md
.planning/ui/screen-flow.html
.planning/ui/screen-flow-assets/
```

未来候选命令：

```text
zl-ui-flow-init
zl-ui-flow-edit
zl-ui-flow-import
zl-ui-flow-query
zl-ui-flow-audit
```

边界：

- 默认 local-only，不接 Figma、外部白板或外部设计平台。
- 第一版优先支持本地 JSON + HTML viewer/editor，而不是复杂协同编辑。
- 画面截图、设计图、迁移关系进入 RAG 前必须保留原始文件路径和引用关系，不能只让 AI 根据图片猜。
- 调查阶段没有完成前，不进入拖拽编辑器实现，避免只做“看起来能画图”，但不能解决前端 AI 改错和前后端不一致的问题。

## 9. North Star

Zhulong 应该让 AI 辅助开发从“孤立 prompt”变成“有工程证据的开发过程”：

```text
stateful task
  -> specification-backed understanding
  -> code-map-aware implementation
  -> verified result
  -> durable project memory
```
