# Zhulong（烛龙）截图提取稿与本地改造计划

> 来源：用户提供的 9 张截图，原截图顶部显示源文档为
> `/Users/di.l.wu/Downloads/cross-tech-wukong-kit/docs/session-2026-07-09-changes-and-rationale.md`。
>
> 说明：以下内容按截图可见文本去重、重排并人工校对。被截图裁切或遮挡、无法可靠恢复的极少量文字不做臆造；截图里的 `ct-wk-*` 是另一份 kit 的命令名，本地仓库当前对应入口是 `pik-*`。

## 0. Zhulong 命名方向

推荐品牌名：**Zhulong（烛龙）**。

推荐定位语：

- 中文：点亮项目上下文、证据链与代码影响面的本地 AI 工程套件。
- 英文：A local AI engineering kit that illuminates project context, evidence, and code impact.

推荐命名策略：

- 产品展示名：`Zhulong（烛龙）`
- npm/local package 名：`zhulong-kit`
- 新 CLI 入口：`zhulong` / `zhulong-*`
- 兼容入口：保留 `pik` / `pik-*`，至少一个版本周期不删除。
- 内部数据目录：继续使用 `.planning/`，不改成 `.zhulong/`，避免破坏已有项目工作台。

## 1. 图片文字提取

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

## 2. 本地仓库现状映射

本地仓库当前是 AI Project Intelligence Kit / AI-PIKit，CLI 主入口为 `bin/pik.mjs`，命令面在 `package.json` 中以 `pik` / `pik-*` 暴露。与截图中的 `ct-wk-*` 方案相比，本地已有这些基础：

| 能力 | 本地现状 | 计划判断 |
| --- | --- | --- |
| CLI 单文件核心 | 已有 `bin/pik.mjs` | 新功能优先落在这里，避免引入新 runtime 依赖。 |
| 命令目录生成 | 已有 `scripts/command-catalog.mjs`、`scripts/render-commands-doc.mjs`、`docs/commands.html` | 新命令和 `zhulong-*` alias 必须同步进目录。 |
| 回答审计 | 已有 `pik-answer-audit` 和 `scripts/verify-answer-audit.mjs` | 不是新建，而是增强为 citation rate / value drift / USR。 |
| docs sync / docs query | 已有 `pik-docs-sync`、`pik-docs-query` | 可折入只读 audit，但重命令仍保持显式。 |
| cockpit | 已有 `pik-cockpit-build`、`templates/cockpit/index.template.html` | 增加 Quality & Token Metrics，并确认不嵌大 graph。 |
| 命令全覆盖 | 当前报告文档显示 71 / 71 | 新增命令后更新为新的总数，不直接照搬截图的 74。 |
| ambiguity / structure audit | 本地未发现对应命令与 verify 脚本 | 需要新建。 |
| `runtime/claude-code/settings.template.json` | 本地未发现 | 需要新建，同时考虑 Codex runtime 是否也需要等价说明。 |
| `docs/context-efficiency.md` | 本地未发现 | 需要新建。 |
| `THIRD_PARTY_LICENSES.md` | 本地未发现 | 若 vendor 英文弱词表，必须新建。 |
| `ambiguity-wordlists.json` | 本地未发现 | 需要放仓库根，目标项目扩展放 `.planning/knowledge/ambiguity-wordlists.json`。 |

## 3. 本地完整修改计划

### Phase 0：命名与兼容边界确认

目标：让 `Zhulong（烛龙）` 成为新品牌，但不破坏现有 `pik-*` 项目。

改动：

- `package.json`
  - `"name"` 从 `ai-project-intelligence-kit` 改为 `zhulong-kit`。
  - `"description"` 改为 Zhulong 定位语。
  - 新增 `zhulong` / `zhulong-*` bin aliases，先映射到 `./bin/pik.mjs`。
  - 保留 `pik` / `pik-*` bin aliases，作为 legacy compatibility。
- `bin/pik.mjs`
  - 增加对 `zhulong-*` executable 名的 alias 解析。
  - help 文案首屏显示 `Zhulong（烛龙）`，同时标注 `pik-*` 仍可用。
