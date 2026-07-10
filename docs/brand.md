# Zhulong（烛龙）品牌与特色能力规范

本文定义 Zhulong Project Intelligence Kit 的品牌基础、产品定位、特色能力记载方式、视觉语言和对外表达。README、产品页、命令手册、发布说明和演示材料都以此为准。

## 1. 品牌基础

| 项目 | 定义 |
| --- | --- |
| 品牌名 | Zhulong（烛龙） |
| 完整名 | Zhulong Project Intelligence Kit |
| 简称 | Zhulong Kit |
| CLI | `zhulong`，短命令 `zl`，直接命令 `zl-*` |
| 品牌目的 | 照亮 AI 编程看不见的项目状态、代码影响、按需依据和完成条件。 |
| 愿景 | 让 AI 参与的软件工程具备可解释、可复跑、可审计的项目记忆。 |
| 使命 | 把项目状态、代码地图、按需文档、工作流门禁和验证证据连接成一套确定性的项目智能协议。 |
| 品牌承诺 | 每个重要结论都能找到依据，每次完成声明都能接受检查，每个重操作都由用户明确触发。 |
| 品牌人格 | 冷静、精确、克制、有判断力；神话感用于命名和视觉，不用于夸大能力。 |

“烛龙”掌昼夜、定寒暑的神话意象，在产品中对应的不是万能 AI，而是**把混沌项目状态照亮并恢复秩序**。眼睛代表可见性，环形龙身代表持续工程循环，橙色与青色分别代表证据和边界。

## 2. 产品定位

### 定位句

对于需要让 AI 理解真实项目状态、代码影响和完成条件的软件团队，Zhulong 是一套通用本地项目智能工具。它在 AI 修改代码前提供项目记忆，在修改过程中提供影响和策略边界，在任务完成前提供机械门禁。文档密集型项目可以启用本地 RAG、引用和追踪；非文档密集型项目使用完整的 `rag none` 路线，只保留真正需要的 workflow、codebase、graph、policy 和 evidence。它不绑定国家、语言、行业或技术栈，关键判断会落成可检查的本地制品，而不是停留在对话里。

### 核心受众

- 需要处理新项目、既有代码库、文档密集或非文档密集交付的开发者。
- 同时使用 Codex、Claude Code 或 GitHub Copilot，希望共享项目规则的团队。
- 对数据外发、证据留存、完成质量和重操作成本有明确要求的项目负责人。

### 不是什么

- 不是新的聊天界面。
- 不是替代 Codex、Claude Code、GitHub Copilot、GraphRAG 或 Graphify 的模型平台。
- 不是默认联网、默认建索引或默认重建代码图的自动化黑箱。
- 不是用一个总分掩盖缺失证据的展示面板。

## 3. 五个特色支柱

### 3.1 烛照全局：项目状态可见

- 用户问题：命令很多，接手项目后不知道当前缺什么、下一步做什么。
- 工作机制：`zl-next` 读取接入、代码基线、文档、代码图、追踪矩阵和工作流状态，只推荐 2-3 条命令。
- 关键产物：`.planning/help/NEXT.md`、`.planning/cockpit/`。
- 验证证据：`verify:full-command-surface`、`verify:cockpit-build`。
- 能力边界：只推荐，不自动执行；重型刷新保持显式。

### 3.2 机械判定：质量不交给模型猜

- 用户问题：规格中存在“适当、尽量、足够”等不可验收表达，关键制品也可能缺字段或损坏。
- 工作机制：`zl-ambiguity-audit`、`zl-structure-audit` 和 `zl-answer-audit` 使用正则、集合、mini-schema、数值比较和词法重叠做确定性判断。
- 关键产物：`AMBIGUITY_AUDIT`、`STRUCTURE_AUDIT`、`ANSWER_AUDIT` 的 Markdown 与 JSON。
- 验证证据：`verify:ambiguity`、`verify:structure`、`verify:answer-audit`。
- 能力边界：默认只报告；`--strict` 才阻断。当前不使用 NLI、嵌入模型或外部评测服务。

### 3.3 证据闭环：结论能够回到来源

- 用户问题：AI 的业务结论、测试结果和完成声明容易停留在聊天里。
- 工作机制：文档查询保留引用，回答审计检查引用解析率、数值漂移和无依据句比例，evidence writeback 把验证写回 issue、debug 或 phase。
- 关键产物：`DOCUMENT_INDEX.json`、`TRACE_MATRIX.json`、`.planning/evidence/`。
- 验证证据：`verify:docs-sync`、`verify:knowledge-reliability`、`verify:workflow-closure`。
- 能力边界：没有本地引用的内容按假设处理，不包装成已证实事实。

