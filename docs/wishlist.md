# AI Project Intelligence Kit Wishlist

Status: working wishlist  
Date: 2026-06-25  
Full name: **AI Project Intelligence Kit**  
Documentation abbreviation: **AI-PIKit**  
Command namespace: **`pik-*`**

## 1. 产品定位

AI-PIKit 是一个面向文档密集型软件开发的 **AI 工程上下文框架**。

它不是：

- 替代 Codex、Claude Code、GitHub Copilot 的 AI runtime。
- 单纯的文档 RAG 产品。
- 单纯的代码图谱产品。
- 把 GSD、GraphRAG、Graphify 简单绑在一起。

它要解决的是：

> 让 AI 不只是会写代码，而是在项目上下文、仕様依据、代码影响面和验证闭环里写代码。

## 2. 目标场景

AI-PIKit 特别适合对日文档密集型开发：

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
| 产品全名 | AI Project Intelligence Kit |
| 文档缩写 | AI-PIKit |
| skills / CLI 命令 | `pik-*` |
| 不再作为用户入口 | `gsd-*` |

GSD 只作为 workflow 思路参考。用户应该调用：

- `pik-debug`
- `pik-plan-phase`
- `pik-execute-phase`
- `pik-code-review`
- `pik-verify-work`
- `pik-completion-check`

## 4. 理想工作流

普通 AI Coding：

```text
prompt
  -> 改代码
  -> 可能跑测试
```

AI-PIKit 目标工作流：

```text
用户请求
  -> 读取 AI-PIKit workflow state
  -> 查询 仕様 / QA / 議事録 / 設計書
  -> 查询 Graphify 代码地图 / 影响面 / 风险模块
  -> 生成计划
  -> 实施
  -> 测试验证
  -> 写回决策、证据、风险和后续事项
  -> completion gate 判断是否允许完成
```

## 5. 当前已落地能力

### 5.1 Native `pik-*` workflow

当前 AI-PIKit 已经拥有自己的 workflow command surface：

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
pik-docs-scan --target "$PWD"
pik-docs-extract --target "$PWD"
pik-rag-init-local --target "$PWD"
pik-docs-index --target "$PWD" --run
pik-docs-query --target "$PWD" --rag "仕様根拠は？"
```

### 5.3 Graphify 代码地图

Graphify 用于代码影响面：

```bash
pik-graph-build --target "$PWD" --run
pik-graph-query --target "$PWD" "変更対象"
pik-graph-impact --target "$PWD" --files "src/a.js"
pik-graph-risk --target "$PWD"
pik-graph-freshness --target "$PWD" --strict
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
pik-rag-golden-run --target "$PWD"
pik-citation-audit --target "$PWD"
pik-trace-build --target "$PWD"
pik-trace-audit --target "$PWD"
pik-policy-check --target "$PWD" --strict
pik-help-skills --target "$PWD" "我现在是文档更新情况，有没有适合我的命令"
```

## 6. Runtime 支持

AI-PIKit 明确支持：

- Codex
- Claude Code
- GitHub Copilot

安装方式：

```bash
pik-runtime-install --runtime codex --dest ~/.codex/skills
pik-runtime-install --runtime claude-code --dest ~/.claude/skills
pik-runtime-install --runtime github-copilot --dest .github/prompts
```

Runtime 适配只是入口差异。核心仍然是本地 `pik-*` CLI。

## 7. 保密边界愿望

保密项目默认应满足：

- 不需要外部 API key。
- 默认不把文档发给外部 LLM provider。
- `.planning/config.json` 中外部 URL、外部 provider、API key 形态会被审计。
- `pik-docs-index --run`、`pik-docs-query --rag`、`pik-graph-build --run` 在 local-only 模式下先过 privacy guard。

当前命令：

```bash
pik-offline-lock --target "$PWD"
pik-privacy-audit --target "$PWD" --strict
pik-outbound-audit --target "$PWD"
pik-policy-check --target "$PWD" --strict
```

## 8. 未来愿望

### MVP4: Knowledge Reliability Mode

- `pik-docs-sync`：文档更新后一键 scan / diff / extract / citation audit，只有显式 `--index` 才执行 GraphRAG index。
- `pik-answer-audit`：第一版检查回答是否有 citation、citation 源文件是否存在、行号是否合法；命中规格和幻觉风险判断进入后续增强。
- GraphRAG query route：local / global / drift / basic 自动选择。
- RAG 评估指标增强：context precision、context recall、faithfulness、answer relevancy。

### MVP5: MCP Runtime Layer

- `pik-mcp-serve`
- 通过 MCP 暴露 tools、resources、prompts。
- Codex / Claude / Copilot 通过同一套本地 MCP server 调用 AI-PIKit。

### MVP6: Policy-as-Code

- `pik-policy-lock`
- `pik-policy-diff`
- 项目级 policy 规则文件。
- 更严格的外发、license、文档证据和 completion policy。

### MVP7: QA 可视化驾驶舱

- 文档更新影响了哪些需求。
- 仕様依据连接到哪些代码。
- 哪些测试覆盖了哪些仕様。
- 哪些 workflow gate 还没过。
- 本次 AI 修改的证据链是否完整。

## 9. North Star

AI-PIKit 应该让 AI 辅助开发从“孤立 prompt”变成“有工程证据的开发过程”：

```text
stateful task
  -> specification-backed understanding
  -> code-map-aware implementation
  -> verified result
  -> durable project memory
```