- 文档命名
  - README、product、architecture、quality-plan、runtime-command-packs 使用 `Zhulong（烛龙）` 作为主名。
  - 首次出现处说明：formerly AI-PIKit / `pik-*`。
- 不改：
  - 不改 `.planning/`，不改已生成的历史 verification 报告目录。
  - 不删除 `pik-*`，避免 runtime pack、旧项目脚本和验证报告断裂。

验收：

- `node --check bin/pik.mjs`
- `node bin/pik.mjs --help`
- `node bin/pik.mjs init --help` 或等价 help smoke
- `npm run verify:naming`

### Phase 1：命令目录与文档生成支持双命名

目标：命令手册里展示 `zhulong-*` 为主入口，同时保留 `pik-*` 兼容入口。

改动：

- `scripts/command-catalog.mjs`
  - 抽出 canonical command id，例如 `docs-sync`。
  - 渲染时主命令为 `zhulong-docs-sync`，legacy alias 为 `pik-docs-sync`。
  - `LOGICAL_NAMES` / `OUTPUTS` 不再和 `pik-*` 字符串强绑定。
- `scripts/render-commands-doc.mjs`
  - 更新锚点策略：推荐新锚点 `cmd-zhulong-*`，兼容旧锚点 `cmd-pik-*` 可保留跳转或别名说明。
- `docs/commands.html`
  - 重新生成。
- `README.md`
  - 快速开始命令改用 `zhulong-*`。
  - 兼容段落说明旧 `pik-*` 可继续执行。

验收：

- `npm run verify:docs-completeness`
- `npm run verify:full-command-surface`

### Phase 2：新增机械式质量审计

目标：实现截图里最关键的“机械式判定”能力，不调 LLM、不加 npm runtime 依赖。

新增 / 修改：

- `ambiguity-wordlists.json`
  - 放仓库根。
  - 结构建议：`languages.en.weak_terms`、`languages.ja.weak_terms`、`languages.zh.weak_terms`、`positive_terms`、`strict_only`、`metadata.licenses`。
- `THIRD_PARTY_LICENSES.md`
  - 如果 vendored `write-good` / `words-weasels` 的 MIT 弱词表，登记来源、license、截取范围。
- `bin/pik.mjs`
  - 新增 `ambiguity audit` 子命令。
  - 新增 executable aliases：`zhulong-ambiguity-audit`、`pik-ambiguity-audit`。
  - 输出 `.planning/quality/AMBIGUITY_AUDIT.json` 和 `.planning/quality/AMBIGUITY_AUDIT.md`。
  - 支持 `--strict`、`--target`、`--from`。
  - 按行语言检测，CJK 单字词默认关闭。
- `scripts/verify-ambiguity.mjs`
  - 覆盖 EN/JA/ZH 命中。
  - 覆盖中文“应 / 应当 / 必须 / 不得”不误报。
  - 覆盖项目扩展词表 `.planning/knowledge/ambiguity-wordlists.json` 追加合并。
- `package.json`
  - 增加 `verify:ambiguity`，纳入 `verify:quality`。

验收：

- `npm run verify:ambiguity`
- `npm run verify:docs-sync`
- `npm run verify:full-command-surface`

### Phase 3：新增结构审计并接入 completion check

目标：对 `.planning` 关键制品做 mini-schema 体检，先提示不阻断。

新增 / 修改：

- `bin/pik.mjs`
  - 新增 `structure audit` 子命令。
  - 新增 executable aliases：`zhulong-structure-audit`、`pik-structure-audit`。
  - 输出 `.planning/quality/STRUCTURE_AUDIT.json` 和 `.planning/quality/STRUCTURE_AUDIT.md`。
  - 校验对象：`DOCUMENT_INDEX`、`ANSWER_AUDIT`、`AMBIGUITY_AUDIT`、`TRACE_MATRIX`、`REFRESH_STATE`。
  - 错误对象形状保持 `{keyword, dataPath, message}`。
- `scripts/verify-structure.mjs`
  - 覆盖缺文件、缺字段、合法结构、合规率计算。
