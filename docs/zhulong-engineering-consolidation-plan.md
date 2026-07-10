# Zhulong Kit 工程收口与下一阶段优化计划

> 计划状态：执行中（M0-M6 已完成；M7 本地发布审计通过，远端 CI/Pages、npm 发布与远端历史替换待完成）
> 制定日期：2026-07-10
> 适用范围：`v0.1.0` 首次公开发布前至 `v0.2.0`
> 历史依据：[截图提取稿与本地改造计划](zhulong-extraction-and-local-plan.md)

## 1. 计划结论

Zhulong 当前不缺新的产品能力。下一阶段应暂停扩充命令面，进入一次以发布质量、通用项目适配、维护成本和供应链安全为中心的工程收口。

本计划分为两个发布目标：

- `v0.1.0`：证明 Kit 可发布、可安装，并能在文档密集型和非文档密集型项目中完成核心闭环。
- `v0.2.0`：在不破坏现有 CLI 的前提下，拆分 CLI 单体、建立标准测试层次并明确跨平台支持边界。

执行期间保持以下边界：

- 不新增大批公开命令。
- 不强制项目启用 RAG，`rag none` 是完整运行模式。
- 不把 Zhulong 定位为对日项目专用框架。
- 不进行微服务化或全量 TypeScript 重写。
- 不增加运行时 npm 依赖，除非有独立决策记录证明收益明显大于供应链成本。
- 不改变 `.planning/` 数据协议，除非同时提供 schema version 和迁移器。

## 2. 当前工程基线

以下数字用于衡量优化是否真实生效，不作为宣传指标：

| 维度 | 当前基线 | 判断 |
| --- | ---: | --- |
| 公开逻辑命令 | 74 | 功能面已经足够，近期应冻结增长 |
| npm bin | 75 | 保留兼容入口，后续重点统一机器可读行为 |
| CLI 核心 | `bin/zl.mjs`，约 8,900 行、318 KB | 主要维护风险，需要渐进拆分 |
| CLI 帮助启动时间 | 中位数约 66 ms | 性能正常，不需要为速度重写 |
| 运行时依赖 | 0 | 应继续保持 |
| npm tarball | 约 2.15 MB | 主图标约 2.01 MB，是首要瘦身对象 |
| Git pack | 约 170.78 MiB | 历史二进制资源明显过重 |
| 当前文档图片 | `docs/assets/` 约 33 MiB | 候选图应归档，活跃仓库只留正式资源 |
| 当前验证报告 | `verification/reports/` 约 33 MiB | 大型截图应转为短期 CI artifact |
| 已跟踪验证报告 | 约 95 个 | 生成时间与报告刷新造成较大 diff 噪声 |
| CI 平台 | Ubuntu | 通用 Kit 还缺 macOS 验证和 Windows 支持决策 |
| Node.js / npm | Node.js 24 / npm 11 | 基线已正确固定 |
| GitHub Release | 无 | 首次发布尚未完成 |
| 远端采用情况 | 0 star / 0 fork / 0 release | 现在仍适合在备份后进行一次历史瘦身 |

已有优势不应在优化中丢失：

- 零运行时依赖和本地优先。
- 机械式判定、可复跑证据和明确 gate。
- Node.js 24、npm 11、CI、Pages 和 release workflow 已建立。
- npm trusted publishing、provenance 和 attestation 路径已准备。
- 文档密集型、非文档密集型及 `rag none` 的产品语义已经统一。

## 3. 成功指标

### 3.1 `v0.1.0` 发布门槛

- [ ] 经过历史瘦身后，完整仓库 clone 的 Git pack 不高于 20 MiB。
- [x] `npm pack --dry-run --json` 的压缩体积不高于 700 KiB。
- [x] npm 包不包含验证截图、临时报告、图标候选和高分辨率设计源文件。
- [x] 文档密集型和非文档密集型两套 fixture 均完成核心工作流验证。
- [x] `rag none` fixture 不初始化 RAG，也不会收到错误的 RAG 建议。
- [ ] Ubuntu 完整质量流程通过，macOS 核心 smoke test 通过。
- [x] CodeQL、Dependabot security updates、secret scanning 和 push protection 已配置。
- [x] Pages 构建产物可直接显示当前版本或短 commit SHA；线上部署待合并到 `main` 后核验。
- [ ] 首个 release 可从 npm 安装并运行 `zhulong --help`、`zl --help` 和一条核心命令。

### 3.2 `v0.2.0` 完成门槛

