# Zhulong（烛龙）截图提取稿与本地改造计划

> 最近校对：2026-07-10。
>
> 当前结论：Zhulong 品牌基线已经统一。npm、CLI、runtime skills、文档、验证器、资源路径与生成报告统一使用 Zhulong / ZL 命名，Node.js 基线为 24，npm 发布内容由白名单控制。

> 来源：用户提供的 9 张截图，原截图顶部显示源文档为
> `/Users/di.l.wu/Downloads/cross-tech-wukong-kit/docs/session-2026-07-09-changes-and-rationale.md`。
>
> 说明：以下内容按截图可见文本去重、重排并人工校对。被截图裁切或遮挡、无法可靠恢复的极少量文字不做臆造；截图里的 `ct-wk-*` 是另一份 kit 的命令名，本地仓库使用 `zhulong` / `zl` 根入口与 `zl-*` 直接命令。

## 0. Zhulong 命名方向

推荐品牌名：**Zhulong（烛龙）**。

推荐定位语：

- 中文：点亮项目上下文、证据链与代码影响面的本地 AI 工程套件。
- 英文：A local AI engineering kit that illuminates project context, evidence, and code impact.

推荐命名策略：

- 产品展示名：`Zhulong（烛龙）`
- npm/local package 名：`zhulong-kit`
- CLI 入口：`zhulong` / `zl`，功能通过根命令子命令暴露。
- 直接命令：使用 `zl-*` 前缀。
- 内部数据目录：继续使用 `.planning/`，不改成 `.zhulong/`，避免破坏已有项目工作台。

## 1. 图片文字提取

> 本节是九张截图的历史原文转写，用于保留设计来源；其中的 `ct-wk-*`、旧路径、旧命令数量和当时环境限制不代表当前仓库。当前实现与验收以第 2 节之后的 `zhulong` / `zl-*` 映射为准。

### 0. 贯穿全程的设计红线（先立规矩，后面每条都遵守）

| 红线 | 为什么 |
| --- | --- |
| 判定必须机械（正则 / 集合 / schema，不调 LLM 做判定；LLM 只生成） | 大模型判定本身会幻觉；把“质量判定”交给确定性规则，结果可复跑、可审计。源自「Harness Engineering」与 `test-spec-demo` 的核心主张：机械式判定 > 大模型判定。 |
| 零运行时依赖（只 vendor 静态词表 + 借模式，不加任何 npm 依赖） | 保持离线、可商用、审查面收敛到 kit 本体，不背第三方供应链。 |
| 不依赖 hooks | 目标使用环境公司安全策略禁用 hooks（`disableAllHooks`）。用 verify 脚本 + skill frontmatter + Permissions `deny` 替代。 |
| 数字要有分母 / 默认不阻断 | 无分母的维度先做存在性 / 结构；新指标默认 `reference` 不阻断，仅 `strict` 纳入硬 gate（向后兼容，避免误报把老流程搞挂）。 |
| 误报可控 | 噪声词表默认关，`--strict` 才开；CJK 无词边界，单字词默认关。 |
| 合规：非中国产、且不引入需下载模型的方案 | 数据治理红线；这也是文档里把示例中的中国产 provider 换成通用占位的原因。 |

### 1. 机械式质量审计（P0 + P1）

#### 1.1 `ct-wk-ambiguity-audit` - 暧昧 / 不可判定 linter（P0-A1）