- `pik-completion-check`
  - 完成前自动跑 structure audit。
  - 默认只打印合规率，不改变原 gate exit。
  - `--strict` 或 strict profile 下再考虑阻断。
- `package.json`
  - 增加 `verify:structure`，纳入 `verify:quality`。

验收：

- `npm run verify:structure`
- `npm run verify:workflow-closure`
- `npm run verify:full-command-surface`

### Phase 4：增强 answer audit 的接地度量

目标：把“是否有依据”从 citation 存在性升级为可量化的机械指标。

修改：

- `bin/pik.mjs`
  - 在现有 `answerAudit()` 中增加：
    - `citation_resolve_rate`
    - `value_drift_count`
    - `unsupported_sentence_ratio`
  - 读取 `DOCUMENT_INDEX.json` 解析 citation。
  - 从答案和引用源中抽取数字，做 value drift 比对。
  - 用 TF-IDF / n-gram overlap 计算句子支持度，不引入 embeddings / transformer。
  - 默认 `reference` 模式 advisory；strict profile 再收紧阈值。
- `scripts/verify-answer-audit.mjs`
  - 扩展覆盖 value drift、USR、citation resolve rate。
- `templates/cockpit/sample-data.json`
  - 增加 answer audit 新指标样例。

验收：

- `npm run verify:answer-audit`
- `npm run verify:knowledge-reliability`
- `npm run verify:cockpit-build`

### Phase 5：把只读审计折进门面

目标：减少用户需要记忆的命令，同时保持 no-surprise，不偷偷跑重命令。

修改：

- `docs-sync`
  - 默认流程从 diff / extract / citation audit 扩展为 diff / extract / citation audit / ambiguity audit。
  - 不触发 RAG index，除非 `--index`。
- `docs-query`
  - 查询后默认自动跑一次 answer audit。
  - 新增配置 `knowledge.auto_answer_audit`，默认 `true`，可在 `.planning/config.json` 关闭。
- `completion-check`
  - 默认附带 structure audit summary。
  - 不改变现有非 strict gate 退出行为。
- `core/planning/config.template.json`
  - 增加 `knowledge.auto_answer_audit: true`。
- `scripts/verify-docs-sync.mjs`
  - 增加 ambiguity audit 被触发、但不触发 heavy refresh 的断言。
- `scripts/verify-knowledge-reliability.mjs`
  - 增加 docs query -> answer audit 自动链路。

验收：

- `npm run verify:docs-sync`
- `npm run verify:knowledge-reliability`
- `npm run verify:workflow-facade`

### Phase 6：新增 `zhulong-next` 与扩展 help-skills

目标：提供“我现在该干嘛”的单一入口。

修改：

- `bin/pik.mjs`
  - 新增 `next` 子命令。
  - 新增 executable aliases：`zhulong-next`、`pik-next`。
  - 读取 `.planning/config.json`、`.planning/codebase/CODEBASE_STATUS.md`、workflow state、graph freshness、docs status、quality reports。
  - 输出 2-3 条 next commands。
  - 写 `.planning/help/NEXT.md`。
- `help-skills`
  - 扩展场景：质量审计、缺陷调查、状态演示、切换 RAG 后端。
  - 推荐命令以 `zhulong-*` 为主，括号提示 legacy `pik-*`。
- `scripts/verify-skills-usability.mjs`
  - 如果 runtime pack 改名，补新 skill/prompt 名称检查。

验收：

- `zhulong-next --target "$PWD"` smoke
- `npm run verify:skills-usability`
- `npm run verify:full-command-surface`

### Phase 7：cockpit 质量与 token 面板

目标：把新增审计结果可视化，同时确认 HTML 不嵌大 graph。

修改：

- `bin/pik.mjs` cockpit 区
  - 收集 `AMBIGUITY_AUDIT.json`、`STRUCTURE_AUDIT.json`、`ANSWER_AUDIT.json`、可选 `TOKEN_USAGE.json`。
  - 生成 Quality & Token Metrics view model。
  - 确认 graph 只保留摘要、计数、聚合预览，不把完整大 `graph.json` 注入 HTML。