- [x] `bin/zl.mjs` 只保留启动与兼容入口职责。
- [x] docs、rag、graph、workflow、policy、cockpit 等领域模块具有明确导出边界。
- [x] 纯函数和核心状态转换进入 `node:test` 单元测试。
- [x] 验证任务由单一 manifest / DAG 调度，同一检查在单轮流水线中不重复执行。
- [x] CLI 具有稳定的退出码、stdout/stderr 约定以及统一的 `--json` 行为。
- [x] README 明确列出受支持的平台和已知限制。

## 4. 里程碑与执行顺序

### M0：冻结基线与建立回滚点

优先级：P0
预计工作量：0.5 天
风险：低

任务：

1. 暂停新增命令和大型文档功能，允许修复阻塞问题。
2. 记录当前 `main` SHA、GitHub Pages 部署、ruleset、release environment 和 npm 配置。
3. 创建本地 mirror clone 和 `git bundle`，保存到仓库目录之外。
4. 保存当前 `npm pack --dry-run --json`、全量验证摘要和 Pages 截图作为基线。

产物：

- 仓库外的可恢复 Git 镜像。
- 一份不进入 npm 包的收口前基线摘要。
- 明确的冻结起点 SHA。

验收：

- 从 mirror 或 bundle 可以恢复完整仓库。
- 当前 `main` 的 CI 和 Pages 状态已经记录。

### M1：Git 历史、npm 包和生成报告瘦身

优先级：P0
预计工作量：2 天
依赖：M0
风险：高，历史重写必须由仓库所有者单独确认

M1 的实际执行顺序是：先完成当前工作树的图标候选归档、M1.2 npm 包瘦身和 M1.3 报告治理，再执行 M1.1 历史重写。否则当前仓库仍保留约 66 MiB 的图片与报告，无法达到 clone 体积目标。

#### M1.1 Git 历史瘦身

1. 把当前未选中的图标方案和高分辨率设计源文件归档到仓库外备份或独立 GitHub Release asset。
2. 活跃仓库只保留正式图标、网页所需尺寸、必要说明和可再生视觉资源。
3. 完成 M1.3 后，用 `git filter-repo` 识别并移除历史中的验证截图、图标候选、大型临时资源和可再生成报告。
4. 在临时 clone 中完成重写，先比较对象体积和关键提交内容。
5. 运行命名、文档、运行时、全命令面和 pack 验证。
6. 获得所有者确认后再替换远端历史。
7. 重新检查 Pages、ruleset、开放 PR 和本地工作副本。

回滚：

- 未确认前不修改远端。
- 推送后如发现不可接受问题，从 M0 mirror 恢复原远端。

#### M1.2 npm 包瘦身

1. 为 npm 包生成适合 CLI 和 README 使用的 256/512 像素压缩图标。
2. 高分辨率品牌源图留在设计资料中，但从 `package.json#files` 排除。
3. 给 pack verifier 增加压缩体积、解包体积和最大单文件阈值。
4. 保持 `LICENSE`、第三方许可证、CLI、runtime、schemas 和 templates 完整。

#### M1.3 报告治理

1. 把报告分为稳定证据和临时运行产物。
2. CI 临时报告仅上传为 7 天 artifact，不进入 Git。
3. Git 只保留发布摘要、人工确认的基线和必要的固定 fixture 期望值。
4. 从稳定报告中移除生成时间、绝对路径、随机临时目录和全量 stdout。

验收：

- Git pack 不高于 20 MiB。
- npm tarball 不高于 700 KiB。
- 普通功能 PR 的生成报告变更不超过 5 个文件。
- `npm pack` 内容清单仍通过公开发布检查。

### M2：双项目画像与 `rag none` 端到端证明

优先级：P0
预计工作量：2 天
依赖：M0
风险：中

建立两套长期 fixture：

| Fixture | 用途 | RAG 模式 |
| --- | --- | --- |
| 文档密集型 fixture | 验证文档扫描、引用、索引、查询和证据链 | 可选 `local` 或 mock |
| 非文档密集型 fixture | 验证纯代码、任务、缺陷和 workflow 项目 | 必须为 `none` |

非文档密集型场景至少覆盖：

1. 初始化项目并选择 `rag none`。
2. 扫描代码库并生成基础状态。
3. 建立 milestone、spec、plan 和 workflow。
4. 记录 evidence 并执行 completion check。
5. 调用 `zl-next` 和 runtime skills。
6. 断言输出中不要求文档索引、不调用 GraphRAG、不建议切换 RAG 后端。