- 改了什么：新增命令，扫描抽取出的仕様 / 验收文档，命中“暧昧、不可判定”表达（EN/JA/ZH 三语言，按行自动分语言），产出 `ambiguity_hits` / `ambiguity_density`，写 `.planning/quality/AMBIGUITY_AUDIT.{json,md}`。
- 依据：
- EN 词表源自 INCOSE GtWR v4 + NASA ARM + Femmer Requirements Smells 的 requirement-smell 分类（概念 / 标准，非受版权词表，可自实现）。
- JA 词表源自日本仕様書 review 惯例（Qiita / IPA 形式手法材料）。
- ZH 词表源自 **GB/T 9385《计算机软件需求规格说明规范》**规范用词惯例 + Femmer 语言无关分类，自研整理。
- `EARS notation` 提供正向结构检查关键词。
- vendored 少量 MIT 英文弱词表（`write-good` / `words-weasels`）作为 `--strict` 扩展 pass，归属登记见 `THIRD_PARTY_LICENSES.md`。
- 为什么这么做：
- demo 的维度 #6“LLM 特有暧昧描述（適切に / 正しく ...）”的通用化，这是最高性价比的一块，词表现成、纯正则、零依赖。
- 关键判断：中文“应 / 应当 / 必须 / 不得”是规范关键词（等价 EARS 的 `shall`），是好的结构信号，必须不标记；日文表拦不住中文（字形 / 假名 / 词汇全不同），所以三语言独立成表、按行分语言。
- 误报控制：CJK 无词边界，“约”会命中“制约”，所以单字 CJK 词默认关、`--strict` 才开；EN 用 alpha 边界（lookbehind / lookahead），噪声宽表默认关。

#### 1.2 `ct-wk-structure-audit` - 制品结构完整性（P0-A3）

- 改了什么：新增命令，对 `.planning` 关键制品（`DOCUMENT_INDEX` / `ANSWER_AUDIT` / `AMBIGUITY_AUDIT` / `TRACE_MATRIX` / `REFRESH_STATE`）做确定性 mini-schema 校验，产出结构合规率，写 `.planning/quality/STRUCTURE_AUDIT.{json,md}`。
- 依据：复用仓库已有 `scripts/verify-schema.mjs` 的手写校验思路，借 Ajv 的错误对象形状 `{keyword, dataPath, message}`，但不加 Ajv 依赖（零依赖红线）。
- 为什么这么做：结构约束能减少下游 agent 因制品缺字段而反复重生成的 retry loop（顺带省 token）；同时给“完成前”一个可量化的体检数字。

#### 1.3 `ct-wk-answer-audit` 做硬（P1-A2）

- 改了什么：在原有“引用存在性”之上，新增三条机械式接地度量：`citation_resolve_rate`（解析进 `DOCUMENT_INDEX.json`）、`value_drift_count`（答案里的数值 vs 被引源同数值）、`unsupported_sentence_ratio`（USR）。默认咨询性、不阻断。
- 依据：
- 数值偏移移植 demo 的 `check_value_drift`。
- 接地度采用 USR（Unsupported Sentence Ratio）+ TF-IDF / n-gram 重叠，纯 Node 确定性；借 RAGAS 的非 LLM 度量族（string-similarity）思路，而非其 LLM Faithfulness。
- 明确拒绝 NLI / 嵌入模型接地检测，因为要下载 transformer（破坏离线 + 合规），且高召回下误报率高。
- 为什么这么做：把“AI 回答到底有没有根据”从人肉目视变成可量化数字；阈值先不硬 gate，等导入期用真实项目校准后再收紧（避免上来就误报）。

#### 1.4 cockpit 度量面板 + HTML 瘦身（P1-C1）

- 改了什么：`ct-wk-cockpit-build` 新增「Quality & Token Metrics」面板，聚合上述质量数字 + 可选 token 度量；同时修了一个真实 bug，此前把整份原始 `graph.json`（planning + graphify）嵌进 HTML 导致产物 16-18MB，改为只保留节点 / 边计数，实测 2.4MB graph 下 HTML 从会爆的体积降到 ~52KB。
- 依据：cockpit 模板本来只读 `.status`，原始 `.data` 是死重；graph 预览另有独立路径生成。
- 为什么这么做：让“可汇报数字”能一眼看到；顺手消除一个会拖垮页面 / git 的体积问题。

#### 1.5 Check1 `deny` 硬墙（P1-C2）+ token 效率约定（P1-B 线）