- `templates/cockpit/index.template.html`
  - 增加质量指标区域。
- `scripts/render-cockpit-sample.mjs`
  - 更新 sample 数据。
- `scripts/verify-cockpit-build.mjs`
  - 增加 HTML size 上限断言。
  - 增加 quality metrics 渲染断言。

验收：

- `npm run verify:cockpit-build`
- `npm run build:cockpit-sample`

### Phase 8：护栏、token 约定与合规脱敏

目标：把截图中的 guardrail 和合规文档落地。

新增 / 修改：

- `runtime/claude-code/settings.template.json`
  - 设置 Permissions `deny`：`WebFetch`、出网 CLI、对需求源目录写入。
  - 和本地 `FORBIDDEN_NETWORK_COMMANDS` 保持一致。
- `docs/context-efficiency.md`
  - 写明 B1 prompt-cache 稳定前缀、B2 引用而非全文、B3 制品交接、B6 可选 `TOKEN_USAGE.json`。
- `scripts/verify-guardrails.mjs`
  - 检查 settings template、deny 列表、无 hooks 依赖、文档存在。
- `docs/field-notes/*`
  - 搜索 DeepSeek / 中国产 provider 示例，替换为 `<external-provider>`。
  - 在 field-notes README 标注 fixture 数据非真实客户数据。
- `package.json`
  - 新增 `verify:guardrails`，纳入 `verify:quality`。

验收：

- `npm run verify:guardrails`
- `npm run verify:privacy-strict`
- `npm run verify:security-governance`
- `npm run verify:license`

### Phase 9：README / product / architecture 收口

目标：完成从 AI-PIKit 到 Zhulong 的体验层改名，并把新能力讲清楚。

修改：

- `README.md`
  - 首屏改为 `# Zhulong（烛龙）`。
  - 五大能力：工作流护栏、文档智能、代码地图、证据闭环、质量审计。
  - 快速开始用 `zhulong-*`。
  - 加一段“旧 `pik-*` 命令仍兼容”。
- `docs/product.html`
  - 加痛点 -> 解法表。
  - 加 FAQ。
  - 加“普通 AI coding 做不到的竞争力”栅格。
  - 更新命令数量。
- `docs/architecture.md`
  - 更新架构名、命令名、质量审计链路。
- `docs/changelog.md`
  - 新增 Zhulong rename + quality audit milestone。
- `docs/quality-plan.md`
  - 增加 ambiguity / structure / guardrails / next 的验证矩阵。

验收：

- `npm run verify:docs`
- `npm run verify:docs-completeness`
- `npm run verify:naming`

### Phase 10：最终验证矩阵

目标：保证改名、命令新增、文档和质量审计没有断链。

最小验证：

```bash
npm run check
npm run verify:ambiguity
npm run verify:structure
npm run verify:answer-audit
npm run verify:docs-sync
npm run verify:knowledge-reliability
npm run verify:cockpit-build
npm run verify:docs-completeness
npm run verify:full-command-surface
```

发布前验证：

```bash
npm run verify:quality
npm run verify:quality-closure
npm run verify:business-chain
```

风险点：

- `zhulong-*` 与 `pik-*` 双命令会让命令面数量膨胀，`verify:full-command-surface` 需要支持“canonical 命令 + legacy alias”分组，否则验证成本会翻倍。
- Runtime skills/prompt 文件目前大量以 `pik-*` 命名，建议先显示层改名，再决定是否重命名 skill 文件。
- 历史 verification reports 含大量 `AI-PIKit` / `pik-*` 文本，不建议批量改历史报告；新报告从改名后自然生成。
- 如果加入第三方弱词表，必须先写清 `THIRD_PARTY_LICENSES.md`，避免“零依赖”变成“隐形 license 债”。

## 4. 建议实施顺序

1. 先做 Phase 0-1：品牌与 `zhulong-*` alias。这一步能立刻让 kit 变成“烛龙”，但风险最低。
2. 再做 Phase 2-4：ambiguity / structure / answer audit。这是截图里真正有技术杠杆的部分。
3. 然后做 Phase 5-7：把只读审计折进门面、增加 `zhulong-next`、更新 cockpit。
4. 最后做 Phase 8-10：护栏、脱敏、文档收口和全量验证。