实现要求：

- 新增统一的 `verify:project-profiles`。
- fixture 不依赖用户主目录、网络、真实 API key 或本地 GraphRAG 安装。
- 两套 fixture 使用同一核心 workflow 断言，仅在知识来源能力上分流。
- 将 `rag mode` 写入稳定状态制品，供 `zl-next`、skills 和 verifier 共同读取。

验收：

- 两套 fixture 在全新临时目录重复运行均通过。
- `rag none` 模式没有 RAG 相关副作用和错误建议。
- README 中“适配任何项目”的表述能链接到这两套机械验证证据。

### M3：远端安全基线与跨平台最小矩阵

优先级：P0
预计工作量：1.5 天
依赖：M1、M2
风险：低

#### M3.1 GitHub 安全设置

1. 启用 Dependabot security updates。
2. 启用 secret scanning、non-provider patterns 和 push protection。
3. 为 JavaScript/TypeScript 与 GitHub Actions 启用 CodeQL default setup。
4. CodeQL 首轮作为非阻塞检查；处理完基线告警后再决定是否加入 ruleset。
5. 保持 Actions SHA 固定、最小权限和 trusted publishing，不保存长期 npm token。

#### M3.2 CI 平台矩阵

1. Ubuntu 继续运行完整质量、视觉和 pack 流程。
2. macOS 运行安装、CLI help、初始化、`rag none` 和 workflow smoke tests。
3. 盘点 `sh -lc`、`$PWD`、POSIX 权限和路径分隔符假设。
4. 对 Windows 作出明确决策：修复后支持，或在 `v0.1.0` README 中声明暂不支持。
5. 不在所有平台重复运行成本较高的完整视觉验证。

验收：

- 安全设置在仓库 Security 页面可见。
- CodeQL 至少完成一次成功扫描。
- Ubuntu 和 macOS 必需检查均通过。
- README 的支持矩阵与实际 CI 一致。

### M4：CLI 模块化第一阶段

优先级：P1
预计工作量：5 至 8 天
依赖：M2、M3
风险：中

采用模块化单体，保持所有 `zhulong`、`zl` 和 `zl-*` 入口兼容。建议目标结构：

```text
bin/
  zl.mjs
src/
  cli/
    args.mjs
    router.mjs
    output.mjs
  project/
  docs/
  rag/
  graph/
  workflow/
  policy/
  cockpit/
  shared/
    fs.mjs
    git.mjs
    process.mjs
    report.mjs
```

拆分顺序：

1. 提取稳定 JSON、路径规范化、配置读取和状态判定等纯函数。
2. 提取 CLI 参数解析、命令别名和输出协议。
3. 提取 policy 与 workflow，它们的边界相对清晰且已有 verifier。
4. 提取 docs 与 RAG，显式表达 `rag none` 分支。
5. 提取 graph 与 cockpit，保留现有生成物格式。
6. 最后缩减 `bin/zl.mjs` 为启动和路由层。

每次提取遵守以下规则：

- 一个 PR 只迁移一个领域或一组共享纯函数。
- 迁移前后运行相同的命令面和 fixture。
- 不在模块化 PR 中同时改变用户可见行为。
- 使用 JSDoc 表达关键输入输出；后续可评估 `checkJs`，但不立即迁移 TypeScript。
- 对关键模块边界新增 ADR，说明依赖方向和禁止反向引用的规则。

验收：

- `bin/zl.mjs` 不再包含领域实现。
- 领域模块之间不存在循环依赖。
- 75 个 npm bin 的行为和退出码保持兼容。
- CLI help 启动时间没有出现超过 20% 的持续回退。

### M5：标准测试层次与验证 DAG

优先级：P1
预计工作量：3 天
依赖：M4 第一批纯函数模块
风险：中

目标脚本层次：

```text
npm test                  # node:test 单元测试
npm run verify:ci         # PR 必需集成检查
npm run verify:release    # 发布前完整检查
npm run verify:local-rag  # 需要本地 RAG 环境的可选检查
```

任务：

1. 使用 Node.js 24 内置 `node:test`，不引入额外测试框架。
2. 先覆盖参数解析、路径处理、状态迁移、策略判定和报告归一化。
3. 建立 verifier manifest，记录任务名称、依赖、平台、成本和是否需要网络/RAG。
4. 由单一 runner 按 DAG 执行，避免 quality、closure 和 release 重复运行相同检查。
5. 保留现有 verifier 作为集成测试，不为追求形式统一而重写全部脚本。
6. 输出一个机器可读总索引和一个简洁的人类可读摘要。