- 改了什么：新增 `runtime/claude-code/settings.template.json`（禁 `WebFetch` / 出网 CLI / 对需求源目录写入）；新增 `docs/context-efficiency.md`（B1 prompt-cache 稳定前缀 + `cache_control` 断点、B2 引用而非全文、B3 制品交接、B6 可选 `TOKEN_USAGE.json` 槽位）。
- 依据：
- Check1 物理预防对应「Harness Engineering」的 Process 机械化 / 分层 Check；`deny` 列表与 kit 已有的网络工具黑名单一致。
- B1 依据 Anthropic prompt caching（稳定前缀走缓存，读便宜约 90%）。
- 为什么这么做：`allowed-tools` 只是允许清单，真正的物理护栏要 `deny`；且这是不依赖 hooks 的表达方式（用 Permissions 层）。token 线因为 `ct-wk` 不直接调模型，只能落成“约定 + 可选度量”，不硬写抓取代码（诚实、不空转）。

### 2. 文档与产品面

#### 2.1 README 按能力重构 + 四处合并

- 改了什么：把原来按 MVP2/3/3.5/4.0/6 发布阶段叙述的 README 重排为五大能力（工作流护栏 / 文档智能 / 代码地图 / 证据闭环 / 质量审计新增）；合并四处重复：MVP 细节 -> changelog，快速开始 -> 链接 `commands.html`，RAG 三处 -> 快速参考 / 概念 / 运维分层并互链，验证段 -> 精简 + 链接 `quality-plan`。
- 依据：用户反馈“文档繁杂、有些偏差、宣传页缺痛点 / 疑虑”，参照产品 / 技术写作视角梳理。
- 为什么这么做：MVP 阶段号是内部演进视角，对用户是噪声；能力分区让读者按“我要干嘛”找入口，细节下沉到子文档，README 只留最小可复制命令。

#### 2.2 `product.html` 补强（宣传页）

- 改了什么：新增“痛点 -> 我怎么解决”对照表、「よくある疑問 -> 回答」FAQ、「普通の AI coding が出せない競争力」吹点栅格；把页面里的命令数从旧值统一到当前值。
- 依据：用户明确要“有疑虑我怎么解决、有痛点我怎么解决、然后吹一下”。
- 为什么这么做：宣传页要能正面回应导入前的真实顾虑（又一个聊天壳？数字可信吗？会锁定模型吗？禁 hooks 能用吗？），并用可打开的制品 / 可复跑的 verify 支撑，而不是空形容词。

#### 2.3 现场笔记脱敏（合规）

- 改了什么：把 `field-notes` 里作为运行示例的**中国产 provider（DeepSeek）**全部换成通用 `<external-provider>` 占位，保留“外部 = 数据可能离开本机”的安全教训；在 `field-notes` README 注明 `CR-017` / `30,000円` 等是 `japanese-doc-dev-fixture` 合成数据、非真实客户数据。
- 依据：与数据治理 / 合规红线一致（避免以中国产 provider 作运行示例），以及外发前脱敏惯例。
- 为什么这么做：文档里用中国产 provider 作范例本身与合规立场冲突；改成 provider-agnostic 既守合规又不丢那条“外部不保密”的真实教训。

### 3. 降低命令心智负担

背景：命令面较大（本次收尾时 74 条）。先做了一次调查，结论是日常真正要敲的只有 6-9 条，大量步骤已折进门面；真正的杠杆不是“自动跑更多重命令”，而是“更少要敲的门面 + 更强的 discovery”。

#### 3.1 只读零成本审计折进门面

- 改了什么：`ct-wk-docs-sync` 抽取后顺手跑 `ambiguity-audit`；`ct-wk-completion-check` 完成前顺带跑 `structure-audit`（打印合规率、不改 gate 退出）；`ct-wk-docs-query` 查完自动接一次 `answer-audit`（`.planning/config.json` 的 `knowledge.auto_answer_audit: false` 可关，默认开）。
- 依据：这三条都是只读、零成本、无网络；`docs-sync` 本来就在抽取后跑 `citation-audit`，同位置加暧昧扫描天然贴合。
- 为什么这么做：让用户“永远不用单独敲它们”，把表面从“记 N 条”降成“跑门面时自动带上”。