推荐第一批 PR / commit 只包含：

- `package.json` 增加 `zhulong` / `zhulong-*` aliases，保留 `pik-*`。
- `bin/pik.mjs` 支持 `zhulong-*` executable alias。
- README / product 首屏改名。
- 命令手册生成逻辑显示新主名 + 旧别名。
- `npm run check && npm run verify:naming && npm run verify:docs-completeness` 通过。

这样“名字先立住”，后面的质量审计可以逐块加，不会一次把命令面、runtime pack、docs、verify 全部搅在一起。

## 5. 全工程改名计划：Zhulong Project Intelligence Kit

这份计划专门覆盖“整个工程从 AI-PIKit / Project-Intelligence-Kit 迁移到 Zhulong（烛龙）”的改名工作。目标不是只改 README，而是让 GitHub 仓库、npm 包名、CLI、runtime skills、文档、验证脚本和本地文件夹都对齐。

### 5.1 最终命名规范

| 场景 | 使用名称 |
| --- | --- |
| 主品牌 | `Zhulong（烛龙）` |
| 完整名 | `Zhulong Project Intelligence Kit` |
| 短名 | `Zhulong Kit` |
| npm package | `zhulong-kit` |
| GitHub repo | `zhulong-project-intelligence-kit` |
| 主 CLI | `zhulong` |
| 短 CLI | `zl` |
| legacy CLI | `pik` / `pik-*`，保留一个兼容周期 |
| runtime skill 前缀 | `zhulong-*` |
| legacy skill 前缀 | `pik-*`，保留 wrapper 或迁移说明 |
| 本地工作台目录 | `.planning/` 保持不变 |

不建议使用：

- `Dragon Kit`：太直译，工程感弱。
- `Candle Dragon AI`：容易显得中二，不像开发者工具。
- `ZLKit`：可作为内部缩写，不适合作为第一品牌。

### 5.2 仓库与本地文件夹改名

你会在 GitHub 上改仓库名；本地建议同步改成无空格、全小写、短横线形式。

当前本地路径是：

```text
/Users/frigidcrow/Documents/Project-Intelligence-Kit 
```

注意：这个文件夹名末尾看起来有一个空格。改名时建议顺手去掉。

建议本地改名命令：

```bash
cd /Users/frigidcrow/Documents
mv "Project-Intelligence-Kit " "zhulong-project-intelligence-kit"
cd "zhulong-project-intelligence-kit"
```

GitHub 仓库改名后，更新 remote：

```bash
git remote set-url origin git@github.com:<owner>/zhulong-project-intelligence-kit.git
git remote -v
```

如果你使用 HTTPS remote：

```bash
git remote set-url origin https://github.com/<owner>/zhulong-project-intelligence-kit.git
```

验收：

```bash
pwd
git status --short
git remote -v
```

### 5.3 package 与 CLI 迁移

第一阶段采用“新主入口 + 旧兼容入口”：

- `package.json`
  - `"name": "zhulong-kit"`
  - `"description": "Zhulong Project Intelligence Kit for local, evidence-grounded AI engineering."`
  - 新增 bin：`zhulong` -> `./bin/pik.mjs`
  - 新增 bin：`zl` -> `./bin/pik.mjs`
  - 保留现有 `pik` / `pik-*` bin。

推荐主命令形态：

```bash
zhulong init --target "$PWD"
zhulong docs sync --target "$PWD"
zhulong workflow completion-check --target "$PWD"
zhulong cockpit build --target "$PWD"
```

推荐短命令形态：

```bash
zl docs sync --target "$PWD"
zl cockpit build --target "$PWD"
```

暂不推荐第一阶段新增全部 `zhulong-*` / `zl-*` 短横线 bin，因为这会让 `package.json` 命令面立即从 70+ 翻倍到 140+，同时让 `verify:full-command-surface` 成本翻倍。等根命令稳定后再决定是否增加：