验收：

- 同一 verifier 在一轮发布流水线中最多执行一次。
- 失败输出能定位到具体检查和报告路径。
- 单元测试可在无浏览器、无 RAG、无网络环境快速完成。
- CI 总耗时和重复日志量有可测下降。

### M6：CLI 契约、Pages 可观测性和无障碍

优先级：P2
预计工作量：3 至 4 天
依赖：M4、M5
风险：低

#### M6.1 CLI 机器可读契约

1. 为核心查询和状态命令统一 `--json`。
2. 明确 `0`、使用错误、环境缺失、gate 失败和内部错误的退出码。
3. 正常结果写 stdout，诊断和警告写 stderr。
4. 增加 `--quiet`、`--no-color`，避免 CI 解析彩色文本。
5. 从命令目录生成 Bash、Zsh 和 Fish 补全。
6. 评估增加 `zhulong doctor`，集中检查 Node/npm、Git、浏览器和可选 RAG 环境。

#### M6.2 Pages 与文档质量

1. Pages 构建时为 CSS/JS 增加内容 hash 或版本查询参数。
2. 页脚展示版本、短 commit SHA 和部署时间。
3. 使用现有 Playwright 流程接入 `@axe-core/playwright` 的 WCAG A/AA 基础扫描。
4. 为公开页面增加 canonical、Open Graph 和 Twitter card 元数据。
5. README、产品页和技术页共享同一能力口径，不再使用过时命令数量作为主要卖点。

验收：

- 用户能从线上页面确认当前部署对应的 commit。
- 缓存不会让新旧 CSS/JS 长期混用。
- 核心页面没有已知严重和高等级无障碍问题。
- `--json` 输出通过 schema fixture，不受终端颜色和提示文本影响。

### M7：`v0.1.0` 首次公开发布

优先级：P1
预计工作量：1 天
依赖：M0 至 M3，建议同时完成 M6.2 的 Pages 版本标识
风险：中

发布步骤：

1. 确认 npm 上 `zhulong-kit` 的名称所有权。
2. 在 npm 配置 trusted publisher，并精确绑定当前 `release.yml`。
3. 从干净 clone 执行 `npm ci`、`verify:release` 和 pack 审计。
4. 发布候选 tarball，在临时目录完成全局安装 smoke test。
5. 创建签名或受保护的 `v0.1.0` tag，触发 release workflow。
6. 检查 npm provenance、GitHub attestation、SHA-256 和 release metadata。
7. 从公开 npm registry 再次安装并验证三个入口。

发布后观察：

- 24 小时内检查安装失败、Pages 链接、npm 文件清单和安全告警。
- 发现普通缺陷时发布补丁版本，不使用 `npm unpublish` 作为常规回滚。
- 发现密钥或严重供应链问题时停止分发并按安全事件流程处理。

验收：

- npm 包、GitHub Release、tag、commit 和 attestation 可以互相对应。
- release notes 记录 Node/npm 版本、命令面数量、tarball SHA-256 和支持平台。
- 全新环境安装后可以运行 `zhulong --help`、`zl --help` 和 `zl-init`。

## 5. 建议排期

这是单人维护下的建议节奏，可按实际时间拆成更多小 PR：

| 周期 | 主要工作 | 目标结果 |
| --- | --- | --- |
| 第 1 周 | M0、M1、M2 | 分发体积收口，双项目画像建立 |
| 第 2 周 | M3、M7 准备 | 安全基线与跨平台 smoke 完成，具备发布条件 |
| 第 3 周 | M4 第一阶段 | 共享纯函数、CLI router、policy/workflow 开始拆分 |
| 第 4 周 | M4、M5 | 主要领域模块化，测试 DAG 建立 |
| 第 5 周 | M6、`v0.2.0` 候选 | CLI 契约、Pages、无障碍和文档收口 |

如需尽快公开发布，可以在 M0 至 M3 完成后先发布 `v0.1.0`，再将 M4 至 M6 作为 `v0.2.0`。不要为了等待一次完美重构而无限推迟首次可验证发布。

## 6. PR 拆分建议

每个 PR 应只有一个可回滚主题：