### 3.4 昼夜有序：自动化没有惊吓

- 用户问题：自动化工具可能在普通命令里暗中联网、重建索引或耗费大量时间和 token。
- 工作机制：只把零依赖、只读审计折进 `docs sync`、`docs query` 和 `completion-check`；GraphRAG、Graphify 和 refresh run 必须显式触发。
- 关键产物：`PREFLIGHT`、`REFRESH_PLAN`、`REFRESH_STATE`、`WORKFLOW_FACADE`。
- 验证证据：`verify:mvp35`、`verify:workflow-facade`、`verify:guardrails`。
- 能力边界：建议不是执行，状态检查不是刷新。

### 3.5 本地边界：项目资料默认留在本机

- 用户问题：规格、源码和客户资料可能被误发到外部 provider 或网络工具。
- 工作机制：默认 `local-only`，提供 offline lock、privacy audit、outbound audit 和不改写用户权限的 Claude Code 中性模板。
- 关键产物：`.planning/privacy/`、`.planning/policies/`、`runtime/claude-code/settings.template.json`。
- 验证证据：`verify:privacy-strict`、`verify:security-governance`、`verify:guardrails`。
- 能力边界：外部 RAG 需要显式确认；runtime 自身的网络行为由对应平台和组织策略管理。

## 4. 特色功能怎么记载

新增或升级任何特色能力时，必须同时记录以下五项：

```text
特色名称：用户能记住的中文名
用户问题：它消除什么真实摩擦
工作机制：确定性规则、数据流和命令入口
关键产物：写到哪里的 Markdown / JSON / HTML
验证证据：哪个 verifier、fixture 或可复跑命令证明它成立
能力边界：它明确不做什么，何时才进入 strict gate
```

README 使用一句话摘要和入口；产品页解释用户问题与差异；命令手册描述参数和失败恢复；changelog 记录行为变化；本文件维护长期定位。这样特色不会散落成“做过很多功能”的列表，也不会只剩宣传词。

## 5. 信息层级

1. 第一层：**本地项目智能层**，一句话说明 Zhulong 是什么。
2. 第二层：五个特色支柱，回答为什么值得使用。
3. 第三层：命令、制品和验证证据，证明能力真实存在。
4. 第四层：实现细节、schema、算法和运行环境，供维护者深入。

对外表达先讲用户问题和结果，再讲机制。不要用内部 MVP 编号当主卖点，不用命令数量代替价值，不把“采用某个流行框架”写成差异化。

## 6. 语言规范

- 推荐：本地、确定性、可复跑、证据、项目记忆、显式刷新、完成门禁、风险可见。
- 避免：全自动、绝对安全、零幻觉、万能、完全理解项目、企业级等未经证据支持的词。
- 中文正文使用“项目智能”“代码地图”“完成门禁”；首次出现时可附技术名词，如 GraphRAG、Graphify、RAG。
- 命令和文件名保持原样，不翻译。
- 状态词保持稳定：`PASS`、`FAIL`、`WAIVED_WITH_RISK`、`STALE_NEEDS_REFRESH`。

## 7. 视觉规范

- 主图标：`docs/assets/zhulong-icon.png`。
- 主色：深黑背景、证据橙、边界青；红色只表示阻断或风险。
- 图形：龙身环、纵向眼、轨道和检查节点；避免通用机器人、聊天气泡和无意义渐变装饰。
- 页面：信息密度优先，使用表格、状态、命令和真实制品；不把产品页做成只有口号的宣传页。
- 图标候选与验证截图属于设计和开发资料，不进入 npm 发布包。

## 8. 品牌证明指标

| 承诺 | 当前证明 |
| --- | --- |
| 命令真实可运行 | 74 / 74 公开命令进入全命令面验证 |
| 多 runtime 一致 | 3 套 runtime、33 个 skill / prompt 通过可用性检查 |
| 机械质量审计 | ambiguity、structure、answer 三组独立 verifier |
| 无隐藏重刷新 | docs、workflow、cockpit fixture 检查 `heavy refresh executed: no` |
| 本地发布边界 | npm `files` 白名单与 pack 安装 smoke |

这些数字是验证证据，不是永久不变的宣传数字。命令或 runtime 变化时，文档必须从最新报告同步。
