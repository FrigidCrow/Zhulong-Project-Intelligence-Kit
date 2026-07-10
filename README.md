<p align="center">
  <img src="docs/assets/zhulong-icon.png" width="112" alt="烛龙图标">
</p>

<h1 align="center">Zhulong（烛龙）</h1>

<p align="center">
  <strong>Zhulong Project Intelligence Kit</strong><br>
  适配文档密集型与非文档密集型项目的通用本地 AI 工程情报框架。
</p>

<p align="center">
  <a href="https://github.com/FrigidCrow/Zhulong-Project-Intelligence-Kit/actions/workflows/ci.yml"><img src="https://github.com/FrigidCrow/Zhulong-Project-Intelligence-Kit/actions/workflows/ci.yml/badge.svg" alt="Zhulong CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-d94714" alt="Apache License 2.0"></a>
  <a href="https://frigidcrow.github.io/Zhulong-Project-Intelligence-Kit/"><img src="https://img.shields.io/badge/docs-GitHub%20Pages-167b81" alt="GitHub Pages 文档"></a>
</p>

> 在线文档通过 GitHub Pages 发布。README 中的产品、命令和技术指南链接会打开渲染后的网页，而不是 GitHub 的 HTML 源码视图。文档站首页：[Zhulong 在线文档](https://frigidcrow.github.io/Zhulong-Project-Intelligence-Kit/)。

<p align="center">
  <a href="https://frigidcrow.github.io/Zhulong-Project-Intelligence-Kit/docs/product.html">产品介绍</a>
  · <a href="docs/brand.md">品牌与特色</a>
  · <a href="https://frigidcrow.github.io/Zhulong-Project-Intelligence-Kit/docs/commands.html">命令手册</a>
  · <a href="https://frigidcrow.github.io/Zhulong-Project-Intelligence-Kit/docs/technical-guide.html">技术指南</a>
  · <a href="docs/quality-plan.md">质量计划</a>
  · <a href="verification/reports/latest.md">最新验证报告</a>
</p>

## 这是什么

Zhulong Kit 是为 AI 编程工作准备的通用本地项目情报层。它帮助 AI 助手读取项目状态、按需检索项目资料、分析代码影响面、执行工作流门禁，并在任务完成前写回验证证据。它不绑定国家、语言、行业或技术栈，新项目、既有代码库、文档密集型项目和非文档密集型项目都可以按自己的约束接入。

它不替代 Codex、Claude Code、GitHub Copilot、GraphRAG 或 Graphify。它负责把这些工具连接到同一套本地项目记忆、证据链和确定性检查上。

`--rag none` 是非文档密集型项目的正式运行模式，不是功能不完整的降级模式。它关闭 RAG 安装、索引和 RAG 查询，但保留 workflow、codebase、Graphify、policy、evidence 与 completion gate；项目仍可按需使用轻量文档扫描和直接引用。只有当文档本身是需求、验收或合规依据时，才需要切换到 `--rag local`。

```text
zhulong
  -> 读取项目状态
  -> 按需查询需求、测试、决策记录与设计资料
  -> 检查代码地图、影响面与新鲜度
  -> 执行工作流门禁和质量验证
  -> 写回证据、风险与后续任务
```

## 品牌承诺

**照亮项目状态，让每个结论有依据，让每次完成经得起检查。**

Zhulong 的名字来自掌管昼夜与秩序的烛龙。这个意象在产品中对应三件具体的事：把隐藏的项目状态变得可见，把分散的代码、资料和决策关系组织成证据，把自动化限制在用户能够预期的边界内。

## 五个特色能力

| 特色 | 解决的问题 | 机制与证据 |
| --- | --- | --- |
| 烛照全局 | 不知道当前缺什么、下一步做什么 | `zl-next` 只给 2-3 条建议；cockpit 聚合真实制品 |
| 机械判定 | 规格暧昧、制品缺字段、回答无依据 | ambiguity、structure、answer 三组纯规则审计 |
| 证据闭环 | 结论和验证只留在聊天里 | citation、trace、evidence writeback 和完成门禁 |
| 昼夜有序 | 普通命令暗中联网或执行重刷新 | 只自动折叠零成本审计，重命令始终显式 |
| 本地边界 | 源码和规格可能误发到外部服务 | local-only、offline lock、privacy 与 outbound audit |

每项特色都按“用户问题、工作机制、关键产物、验证证据、能力边界”记录，完整规范见[品牌与特色能力规范](docs/brand.md)。

## 命名规范

| 场景 | 名称 |
| --- | --- |
| 主品牌 | Zhulong（烛龙） |
| 完整名 | Zhulong Project Intelligence Kit |
| 短名 | Zhulong Kit |
| 主命令 | `zhulong` |
| 短命令 | `zl` |
| 直接命令 | `zl-*` |
| npm 包 | `zhulong-kit` |
| 本地工作台 | `.planning/` |

## 环境要求

- Node.js 24 LTS。
- npm 11 或更高版本。
- 默认零运行时依赖，GraphRAG 与 Graphify 按需接入。

仓库提供 `.nvmrc` 和 `.node-version`，用于统一本地 Node.js 版本。

## 快速开始

在仓库内直接运行：

```bash
node bin/zl.mjs --help
node bin/zl.mjs docs status --target "$PWD"
```

建立本地命令链接：

```bash
npm link
zhulong --help
zl docs status --target "$PWD"
```

初始化一个已有项目：

```bash
zhulong init --target "$PWD" \
  --template brownfield-monorepo \
  --name my_project \
  --mode existing \
  --doc-policy reference \
  --rag none

zhulong codebase scan --target "$PWD"
zhulong preflight --target "$PWD"
zhulong verify --target "$PWD"
```

同一能力也可以使用短命令：

```bash
zl-init --target "$PWD" --template brownfield-monorepo --mode existing --doc-policy reference --rag none
zl-codebase-scan --target "$PWD"
zl-preflight --target "$PWD"
zl-completion-check --target "$PWD"
```

## 核心能力

| 能力 | 作用 | 常用入口 |
| --- | --- | --- |
| 项目接入 | 建立项目清单、规划目录和运行基线 | [`zhulong init`](https://frigidcrow.github.io/Zhulong-Project-Intelligence-Kit/docs/commands.html#cmd-zl-init) |
| 代码地图 | 扫描技术栈、目录、测试和架构 | [`zhulong codebase scan`](https://frigidcrow.github.io/Zhulong-Project-Intelligence-Kit/docs/commands.html#cmd-zl-codebase-scan) |
| 文档智能 | 抽取、规范化、同步并查询本地文档 | [`zhulong docs sync`](https://frigidcrow.github.io/Zhulong-Project-Intelligence-Kit/docs/commands.html#cmd-zl-docs-sync) |
| 本地检索 | 显式初始化本地 RAG，不在日常命令中执行隐藏重建 | [`zhulong rag init-local`](https://frigidcrow.github.io/Zhulong-Project-Intelligence-Kit/docs/commands.html#cmd-zl-rag-init-local) |
| 影响分析 | 构建代码图并分析变更影响和风险 | [`zhulong graph build`](https://frigidcrow.github.io/Zhulong-Project-Intelligence-Kit/docs/commands.html#cmd-zl-graph-build) |
| 里程碑工作流 | 从需求、计划、实现到验证组织完整闭环 | [`zhulong workflow run new-milestone`](https://frigidcrow.github.io/Zhulong-Project-Intelligence-Kit/docs/commands.html#cmd-zl-new-milestone) |
| 缺陷调查 | 结合规格证据和代码地图定位问题 | [`zhulong workflow run debug`](https://frigidcrow.github.io/Zhulong-Project-Intelligence-Kit/docs/commands.html#cmd-zl-debug) |
| 回答审计 | 检查引用、数值漂移和答案接地情况 | [`zhulong answer audit`](https://frigidcrow.github.io/Zhulong-Project-Intelligence-Kit/docs/commands.html#cmd-zl-answer-audit) |
| 暧昧审计 | 检查多语言需求与验收条件中的不可验证表达 | [`zhulong ambiguity audit`](https://frigidcrow.github.io/Zhulong-Project-Intelligence-Kit/docs/commands.html#cmd-zl-ambiguity-audit) |
| 结构审计 | 校验关键 `.planning/` 制品的 mini-schema | [`zhulong structure audit`](https://frigidcrow.github.io/Zhulong-Project-Intelligence-Kit/docs/commands.html#cmd-zl-structure-audit) |
| 下一步发现 | 根据项目状态推荐 2-3 条命令 | [`zhulong next`](https://frigidcrow.github.io/Zhulong-Project-Intelligence-Kit/docs/commands.html#cmd-zl-next) |
| 完成门禁 | 在任务完成前检查证据、风险和工作流状态 | [`zhulong workflow completion-check`](https://frigidcrow.github.io/Zhulong-Project-Intelligence-Kit/docs/commands.html#cmd-zl-completion-check) |
| 项目驾驶舱 | 生成本地静态项目状态与证据页面 | [`zhulong cockpit build`](https://frigidcrow.github.io/Zhulong-Project-Intelligence-Kit/docs/commands.html#cmd-zl-cockpit-build) |

## 工作模式

| 场景 | 推荐设置 | 默认不会做的事 |
| --- | --- | --- |
| 非文档密集型项目 | `--doc-policy reference --rag none` | 不安装、索引或查询 RAG；workflow、代码地图和 evidence 正常工作 |
| 文档密集型项目 | `--doc-policy strict --rag local` | 不使用未经批准的外部服务；把引用、新鲜度和回答依据纳入门禁 |
| 已有代码库 | 先扫描代码，再同步文档，按需构建代码图 | 不移动业务源码到 `.planning/` |
| 文档或决策记录更新 | 先执行轻量同步，确有需要时再显式建索引 | 不自动执行重型 GraphRAG 刷新 |
| 发布或交接 | 执行完成检查、策略检查和质量收口 | 不把缺失证据视为已完成 |

多语言能力只是审计覆盖，不是使用前提。内置中、英、日词表用于验证不同语言的需求表达；Zhulong 的项目模型、工作流和门禁对地域与语言保持中立。

## 本地优先原则

- Zhulong 默认执行 `local-only` 网络策略。
- Codex、Claude Code、GitHub Copilot 是外部 runtime，只由用户主动调用，不改变 Zhulong 命令的本地边界。
- `.planning/` 保存生成的项目情报制品。
- `reference` 模式把缺失证据记录为风险，不阻断普通开发。
- `strict` 模式会把缺失引用、过期代码图、过期 RAG 和策略失败纳入硬门禁。
- 外部 RAG 必须通过 `--allow-external-rag` 显式启用。
- 索引重建、代码图重建和外发操作必须由用户明确触发。
- 项目驾驶舱是本地静态 HTML，不需要远程服务。

## 刷新控制

| 命令 | 作用 |
| --- | --- |
| [`zl-preflight`](https://frigidcrow.github.io/Zhulong-Project-Intelligence-Kit/docs/commands.html#cmd-zl-preflight) | 只检查当前状态，不执行重型刷新 |
| [`zl-refresh-plan`](https://frigidcrow.github.io/Zhulong-Project-Intelligence-Kit/docs/commands.html#cmd-zl-refresh-plan) | 根据文档和代码变更生成刷新建议 |
| [`zl-refresh-run`](https://frigidcrow.github.io/Zhulong-Project-Intelligence-Kit/docs/commands.html#cmd-zl-refresh-run) | 在用户明确指定后执行 RAG 或代码图刷新 |
| [`zl-mode-status`](https://frigidcrow.github.io/Zhulong-Project-Intelligence-Kit/docs/commands.html#cmd-zl-mode-status) | 查看当前文档、RAG、代码图和严格模式状态 |
| [`zl-mode-set`](https://frigidcrow.github.io/Zhulong-Project-Intelligence-Kit/docs/commands.html#cmd-zl-mode-set) | 切换 `graph-lite`、`full-strict` 等运行模式 |

## 运行环境包

| 运行环境 | 目录 | 命令前缀 |
| --- | --- | --- |
| Codex | `runtime/codex/skills/zl-*` | `$zl-*` |
| Claude Code | `runtime/claude-code/skills/zl-*` | `/zl-*` |
| GitHub Copilot | `runtime/github-copilot/prompts/zl-*.prompt.md` | `/zl-*` |

## 文档入口

| 文档 | 内容 |
| --- | --- |
| [产品介绍](https://frigidcrow.github.io/Zhulong-Project-Intelligence-Kit/docs/product.html) | 产品定位、能力和常见疑问 |
| [品牌与特色能力规范](docs/brand.md) | 品牌基础、定位、特色支柱、语言与视觉规范 |
| [命令手册](https://frigidcrow.github.io/Zhulong-Project-Intelligence-Kit/docs/commands.html) | 全部命令、参数、输出和失败示例 |
| [技术指南](https://frigidcrow.github.io/Zhulong-Project-Intelligence-Kit/docs/technical-guide.html) | 架构、工作流、RAG、Graphify 和运行环境说明 |
| [Cockpit 样例](https://frigidcrow.github.io/Zhulong-Project-Intelligence-Kit/templates/cockpit/sample.html) | 本地项目驾驶舱的静态样例 |
| [质量计划](docs/quality-plan.md) | 测试矩阵、质量门禁和证据标准 |
| [CI 与发布治理](docs/ci-and-release.md) | GitHub Actions、ruleset、trusted publishing 与制品元数据 |
| [开源发布五轮复核](docs/open-source-release-review.md) | Apache 2.0、Pages、治理、安全与发布证据 |
| [运行环境包说明](docs/runtime-command-packs.md) | Codex、Claude Code 和 GitHub Copilot 安装方式 |
| [提取与本地计划](docs/zhulong-extraction-and-local-plan.md) | 截图提取、工程基线和后续优化路线 |
| [最新验证报告](verification/reports/latest.md) | 最近一次本地验证结果 |

## 开发与验证

基础检查：

```bash
npm run check
npm run verify:docs
npm run verify:naming
npm run verify:runtime
npm run verify:skills-usability
npm run verify:ambiguity
npm run verify:structure
npm run verify:guardrails
npm run verify:visual
npm run verify:design
npm run verify:pages
npm run verify:public-release
```

发布级检查：

```bash
npm run verify:quality
npm run verify:quality-closure
npm run verify:business-chain
```

`verify:quality` 只包含 GitHub Actions 可重现的确定性检查。需要 Ollama 和本地 GraphRAG 的真实集成验证使用 `npm run verify:quality:local-rag`。

`verify:visual` 使用 Playwright 检查文档与 cockpit 的桌面、移动端和暗色主题渲染。`verify:design` 固化品牌素材、信息层级、可访问性、动效边界和反模板化规则，防止后续修改退回通用 AI 产品页样式。

## 发布边界

npm 包通过 `files` 白名单只包含 CLI、模板、运行环境包、schema、adapter 和主图标。验证截图、图标候选集、历史报告与本地审计目录不会进入发布包。

## 图标

主图标统一使用 [`docs/assets/zhulong-icon.png`](docs/assets/zhulong-icon.png)。

## 许可证

本项目使用 [Apache License 2.0](LICENSE)。该许可证包含明确的版权授权、专利授权、再分发条件和免责声明。外部工具与非内嵌材料的许可边界见 [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md)。

npm 发布使用 GitHub OIDC trusted publishing，不保存长期 npm token。首次发布前仍需在 npm 为 `zhulong-kit` 配置 Trusted Publisher。

## 参与和安全

- 贡献流程：[CONTRIBUTING.md](CONTRIBUTING.md)
- 社区行为规范：[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- 安全漏洞私密报告：[SECURITY.md](SECURITY.md)
- 使用支持：[SUPPORT.md](SUPPORT.md)