#### 3.2 重命令坚持显式，不自动嵌套

- 改了什么：`docs-index --run` / `graph-build --run` / `refresh-run` / `docs-sync --index` / `rag-init-local` / `offline-lock` / 外部 RAG，这 ~6 条保持显式。
- 依据：kit 自身的 “no-surprise facade” 原则（`WORKFLOW_FACADE` 里写死：门面只建议、不偷偷跑重命令）。
- 为什么这么做：自动跑重命令会毁掉三件事：成本控制（不该每任务全量重建）、本地合规（网络操作前要过隐私审计 + 显式确认）、无惊吓（用户得知道时间 / 钱花哪了）。

#### 3.3 新增 `ct-wk-next` + 扩 `help-skills`（discovery）

- 改了什么：新增 `ct-wk-next`，读当前 `.planning` 状态（有没有接入 / 基线、workflow gate 缺哪个、graph 是否 stale），直接给出接下来该跑的 2-3 条命令，写 `.planning/help/NEXT.md`；`ct-wk-help-skills` 场景库 5 -> 9（加质量审计 / 缺陷调查 / 状态演示 / 切换 RAG 后端）。
- 依据：`help-skills` 本就是“不用记、用问的”机制，但藏得深、场景少。
- 为什么这么做：心智负担的真解法是问一句而不是背 74 条，`ct-wk-next` 是“我现在该干嘛”的单一兜底入口。

#### 3.4 词表放哪（澄清一个常见误解）

- 决定：`ambiguity-wordlists.json` 保留在仓库根，作为 kit 规则库；审计命令运行时从 kit 读取，所以任何 `--target` 项目都默认被同一份词表检查、kit 更新即全局生效。项目要扩展可放 `.planning/knowledge/ambiguity-wordlists.json`，审计自动合并（同类目追加）。
- 依据 / 为什么：类比 ESLint 规则库，规则在工具里，不拷进每个仓库。拷进 `core/` 会被 `copyTemplateTree` 复制进每个目标项目、产生会过期的冻结副本。“每个项目默认都检查”这个诉求由“命令读 kit 词表”满足，不需要复制文件。

### 4. 验收结果

- 全命令面 74 / 74 覆盖（两条新命令 + `ct-wk-next` 均进 `verify:full-command-surface`）。
- 新增 / 相关 verify 全绿：`verify:ambiguity` / `verify:structure` / `verify:guardrails` / `verify:answer-audit` / `verify:docs-sync` / `verify:knowledge-reliability` / `verify:cockpit-build` / `verify:docs`（139 链接）/ `verify:docs-completeness`（74）/ `verify:naming` / `verify:schema` / `verify:workflow-closure` / `verify:mvp3` / `verify:mvp35` / `verify:workflow-facade` / `verify:policy-hardening` / `verify:init-policy` / `verify:skills-usability` / `verify:security-governance` / `verify:privacy-strict` / `verify:license`。
- 真实校准：对日 fixture 暧昧扫描 0 误报、中文样例“应 / 必须”正确不标；`docs-query` 自动接地、config 关闭回退成提示，均验证。
- 已知环境限制（非本次回归）：`verify:full-command-surface` 与聚合它的 `verify:business-chain` 在未安装 `graphrag` CLI 的机器上会因 `ct-wk-rag-init-local` 起不来而 FAIL；装了 `graphrag` 即绿。

### 5. 主要变更文件