```text
zhulong-init
zhulong-docs-sync
zhulong-completion-check
...
```

需要修改：

- `package.json`
- `bin/pik.mjs` 的 `usage()` 文案，显示 `Zhulong（烛龙）`。
- `scripts/command-catalog.mjs`，把 canonical command 从 `pik-*` 字符串中抽离。
- `scripts/render-commands-doc.mjs`，让命令手册主推 `zhulong <group> <command>`，兼容显示 `pik-*`。
- `scripts/verify-full-command-surface.mjs`，增加 root CLI smoke：`zhulong --help`、`zl --help`、`zhulong docs status --target <fixture>`。

验收：

```bash
npm run check
node bin/pik.mjs --help
node bin/pik.mjs docs status --target "$PWD"
```

在本地 npm link 后：

```bash
zhulong --help
zl --help
```

### 5.4 Skills 与 runtime packs 迁移

现有 runtime pack 结构：

```text
runtime/codex/skills/pik-*/SKILL.md
runtime/claude-code/skills/pik-*/SKILL.md
runtime/github-copilot/prompts/pik-*.prompt.md
```

目标结构：

```text
runtime/codex/skills/zhulong-*/SKILL.md
runtime/claude-code/skills/zhulong-*/SKILL.md
runtime/github-copilot/prompts/zhulong-*.prompt.md
```

迁移策略：

1. 新建 `zhulong-*` canonical skill/prompt。
2. 保留 `pik-*` legacy wrapper 一个版本周期。
3. `runtime install` 默认安装 `zhulong-*`。
4. 增加 `--legacy-pik` 或 `--compat-pik` 选项，允许安装旧名。
5. skills 内部文案全部改成 `Zhulong Kit` / `zhulong`。
6. 如果 skill frontmatter 有 `name: pik-*`，改为 `name: zhulong-*`。
7. GitHub Copilot prompt 文件同样改主名，但保留旧 prompt 文件并写 migration note。

需要更新的验证：

- `scripts/verify-skills-usability.mjs`
  - 默认检查 `zhulong-*` skill/prompt。
  - legacy 检查单独分组，避免主 gate 因旧名存在而失败。
- `scripts/verify-runtime-packs.mjs`
  - runtime install/status 输出新名。
- `docs/runtime-command-packs.md`
  - 主路径显示 `zhulong-*`。
  - 增加从 `pik-*` 迁移到 `zhulong-*` 的段落。

验收：

```bash
npm run verify:runtime
npm run verify:skills-usability
```

### 5.5 命名校验更新

当前 `scripts/verify-naming.mjs` 是旧规则，专门强制 `AI-PIKit`，因此改 README 后它会自然失败。需要把它升级为 Zhulong 规则。

新规则：

- 允许主品牌：`Zhulong（烛龙）`
- 允许完整名：`Zhulong Project Intelligence Kit`
- 允许短名：`Zhulong Kit`
- 禁止新增裸 `AI-PIKit`，除非在 migration / legacy 语境。
- 禁止新增 `Project Intelligence Kit` 但没有 `Zhulong` 前缀。
- 禁止用户文档主推 `pik-*`，除非标为 legacy compatibility。
- 禁止 runtime skill 新增 `pik-*` canonical 名称。

建议允许列表：

- `docs/zhulong-extraction-and-local-plan.md` 中可以出现 `AI-PIKit` / `pik-*`，因为它是迁移说明。
- 历史 `verification/reports/` 不扫描或作为历史报告跳过。
- `bin/pik.mjs` 中允许 legacy alias 表。

验收：

```bash
npm run verify:naming
```

### 5.6 README 的 GitHub 风格

README 首页目标：

- 顶部居中 canonical PNG icon。
- H1：`Zhulong（烛龙）`
- 副标题：`Zhulong Project Intelligence Kit`
- 一句话说明：local AI engineering intelligence for context-heavy software projects.
- badges：Node、local-first、RAG optional、license status。
- 快速开始：使用 `zhulong` / `zl` 根命令。
- 表格化说明 capabilities、docs、runtime packs。
- 明确 migration status：`pik-*` 是 legacy compatibility。
- 放 GitHub repo rename checklist。
- 放 icon 资产路径。