| PR | 内容 | 主要验证 |
| --- | --- | --- |
| PR-01 | 图标压缩、pack size gate | pack report、安装 smoke |
| PR-02 | 稳定报告与临时 artifact 分离 | quality、CI artifact |
| PR-03 | 非文档密集型 fixture 与 `rag none` E2E | `verify:project-profiles` |
| PR-04 | GitHub 安全配置与 CodeQL | workflow lint、CodeQL |
| PR-05 | macOS smoke matrix与平台声明 | Ubuntu/macOS CI |
| PR-06 | 共享纯函数与 `node:test` | unit test、full command surface |
| PR-07 | CLI router 和输出协议 | CLI snapshot、exit code fixture |
| PR-08 | policy/workflow 模块化 | policy、workflow verifier |
| PR-09 | docs/rag 模块化 | 双项目画像、docs/RAG verifier |
| PR-10 | graph/cockpit 模块化 | graph、cockpit、visual verifier |
| PR-11 | verifier manifest 与 DAG runner | CI/release 对比 |
| PR-12 | Pages hash、版本标识和 axe | Pages、visual、accessibility |

Git 历史重写不与普通 PR 混合。它应作为独立维护窗口执行，并在开始前停止合并其他分支。

## 7. 风险与控制

| 风险 | 影响 | 控制措施 |
| --- | --- | --- |
| 历史重写破坏本地 clone | 高 | mirror、bundle、维护窗口、远端替换前人工确认 |
| CLI 拆分改变隐含行为 | 高 | 小 PR、命令面回归、双 fixture、保持 façade |
| 报告瘦身丢失审计证据 | 中 | 发布摘要长期保留，原始报告保留为短期 CI artifact |
| macOS/Windows 引入大量条件分支 | 中 | 先定义支持矩阵，只修复核心路径，不复制完整 CI |
| 安全检查首次产生噪声 | 中 | 首轮非阻塞，基线收敛后再设 required check |
| pack 瘦身降低品牌图质量 | 低 | 仓库保留高分辨率源图，npm 仅使用适配尺寸 |
| 模块化期间功能继续增长 | 高 | 设置功能冻结，只允许阻塞修复和本计划任务 |

## 8. 决策记录要求

以下事项必须形成 ADR 或明确的仓库决策，不应只留在聊天记录中：

1. Git 历史是否重写及其维护窗口。
2. Windows 是正式支持、实验支持还是明确不支持。
3. `.planning` schema version 和迁移兼容期。
4. CLI 退出码与 JSON 输出契约。
5. 新增运行时依赖的批准条件。
6. `v0.1.0` 与 `v0.2.0` 的兼容承诺。

建议 ADR 放在 `docs/adr/`，文件名使用 `NNNN-short-title.md`。

## 9. Definition of Done

单项任务只有同时满足以下条件才算完成：

- 实现、验证器和中文文档同步更新。
- 不引入旧品牌标识、临时绝对路径或不可重放的证据。
- 普通模式和 `rag none` 模式均未发生意外回归。
- `npm pack` 内容与大小符合边界。
- CI 结果可定位，失败不依赖人工猜测。
- 对外行为变化写入 changelog。
- 高风险操作有备份、回滚方式和所有者确认。

## 10. 第一批执行清单

建议从以下顺序开始，不并行进行历史重写与功能代码修改：

- [x] M0：建立 mirror、bundle 和冻结基线。
- [x] PR-01：压缩 npm 图标并加入 pack size gate。
- [x] PR-02：分离临时报告和稳定发布证据。
- [x] PR-03：实现非文档密集型 `rag none` 端到端 fixture。
- [ ] M1.1：在临时 clone 演练 Git 历史瘦身并提交体积对比，等待所有者确认。
- [x] PR-04：启用 CodeQL 和仓库安全能力。
- [x] PR-05：增加 macOS 核心 smoke matrix，记录 Windows 决策。
- [ ] 完成 `v0.1.0` 发布就绪审查。

## 11. 官方实践参考

- Node.js 24 内置测试运行器：[Node.js Test Runner](https://nodejs.org/docs/latest-v24.x/api/test.html)
- GitHub Actions 矩阵策略：[Workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- GitHub CodeQL：[CodeQL code scanning](https://docs.github.com/en/code-security/concepts/code-scanning/codeql/codeql-code-scanning)
- GitHub 密钥推送保护：[Push protection](https://docs.github.com/en/code-security/concepts/secret-security/push-protection)
- npm 无长期 token 发布：[Trusted publishing](https://docs.npmjs.com/trusted-publishers/)
- Playwright 无障碍测试：[Accessibility testing](https://playwright.dev/docs/accessibility-testing)