| 区域 | 文件 |
| --- | --- |
| CLI 核心 | `bin/ct-wk.mjs`（ambiguity / structure / answer-audit、cockpit metrics + 瘦身、docs-sync / docs-query / completion-check 折叠、`ct-wk-next`、`help-skills` 场景） |
| 命令目录 / 构建 | `scripts/command-catalog.mjs`、`scripts/render-commands-doc.mjs` -> `docs/commands.html`、`package.json` |
| 新 verify | `scripts/verify-ambiguity.mjs`、`verify-structure.mjs`、`verify-guardrails.mjs`、`verify-full-command-surface.mjs`（补覆盖） |
| 词表 / schema | `ambiguity-wordlists.json`（仓库根）、`schemas/`、`THIRD_PARTY_LICENSES.md` |
| 护栏 / 约定 | `runtime/claude-code/settings.template.json`、`docs/context-efficiency.md` |
| cockpit | `bin/ct-wk.mjs` cockpit 区、`templates/cockpit/index.template.html`、`scripts/render-cockpit-sample.mjs` |
| 配置 | `core/planning/config.template.json`（`knowledge.auto_answer_audit`） |
| 文档 | `README.md`、`docs/architecture.md`、`docs/changelog.md`、`docs/product.html`、`docs/field-notes/*`、`docs/mechanical-audit-*.md` |

## 2. 当前工程基线

2026-07-10 的品牌与工程约定如下：

| 区域 | 最终约定 |
| --- | --- |
| 主品牌 | `Zhulong（烛龙）` |
| 完整名 | `Zhulong Project Intelligence Kit` |
| npm 包 | `zhulong-kit` |
| 主命令 | `zhulong` |
| 短命令 | `zl` |
| 直接命令 | `zl-*` |
| CLI 核心 | `bin/zl.mjs` |
| Codex skills | `runtime/codex/skills/zl-*` |
| Claude Code skills | `runtime/claude-code/skills/zl-*` |
| GitHub Copilot prompts | `runtime/github-copilot/prompts/zl-*.prompt.md` |
| 共享前缀 | 环境变量、模板变量和内部标识使用 `ZL_*` |
| Node.js | 24 LTS，`engines.node: >=24 <25` |
| 本地工作台 | `.planning/`，作为稳定数据协议保持不变 |
| 主图标 | `docs/assets/zhulong-icon.png` |
| 许可证 | 私有包，`UNLICENSED` |

命名规则是单向的：产品名只使用 Zhulong，技术短前缀只使用 ZL。仓库不提供其他品牌兼容入口，也不保留双命名文案。

## 3. 已完成的全工程统一

### 3.1 CLI 与 npm

- `package.json` 仅暴露 `zhulong`、`zl` 和 `zl-*`。
- 所有命令统一路由到 `bin/zl.mjs`。
- 命令目录、帮助文本、错误恢复建议和生成报告统一输出 Zhulong / ZL 名称。
- npm script 使用 `zl` 作为本地 CLI 入口。
- 逻辑子命令继续支持 `zhulong docs sync`、`zl docs sync` 等根命令形式。

### 3.2 Runtime packs

三套运行环境使用相同的 11 个命令族：

```text
zl-new-milestone
zl-spec-phase
zl-discuss-phase
zl-ui-phase
zl-debug
zl-plan-phase
zl-execute-phase
zl-code-review
zl-verify-work
zl-complete-milestone
zl-cockpit-build
```

- Skill frontmatter、展示名、默认 prompt、模板变量和安装器全部使用 ZL。
- Codex 使用 `$zl-*`。
- Claude Code 与 GitHub Copilot 使用 `/zl-*`。
- Runtime install/status 和 usability 验证以 ZL 路径为唯一来源。

### 3.3 资源、fixture 与验证

- 共享网页资源为 `docs/assets/zl-site.css` 和 `docs/assets/zl-site.js`。
- 架构图资源使用 `docs/assets/visuals/zl-*.svg`。
- 日文 fixture 使用 `zl.fixture.config.json` 和 `zl-seed/`。
- 本地审计目录使用 `.zl-audit/`，临时目录使用 `.zl-tmp/`。
- 验证脚本、质量报告、cockpit 模板与历史快照中的产品标识统一为 Zhulong / ZL。
- 命名验证器应把任何非 Zhulong / ZL 的产品前缀视为失败。