已新增建议资产：

```text
docs/assets/zhulong-icon.png
docs/assets/zhulong-icon-concept.png
```

GitHub 仓库头像建议用：

```text
docs/assets/zhulong-icon.png
```

README 顶部建议用：

```text
docs/assets/zhulong-icon.png
```

### 5.7 Icon 与视觉系统

视觉方向：

- 不是写实龙，不做游戏徽章。
- 抽象“环形烛龙 + 发光竖瞳 / 火芯 + 电路节点”。
- 表达：照亮上下文、证据链、代码影响面。

建议颜色：

| Token | Hex | 用途 |
| --- | --- | --- |
| `zhulong-bg` | `#0d1117` | GitHub dark / icon 背景 |
| `zhulong-graphite` | `#151b23` | 主体石墨色 |
| `zhulong-ember` | `#f59e0b` | 火芯、重点高亮 |
| `zhulong-red` | `#b91c1c` | 深层热感 |
| `zhulong-cyan` | `#22d3ee` | 代码 / 图谱 / 边缘光 |

资产计划：

- `docs/assets/zhulong-icon.png`：canonical 主图，README、docs、GitHub avatar 统一使用。
- `docs/assets/zhulong-icon-concept.png`：兼容旧引用，内容同步为 canonical 主图。
- `docs/assets/zhulong-selected-variants/zhulong-selected-final.png`：最终定稿在 selected variants 目录中的备份。
- 后续可加 `docs/assets/zhulong-wordmark.svg`：横版 wordmark。
- 后续可加 `docs/assets/zhulong-social-preview.png`：GitHub social preview 1280x640。

### 5.8 文档全量替换顺序

建议顺序：

1. README：首页先完成，确定外部观感。
2. `docs/product.html`：宣传页改品牌、痛点、FAQ、icon。
3. `docs/architecture.md`：架构名和命令名切换。
4. `docs/commands.html`：由命令目录重新生成，不手改 HTML。
5. `docs/runtime-command-packs.md`：runtime skills 改名。
6. `docs/quality-plan.md`：新增 rename / naming / skills gate。
7. `docs/changelog.md`：记录 Zhulong rename milestone。
8. `verification/reports/*`：不批量改历史报告，只让新报告自然使用新名。

搜索命令：

```bash
rg -n "AI-PIKit|AI Project Intelligence Kit|Project Intelligence Kit|pik-|\\bpik\\b|PIK" \
  README.md docs runtime core bin scripts package.json
```

### 5.9 GitHub 仓库设置建议

你改 GitHub 仓库名时，建议同步改：

- Repository name：`zhulong-project-intelligence-kit`
- Description：`Local AI engineering intelligence for context-heavy software projects.`
- Website：如果没有官网，先留空或指向 `docs/product.html` 的 GitHub Pages 地址。
- Topics：
  - `ai-engineering`
  - `developer-tools`
  - `local-first`
  - `rag`
  - `codex`
  - `claude-code`
  - `project-intelligence`
  - `workflow-automation`
- Social preview：后续用 `zhulong-social-preview.png`。
- Avatar：使用 `docs/assets/zhulong-icon.png`。

### 5.10 最小 PR 拆分

建议不要一个 commit 全部改完。推荐拆成：

1. `brand: introduce zhulong identity`
   - README
   - icon assets
   - package name / root CLI aliases
   - rename plan
2. `cli: promote zhulong root command`
   - usage 文案
   - command catalog
   - command docs
   - full-command-surface root smoke
3. `runtime: add zhulong skills`
   - codex skills
   - claude-code skills
   - github-copilot prompts
   - runtime verification
4. `docs: migrate product and architecture docs`
   - product page
   - architecture
   - runtime docs
   - quality plan
5. `verify: update naming rules for zhulong`
   - `verify:naming`
   - docs completeness
   - business chain

每个 PR 的最低验收：

```bash
npm run check
npm run verify:docs-completeness
```

最终收口验收：

```bash
npm run verify:quality
npm run verify:quality-closure
npm run verify:business-chain
```