## 4. Node.js 24 与 npm 发布边界

### 4.1 Node.js 基线

仓库使用以下三处约束保持一致：

```text
package.json        engines.node = >=24 <25
.nvmrc              24
.node-version       24
```

示例 fixture 使用同一 Node.js 约束。验证时至少执行一次 Node.js 24 的语法检查和核心 smoke test。

### 4.2 npm 文件白名单

npm 包只包含运行所需内容：

```text
adapters/
ambiguity-wordlists.json
bin/zl.mjs
bin/quality-audits.mjs
core/
docs/assets/zhulong-icon.png
runtime/
schemas/
templates/
README.md
package.json
```

以下内容不进入 npm 包：

- `verification/` 下的报告与截图。
- `docs/assets/zhulong-icon-variants/` 和 `docs/assets/zhulong-selected-variants/`。
- 产品 HTML、开发计划、field notes 和内部审计文档。
- 本地 `.planning/`、`.zl-audit/`、`.zl-tmp/`。
- 示例 fixture 和开发验证脚本。

发布前固定运行 `npm pack --dry-run --json`，检查文件数、压缩体积、解包体积和最大文件。若发布内容新增目录，必须显式更新白名单。

## 5. 能力实施路线与完成映射

截图规划中的 Phase A-C 已全部落到当前 Zhulong 实现。Phase D 属于公开发布治理，需要仓库所有者先决定许可证和发布目标，不伪装成已完成。

### Phase A：机械式质量审计（已完成）

| 要求 | 当前实现 | 验证证据 |
| --- | --- | --- |
| 中英日 ambiguity audit | `zl-ambiguity-audit`；根词表与项目扩展合并；输出 hit、density 和逐行记录 | `verify:ambiguity` |
| 词表归属 | 当前三语词表完全自研，不复制 `write-good` / `words-weasels`；`THIRD_PARTY_LICENSES.md` 明确记录无 vendored 词表 | `verify:license` |
| 关键制品 structure audit | `zl-structure-audit`；检查五类关键 JSON 的确定性 mini-schema，输出合规率 | `verify:structure` |
| answer audit 做硬 | `citation_resolve_rate`、`value_drift_count`、`unsupported_sentence_ratio` | `verify:answer-audit` |
| 默认不误阻断 | 普通模式为 `WAIVED_WITH_RISK`，`--strict` 才把发现升级为失败 | ambiguity / structure fixture |
| 零运行时依赖 | 规则位于 `bin/quality-audits.mjs`，只使用 Node.js 标准库且不会被初始化器复制进目标项目 | `npm ls --omit=dev` 与语法检查 |

### Phase B：低心智负担门面（已完成）

| 要求 | 当前实现 | 验证证据 |
| --- | --- | --- |
| docs sync 折叠 ambiguity | 抽取后自动运行，只读且不触发索引 | `verify:docs-sync`、`verify:ambiguity` |
| docs query 折叠 answer audit | 查询命中后自动生成报告；`knowledge.auto_answer_audit=false` 可关闭 | `verify:answer-audit` |
| completion-check 折叠 structure | 完成检查同时刷新结构审计报告；strict 可阻断 | `verify:structure`、workflow 验证 |
| 重命令显式 | `docs-index --run`、`graph-build --run`、`refresh-run` 不被普通门面暗中调用 | `verify:mvp35`、`verify:workflow-facade` |
| deny 与 token 约定 | Claude Code deny 模板、禁 hooks/绕过模式、B1/B2/B3/B6 上下文约定 | `verify:guardrails` |

### Phase C：Discovery 与 cockpit（已完成）

| 要求 | 当前实现 | 验证证据 |
| --- | --- | --- |
| 单一下一步入口 | `zl-next` 读取本地状态，写 `NEXT.md`，只推荐 2-3 条命令 | 74 命令全表面验证 |
| help-skills 5 -> 9 | 新增机械质量审计、缺陷调查、状态演示、RAG 后端切换 | `verify:full-command-surface` |
| Quality & Token Metrics | cockpit 展示引用解析率、漂移、无依据句、暧昧、结构与可选 token 槽位 | `verify:cockpit-build` |
| HTML 瘦身 | cockpit 只保存节点/边计数和有限预览；大图切换聚合社区视图 | 大图 fixture 与 pack 体积检查 |

### Phase D：发布治理（待所有者决策）

- 先选择公开许可证，再移除 `private: true` 和 `UNLICENSED`。
- 公开仓库增加 `LICENSE`、`CONTRIBUTING.md`、`SECURITY.md`、issue / PR 模板。
- 建立 Node.js 24 持续集成、仓库 ruleset、受保护发布环境和 npm trusted publishing。
- 发布制品增加 provenance 与 artifact attestation；attestation 证明来源，不等同于证明软件安全。

## 6. 验收矩阵

### 6.1 零残留检查

```bash
rg -n -i --hidden \
  -g '!.git/**' \
  -g '!*.png' -g '!*.jpg' -g '!*.jpeg' -g '!*.gif' -g '!*.pdf' \
  '<forbidden-brand-token>' .
```

同时检查文件和目录名称。工作树中的品牌标识只允许 Zhulong、ZL、`zhulong` 和 `zl`。

### 6.2 基础验证

```bash
npm run check
npm run verify:docs
npm run verify:docs-completeness
npm run verify:ambiguity
npm run verify:structure
npm run verify:answer-audit
npm run verify:guardrails
npm run verify:naming
npm run verify:runtime
npm run verify:skills-usability
npm run verify:full-command-surface
```

### 6.3 发布验证

```bash
npm pack --dry-run --json
npm run verify:quality
npm run verify:quality-closure
npm run verify:business-chain
```

验收重点：

- `zhulong --help`、`zl --help` 和一个 `zl-*` 直接命令均可运行。
- 74 个公开逻辑命令全部进入命令手册与 full-command-surface。
- 33 个 runtime skill / prompt 渲染项全部通过。
- npm 包不包含验证截图和图标候选。
- 文档链接、共享 CSS / JS 和 SVG 路径没有断链。
- 生成报告不出现非 Zhulong / ZL 的产品标识。

## 7. 官方实践依据

- GitHub README 应聚焦项目用途、价值、开始方式、支持入口和维护信息，仓库内使用相对链接：[About READMEs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes)
- GitHub 建议启用安全功能、受保护分支和大文件治理，并使用社区健康文件：[Best practices for repositories](https://docs.github.com/en/repositories/creating-and-managing-repositories/best-practices-for-repositories)
- npm 的 `bin`、`files`、`engines`、`private` 和 `license` 字段共同定义 CLI 与发布边界：[package.json](https://docs.npmjs.com/files/package.json/)
- npm 推荐使用 `files` 白名单限制 tarball；trusted publishing 可避免维护长期 npm token：[Trusted publishing](https://docs.npmjs.com/trusted-publishers/)
- Node.js 生产环境应使用仍受支持的 LTS 版本，本工程固定到 24 LTS：[Node.js Releases](https://nodejs.org/en/about/previous-releases)
- Claude Code 的 deny 规则优先于 ask/allow；`disableAllHooks` 和禁用 bypass/auto 模式适合作为保密项目模板边界：[Settings](https://code.claude.com/docs/en/settings)、[Permissions](https://code.claude.com/docs/en/permissions)
- 发布制品后可使用 artifact attestation 证明制品的构建来源：[Artifact attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations)
- 品牌文档采用“定位、受众、支柱、交付物、边界和成功指标”的结构，参考 agency-agents 的 [Brand Guardian](https://github.com/msitarzewski/agency-agents/blob/main/design/design-brand-guardian.md)、[Product Manager](https://github.com/msitarzewski/agency-agents/blob/main/product/product-manager.md) 与 [Technical Writer](https://github.com/msitarzewski/agency-agents/blob/main/engineering/engineering-technical-writer.md) 角色模板。

## 8. 本次执行结果

2026-07-10 已完成并验证：

| 项目 | 结果 |
| --- | --- |
| 本地目录 | `/Users/frigidcrow/Documents/Zhulong-Project-Intelligence-Kit` |
| Node.js 验证 | Node.js 24.14.0 / npm 11.12.1（当前复核环境） |
| CLI | `zhulong`、`zl`、`zl-*`，共 75 个 npm bin |
| 全命令面 | 74 / 74 PASS |
| 机械质量审计 | ambiguity / structure / answer 三组 verifier PASS |
| 低心智门面 | 自动折叠、`zl-next`、9 类 help 场景 PASS |
| Cockpit | Quality & Token Metrics 与大图聚合 fixture PASS |
| Runtime packs | 3 套 runtime、33 个 skill / prompt PASS |
| 质量聚合 | `verify:quality` PASS |
| 质量收口 | `verify:quality-closure` PASS，12 项检查 |
| 业务链 | `verify:business-chain` PASS，6 个 gate |
| npm 包 | 2,145,021 bytes，解包 2,554,840 bytes，共 101 个文件 |
| 包安装 smoke | Node.js 24 下 `zhulong --help` 与 `zl --help` PASS |
| 新能力打包 | 根词表、`bin/quality-audits.mjs` 与三个新 bin 均可从 tarball 安装运行 |
| 发布排除 | 验证截图、验证报告、图标候选集均未进入 npm 包 |

品牌基线和 Phase A-C 至此收口。当前产品特色、证据和表达规则统一记录在 `docs/brand.md`。

## 9. 2026-07-10 全工程复核与下一步优化

### 已证明完成

- 品牌、CLI、runtime skills、npm 发布路径和本地目录只使用 Zhulong / ZL。
- README 为中文正文，必要品牌名、命令、状态词和技术缩写保持原样。
- 机械审计、低心智门面、discovery、cockpit 和 deny/context 约定均有实现与独立 verifier。
- 公开命令由 71 增至 74，命令目录、HTML 手册、full-command-surface 同步。
- 验证截图、历史报告和图标候选不在 npm 白名单内。

### 下一步 P0：建立远端持续集成

1. 在 GitHub Actions 固定 Node.js 24 和 npm 11，运行 `npm ci`、`verify:quality`、`verify:full-command-surface` 与 `npm pack --dry-run --json`。
2. 给默认分支配置 ruleset，要求质量 gate、review 和无未解决会话后才能合并。
3. CI 上传 verifier 报告作为短期 artifact，但不把截图和报告装进 npm 包。

### 下一步 P1：发布与供应链

1. 决定许可证和 npm scope，确认 `zhulong-kit` 名称所有权。
2. 使用 npm trusted publishing 和最小权限 GitHub 环境，不保存长期发布 token。
3. 为 tarball 生成 provenance / attestation，并在 release notes 记录 SHA-256、Node/npm 版本和命令面数量。

### 下一步 P2：真实项目校准

1. 在至少三个不同语言和规模的真实项目上收集 ambiguity 误报、USR 分布和数值漂移样本。
2. 阈值在拥有基线前继续默认不阻断；每次阈值变化都增加 fixture 和 changelog。
3. 为 `zl-next` 记录推荐命中率：用户是否采用首条建议、是否仍需查询命令手册。

### 下一步 P3：品牌与产品可观测性

1. README 与产品页继续按五个特色支柱组织，不以命令数量或 MVP 编号替代价值。
2. 每个新特色都补“问题、机制、产物、证据、边界”，并进入 `docs/brand.md` 的证明矩阵。
3. cockpit 后续可增加趋势快照，但保持静态、本地、可删除，不引入遥测上报。
