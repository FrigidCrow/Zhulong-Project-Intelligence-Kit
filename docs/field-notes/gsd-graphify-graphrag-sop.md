# 接手成型项目完整 SOP：GSD + Graphify + GraphRAG 三层融合

> **适用场景**：接手一个已开发完成的项目（还未到手），负责运维、修 Bug、新功能  
> **开发方式**：AI Agent（Codex CLI / Claude Code）作为主力执行引擎  
> **目标**：从「完全陌生」到「有能力独立改代码」→ 压缩到 2-3 小时  

---

## 〇、三层架构总览

本 SOP 的核心思想：**不要把 Graphify/GraphRAG 当独立工具用，把它们嵌入 GSD 工作流，让 GSD 自动调度它们。**

```
┌─────────────────────────────────────────────────┐
│                  GSD（流程编排层）                 │
│  管「怎么干」：discuss → plan → execute → review  │
│  子 agent 隔离 · checkpoint · state 持久化        │
│                                                   │
│   ┌───────────────────────────────────────────┐  │
│   │         Graphify（代码认知层）              │  │
│   │  管「代码长什么样」：调用链、影响面、社区    │  │
│   │  graphify query · path · explain · update  │  │
│   │                                           │  │
│   │   ┌───────────────────────────────────┐   │  │
│   │   │     GraphRAG（架构理解层）          │   │  │
│   │   │  管「为什么这么设计」：全局查询      │   │  │
│   │   │  graphrag query --method global    │   │  │
│   │   └───────────────────────────────────┘   │  │
│   └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**GSD 指挥，Graphify 看路，GraphRAG 看方向。三层各司其职，无冲突。**

---

## 一、工具角色定义

| 工具 | 一句话角色 | 给你什么 | 不给你什么 |
|------|-----------|---------|-----------|
| **GSD** | AI 开发流程管家 | 结构化工作流、原子提交、状态追踪、子 agent 隔离 | 不懂你的代码 |
| **Graphify** | 代码关系探测器 | 「函数 A 调了谁」「改这个会影响多少文件」 | 不懂架构意图 |
| **GraphRAG** | 架构语义问答器 | 「整体架构是什么」「核心设计决策有哪些」 | 精确不到函数级 |

**三者的自动化程度：**

| 工具 | 你需要手动吗 | 当你对 AI 描述 Bug 后 |
|------|------------|---------------------|
| GSD | 说 `$gsd-debug` | AI 自动走完整 debug 流程：收集症状 → 生成假设 → 实施修复 → 验证 |
| Graphify | **不需要**，但需要写进 AGENTS.md | AI 自动跑 `graphify query --dfs` 追调用链 |
| GraphRAG | 需要事前建索引 | AI 在分析阶段自动引用 GraphRAG 的社区摘要 |

---

## 二、Phase -1：拿到项目前的准备

```bash
# 一、装 Graphify CLI
npm install -g @anthropic-ai/graphify   # 或 pip install graphify
graphify --help   # 验证

# 二、装 GraphRAG
pip install graphrag
graphrag --help   # 验证

# 三、确认 GSD Skills 已在 Codex 中可用
# 你的 Codex 已经装了全套 GSD skills（在 ~/.codex/skills/gsd-*）
# 关键可用 skills：gsd-debug, gsd-fast, gsd-forensics, gsd-execute-phase, gsd-code-review

# 四、建好项目工作区
mkdir -p ~/projects/inherited-project
```

---

## 三、Phase 0：Day 0 — 项目到手，5 分钟速览

### Step 0.1：拿到代码 + 跑通构建

```bash
cd ~/projects/inherited-project
git clone <repo-url> .   # 或解压
# 跑通构建（不管什么语言，先确保能 build）
```

### Step 0.2：对 AI 说

> 「我刚接手这个项目。帮我画出完整目录树（排除 node_modules/.git/dist/__pycache__），识别技术栈、入口文件、配置文件、数据库迁移脚本，用 300 字推测项目用途。」

---

## 四、Phase 1：Graphify 建图 — 给项目做 CT 扫描

```bash
cd ~/projects/inherited-project

# 深度模式（推荐）
graphify . --mode deep

# 项目超大（>500 文件）加预算控制
graphify . --mode deep --budget 5000
```

**输出物（均在 `graphify-out/`）：**

| 文件 | 你用它做什么 |
|------|------------|
| `graph.json` | 喂给 GraphRAG 建索引、喂给 GSD agent 做调用链查询 |
| `GRAPH_REPORT.md` | 你亲自读：God Nodes / Surprising Connections / Communities |
| `graph.html` | 浏览器打开，拖拽探索 |
| `cost.json` | Token 消耗记录 |

### 读完 GRAPH_REPORT.md 后，对 AI 说

> 「这是 `graphify-out/GRAPH_REPORT.md`。请根据 God Nodes 和 Communities 信息，归纳：1）核心数据模型及关系 2）主要功能模块及责任边界 3）最脆弱的耦合点（跨社区连接最多的位置）。」

---

## 五、Phase 2：GraphRAG 建索引 — 让 AI 能回答架构问题

### Step 2.1：对接 Graphify 输出

Graphify 的 `graph.json` 是 GraphRAG-Ready 格式（含 `community_id`、边类型、置信度）。

```bash
# 初始化 GraphRAG 工作区
graphrag init --root ./graphrag-workspace

# 把 Graphify 的图复制进去
cp graphify-out/graph.json graphrag-workspace/input/

# 如果格式不兼容，让 AI 帮你写转换脚本：
# 「帮我写一个 Python 脚本，读取 graphify-out/graph.json，
#   转成 Microsoft GraphRAG 的 entity/relationship CSV 格式，
#   输出到 graphrag-workspace/input/」
```

### Step 2.2：构建索引

```bash
cd graphrag-workspace
graphrag index   # 会调 LLM 生成社区摘要，需要 API Key
```

### Step 2.3：跑第一次全局查询，验证

```bash
graphrag query --method global "这个项目的整体架构是什么样的？核心设计模式有哪些？"
graphrag query --method local "用户认证的完整数据流是怎样的？"
```

---

## 六、Phase 3：写 AGENTS.md — 让 AI 自动用图谱

**这一步是自动化的关键。** 不改 AGENTS.md，AI 永远不会主动跑 graphify。

在项目根目录创建/编辑 `AGENTS.md`，加入：

```markdown
## Graphify 知识图谱（强制自动调用）

本项目已运行 `graphify`，知识图谱位于 `graphify-out/`。

### 以下场景 AI 必须先查图谱再编码，禁止仅凭 grep：

| 场景 | 必须先运行 |
|------|-----------|
| 用户描述 Bug（带报错信息） | `graphify query "<报错函数>" --dfs` |
| 用户问「X 调了谁」或调用链问题 | `graphify query "<问题>"` |
| 用户问「从 A 到 B 的路径」 | `graphify path "<A>" "<B>"` |
| 用户问某个代码实体是什么 | `graphify explain "<实体>"` |
| 修改任何文件前（影响面分析） | `graphify query "<要改的实体>" --budget 2000` |
| 改完代码后 | `graphify update .` |

### God Nodes（改前必须做影响面分析）
从 GRAPH_REPORT.md 的「God Nodes」章节粘贴到这里。

### 改代码后强制动作
```bash
graphify update . && pytest -x --tb=short 2>&1 | tail -5
```
两个都通过才算完成。
```

**效果**：以后你对 AI 说任何代码问题，AI 会自动先 graphify 再回答。

---

## 七、日常场景 SOP（GSD + Graphify + GraphRAG 融合）

以下是四个最常见的运维场景，每个场景展示了 GSD 如何自动调度 Graphify 和 GraphRAG。

---

### 场景 A：修 Bug（主力场景）

**你说**：
> 「`$gsd-debug` 线上报错 `NullPointerException in PaymentService.process() line 234`，帮我定位和修复。」

**GSD 自动做的事（你不需要手动干预）：**

```
┌─ GSD Phase 1：收集症状 ──────────────────────────┐
│ → 并行执行 graphify query "PaymentService.process()" --dfs │
│ → 拿到完整调用链：process() → validateOrder() → chargeCard() │
│ → 定位到 chargeCard() 返回 null（第 198 行未处理） │
└───────────────────────────────────────────────────┘
┌─ GSD Phase 2：生成假设 ──────────────────────────┐
│ → graphify path "chargeCard" "PaymentGateway"      │
│ → 发现一条 INFERRED 边：chargeCard --可能依赖→ PaymentGateway │
│ → 假设：PaymentGateway 初始化失败导致 null         │
└───────────────────────────────────────────────────┘
┌─ GSD Phase 3：实施修复 ──────────────────────────┐
│ → 改代码前：graphify query "PaymentService" --budget 3000 │
│ → 波及面 4 文件 ≤ 6（安全）                       │
│ → 加 null guard + 错误日志                        │
│ → 改完：graphify update . && pytest -x --tb=short │
└───────────────────────────────────────────────────┘
┌─ GSD Phase 4：验证 → 原子 commit ────────────────┐
│ → GSD 自动生成 commit message + 更新 STATE.md     │
└───────────────────────────────────────────────────┘
```

**你只做两件事**：描述 Bug → 确认修复方案（GSD 会在修复前问你）。中间的 graphify 调用全是自动的。

---

### 场景 B：加新功能

**你说**：
> 「`$gsd-execute-phase` 需求：在订单完成后发 Slack 通知。Phase plan 在 `.planning/phases/07-slack-notify/`。」

**GSD + Graphify + GraphRAG 自动协作：**

```
┌─ GSD：读 PLAN.md ─────────────────────────────────┐
│ → 并行执行 graphify query "OrderService.completeOrder" --budget 5000 │
│ → 波及面：OrderService → PaymentGateway → EmailNotifier │
│ → 发现 EmailNotifier 和你要加的 SlackNotifier 结构一致 │
└───────────────────────────────────────────────────┘
┌─ GraphRAG 全局查询 ──────────────────────────────┐
│ → graphrag query --method local "通知系统的抽象层在哪" │
│ → 回答：NotifierBase 抽象类在 core/notifiers/base.py │
│ → 告诉你：新 notifier 实现 NotifierBase 接口即可  │
└───────────────────────────────────────────────────┘
┌─ GSD：Execute ────────────────────────────────────┐
│ → AI 在约束下编码：只改 core/notifiers/ + config   │
│ → 不改 OrderService 签名、不改 EmailNotifier       │
│ → 改完：graphify update . && pytest                │
└───────────────────────────────────────────────────┘
┌─ GSD：Code Review ────────────────────────────────┐
│ → $gsd-code-review：基于图谱对比，确认新边关系正确 │
└───────────────────────────────────────────────────┘
```

---

### 场景 C：小修小补（改个文案、修个配置）

**你说**：
> 「`$gsd-fast` 把首页的「欢迎」改成「你好」。」

**GSD + Graphify 轻量流程：**

```
┌─ graphify query "homepage_welcome_text" --budget 500 ─┐
│ → 波及面：仅 i18n/zh.json 一行                        │
│ → 安全，直接 inline 改                                 │
│ → 改完：graphify update .                              │
└───────────────────────────────────────────────────────┘
```

无子 agent、无 plan 文档、无 review 流程——因为波及面太小。

---

### 场景 D：故障复盘

**你说**：
> 「`$gsd-forensics` 上周五的部署后订单成功率下降了 15%，帮我复盘原因。」

**GSD + Graphify 自动回溯：**

```
┌─ GSD：收集部署日志 ───────────────────────────────┐
│ → git diff v1.2.3..v1.2.4 --stat                   │
│ → 改动文件：PaymentGateway.java, OrderService.java │
└───────────────────────────────────────────────────┘
┌─ Graphify 历史快照对比 ───────────────────────────┐
│ → graphify query "PaymentGateway" → 对比当前图谱   │
│ → 发现新版本删除了 PaymentGateway.retry() 的调用   │
│ → retry() 不再出现在 chargeCard() 的边关系里       │
└───────────────────────────────────────────────────┘
┌─ GraphRAG 全局分析 ──────────────────────────────┐
│ → graphrag query --method global "支付链路的容错设计" │
│ → 社区摘要显示：PaymentGateway 属于「支付容错」社区 │
│ → retry() 是该社区的核心边，删除它社区 cohesion 下降 │
└───────────────────────────────────────────────────┘
┌─ GSD：输出根因报告 ───────────────────────────────┐
│ → 根因：PaymentGateway.retry() 被误删              │
│ → 建议：恢复 retry() + 加单元测试覆盖              │
└───────────────────────────────────────────────────┘
```

---

## 八、GSD Skill 速查表

日常运维最常用的 6 个 GSD skill，以及它们会自动调哪些 Graphify/GraphRAG 命令：

| GSD Skill | 用途 | 自动调 Graphify | 自动调 GraphRAG |
|-----------|------|----------------|----------------|
| `$gsd-debug` | 系统性修 Bug | `query --dfs` → `path` → `query`（影响面）→ `update` | — |
| `$gsd-execute-phase` | 执行规划好的新功能 | `query --budget 5000`（波及面）→ `update` | `query --method local`（找抽象层） |
| `$gsd-fast` | 小修小补（≤3 文件） | `query --budget 500`（确认波及面）→ `update` | — |
| `$gsd-quick` | 快速任务 + GSD 保证 | `query`（轻量影响面）→ `update` | — |
| `$gsd-forensics` | 故障复盘 | `query`（历史快照）+ 对比当前图谱 | `query --method global`（架构级分析） |
| `$gsd-code-review` | 代码审查 | `explain`（新代码边关系） | — |

---

## 九、完整时间线（接手一个中型项目，150-300 源文件）

| 阶段 | 动作 | 耗时 | 你做的事 | AI/GSD 做的事 |
|------|------|------|---------|-------------|
| Phase -1 | 装 graphify + graphrag | 15 分钟 | 三条命令 | — |
| Phase 0 | 拿到代码，速览 | 10 分钟 | 对 AI 说一句话 | 输出目录树 + 技术栈 |
| Phase 0 | 跑通构建 | 10-20 分钟 | 手动，修构建错误 | — |
| Phase 1 | Graphify 建图 | 10-20 分钟 | `graphify . --mode deep` | — |
| Phase 1 | 读 GRAPH_REPORT | 10 分钟 | 看 God Nodes + Surprising Connections | — |
| Phase 2 | GraphRAG 对接收索引 | 30-60 分钟 | 装 graphrag + 跑 index | LLM 生成社区摘要 |
| Phase 3 | 写 AGENTS.md | 5 分钟 | 粘贴模板 + 填 God Nodes | — |
| **总计** | | **约 2 小时** | | |

从此刻起，你对 AI 描述 Bug 或提需求，GSD 自动调度 Graphify + GraphRAG。

---

## 十、附录

### 附录 A：新项目 AGENTS.md 模板

```markdown
## Graphify 知识图谱（强制自动调用）

本项目已运行 `graphify`，知识图谱位于 `graphify-out/`。

### 强制规则：以下场景必须先查图谱

| 场景 | 必须先运行 |
|------|-----------|
| Bug 定位（带报错信息） | `graphify query "<报错函数>" --dfs` |
| 问调用链 / 依赖关系 | `graphify query "<问题>"` |
| 问跨模块路径 | `graphify path "<A>" "<B>"` |
| 问代码实体含义 | `graphify explain "<实体>"` |
| 修改任何文件前 | `graphify query "<实体>" --budget 2000` |
| 改完代码后 | `graphify update .` |

### God Nodes（改前必须做影响面分析）
<!-- 从 GRAPH_REPORT.md 粘贴 God Nodes 列表 -->

### GSD 工作流规则
- 每轮只推进一个 bounded slice
- 修改源文件默认不超过 6 个
- `graphify update .` + 测试通过 = 完成
- 不跳过图谱更新声称完成
```

### 附录 B：Graphify Cheatsheet

```bash
graphify .                          # 基础建图
graphify . --mode deep              # 深度模式（推荐）
graphify query "<问题>"             # BFS 广度（看全景）
graphify query "<问题>" --dfs       # DFS 深度（追末端）
graphify query "<问题>" --budget N  # 限制输出 token
graphify path "<A>" "<B>"           # 最短路径
graphify explain "<实体>"           # 节点解释
graphify update .                   # 增量同步（改代码后必跑）
graphify . --cluster-only           # 仅重跑社区检测
```

### 附录 C：GraphRAG Cheatsheet

```bash
pip install graphrag
graphrag init --root ./graphrag-workspace
graphrag index
graphrag query --method global "全局架构问题"
graphrag query --method local "具体技术细节"
```

### 附录 D：常见问题

**Q: GSD 和 Graphify 会不会重复干活？**
不重复。GSD 管流程（先做什么后做什么），Graphify 管认知（代码长什么样）。GSD 的 debug 流程里会自动调 Graphify 查调用链，二者是「导演调度灯光师」的关系。

**Q: 只装 Graphify 不装 GraphRAG 行吗？**
行。GraphRAG 只在回答「全局架构问题」时有不可替代的价值。日常修 Bug 和加功能，Graphify + GSD 足够。

**Q: 我不说 `$gsd-debug` 只说「帮我修这个 Bug」，GSD 会自动触发吗？**
取决于你的 AGENTS.md 怎么写。如果你加了 `涉及 Bug 修复优先用 $gsd-debug 流程` 的规则，AI 会自动触发。

**Q: GraphRAG 索引太慢 / 太费钱？**
可以在接手项目的第一个周末跑一次全量索引，之后只在重大架构变更时重建。日常不需要每次都跑。

**Q: 项目是 monorepo？**
每个子项目各自建图：`graphify ./packages/backend --mode deep`、`graphify ./packages/frontend --mode deep`。

---

> **核心原则一句话：GSD 指挥流程，Graphify 看路，GraphRAG 看方向。三者串起来，你只需要对 AI 描述问题和需求，中间的所有图谱查询全是自动的。**

---

## 十一、原理说明：GSD 如何「自动」调度 Graphify

### 你问了最关键的问题：AI 到底怎么知道要跑 graphify？

**答案是：AGENTS.md 里的规则，不是 GSD skill 里的。**

```
真实链路拆解：

1. 你说 $gsd-debug 「PaymentService.process() line 234 报 NullPointerException」

2. AI 加载两套指令（同时存在于 system prompt）：
   ┌─ gsd-debug/SKILL.md ─────────────────────┐
   │ 「收集症状 → 生成假设 → 实施修复 → 验证」 │  ← 通用流程（哪个项目都这么干）
   └──────────────────────────────────────────┘
   ┌─ AGENTS.md ──────────────────────────────┐
   │ 「Bug 定位必须先跑 graphify query --dfs」 │  ← 项目本地规则（这个项目有图谱）
   │ 「改代码前必须先跑 graphify query 做影响面」│
   └──────────────────────────────────────────┘

3. AI 缝合两套指令：
   Phase「收集症状」+ 规则「先跑 graphify」
   → 实际执行：graphify query "PaymentService.process()" --dfs

4. AI 拿到调用链结果：
   process() → validateOrder() → chargeCard() → PaymentGateway.call()
   → 定位到 chargeCard() 第 198 行未处理 null 返回值

5. Phase「生成假设」+ 规则「改前做影响面」
   → 实际执行：graphify query "PaymentService" --budget 3000
   → 波及面 4 文件，安全

6. Phase「实施修复」
   → 改代码

7. Phase「验证」+ 规则「改完必须 graphify update」
   → graphify update . && pytest
```

### 为什么这样设计

| 放在哪里 | 放什么 | 为什么 |
|---------|--------|--------|
| **GSD skill**（通用） | 「收集症状 → 生成假设 → 修复 → 验证」 | 放之四海皆准的流程 |
| **AGENTS.md**（项目本地） | 「分析时用 graphify query」、「影响面用 graphify path」 | 只有这个项目有图谱 |

如果把 graphify 写进 GSD skill，那没有 graphify 的项目用 GSD 就会报错。分开放是正确的设计。

### 潜在裂缝：子 agent 上下文

GSD debug 有时会 spawn 子 agent。子 agent 的上下文可能不包含完整的 AGENTS.md。**如果子 agent 拿不到 AGENTS.md 的 graphify 规则，它就不会自动跑 graphify。**

**解法**：在 `graphify-out/` 目录下也放一个 `AGENTS.md`（只有 graphify 规则），确保子 agent 进入任何子目录都能读到。

```bash
# 建完图后跑这个
cat > graphify-out/AGENTS.md << 'EOF'
## Graphify 规则（子 agent 上下文）

本目录包含项目知识图谱。任何代码分析必须先查图谱：
- graphify query "<问题>" --dfs  → 调用链追踪
- graphify path "<A>" "<B>"       → 跨模块路径
- graphify explain "<实体>"       → 节点解释
- graphify update .               → 改代码后同步
EOF
```

AGENTS.md 的作用域是所在目录及其子目录。放在 `graphify-out/` 下意味着任何进入该目录的子 agent 都能读到这个规则。

> **一句话总结：GSD 管「怎么修 Bug」，AGENTS.md 管「在这个项目里修 Bug 时用 graphify」。二者各写各的，AI 自动缝合。你不需要手动调任何东西。**

---

## 十二、GraphRAG 如何融入自动化

### 和 Graphify 的关键差异

| | Graphify | GraphRAG |
|------|---------|----------|
| 查询方式 | CLI 本地计算 | 调 LLM API |
| 单次耗时 | <1 秒 | 10-30 秒 |
| 单次花费 | 免费 | 消耗 LLM token |
| 适合「每次 Bug 实时跑」 | ✅ | ❌ 太慢太贵 |
| 适合「事前跑好，AI 读缓存」 | — | ✅ |

### 结论：GraphRAG 必须「预运行 + 文件化」

```
┌─ Phase 2（一次性）──────────────────────────────┐
│ graphrag index                                    │
│   → 生成社区摘要（parquet 文件）                    │
│   → 导出为 AI 可读的 .md 文件                      │
│   → 放到 docs/architecture/ 或 graphrag-out/      │
└──────────────────────────────────────────────────┘
┌─ 之后每次 AI 需要架构理解时 ─────────────────────┐
│ AI 读 docs/architecture/community-summary-03.md   │
│ → 不调 LLM，直接读已生成的摘要                      │
└──────────────────────────────────────────────────┘
```

### 具体做法：建完索引后导出摘要

```bash
# GraphRAG 建完索引后，导出社区摘要为 markdown
cd graphrag-workspace

# GraphRAG 的社区摘要存在 output/ 的 parquet 文件里
# 写个导出脚本（让 AI 帮你写一次）：
python3 << 'PYEOF'
import pandas as pd
from pathlib import Path

output_dir = Path("output")
reports = output_dir.glob("*.parquet")

for f in sorted(reports):
    df = pd.read_parquet(f)
    # 只导出社区摘要相关的列
    if "community" in str(f).lower() or "report" in str(f).lower():
        md = df.to_markdown(index=False)
        out_name = f.stem + ".md"
        Path(f"../docs/architecture/{out_name}").write_text(md)
        print(f"Exported: {out_name}")
PYEOF
```

### AGENTS.md 里加 GraphRAG 缓存规则

```markdown
## GraphRAG 架构摘要（预生成，AI 读缓存）

本项目已运行 GraphRAG，架构摘要缓存于 `docs/architecture/`。

### 自动加载规则
- 用户问「整体架构」「设计决策」「跨模块数据流」等全局性问题时：
  **先读** `docs/architecture/community-reports.md` 及相关社区摘要文件
- 用户要求加新功能且涉及跨模块时：
  **先读** 受影响社区的摘要，确认抽象层位置
- 每轮重大架构变更后：重新 `graphrag index` 并导出新摘要

### 禁止
- ❌ 在回答全局性架构问题时仅凭 grep 结果推测
- ❌ 不读预生成的社区摘要就声称了解架构
```

### 更新 GSD 融合规则：什么时候调 GraphRAG 缓存

在「 七、日常场景 SOP」中，GraphRAG 的实际用法是读缓存，不是实时查：

| 场景 | GSD Phase | GraphRAG 动作（读缓存） |
|------|-----------|----------------------|
| 修 Bug | 收集症状 | 如果 Bug 跨社区，读相关社区摘要确认模块职责 |
| 加功能 | Plan | 读全局架构摘要 + 受影响社区摘要，确认在哪一层实现 |
| 故障复盘 | 根因分析 | 读支付/容错相关社区摘要，对比当前代码是否破坏架构 |
| 代码审查 | Review | 读架构摘要，确认新代码没破坏分层 |

### 什么时候重新跑 GraphRAG index

不是每次改代码都跑。只在以下时机：

| 触发条件 | 频率 |
|---------|------|
| 新增了一个模块/服务 | 当时 |
| 重构了跨模块的数据流 | 当时 |
| 删除了一个核心抽象 | 当时 |
| 正常的 Bug 修复/小功能 | **不跑** |

> **一句话：Graphify 是自动挡（AI 每次修 Bug 实时查），GraphRAG 是手动挡（你事前跑好 index + 导出，AI 读缓存文件）。不是因为 GraphRAG 不好，而是因为它调 LLM，不适合零延迟自动化。**

---

## 十三、真实分层（简化版）

经过前面的讨论，实际的分层应该这样理解：

### 两层就够了，不是三层

```
┌──────────────────────────────────────────────┐
│           GSD（流程编排）                       │
│  $gsd-debug / $gsd-fast / $gsd-forensics      │
│  「现在干什么、按什么顺序干」                     │
│                                                │
│  ┌────────────────────────────────────────┐   │
│  │       Graphify（唯一的代码认知工具）      │   │
│  │  graphify query → 调用链                │   │
│  │  graphify path  → 跨模块路径            │   │
│  │  graphify explain → 节点解释            │   │
│  │  GRAPH_REPORT.md → God Nodes + 社区     │   │
│  └────────────────────────────────────────┘   │
│                                                │
│  ┌─ GraphRAG？────────────────────────────┐   │
│  │  接手纯代码项目 → 不需要                  │   │
│  │  接手文档+代码项目 → 有价值（见下方）      │   │
│  └────────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
```

### Graphify 和 GraphRAG 的真正分界线

| | Graphify | GraphRAG |
|------|---------|----------|
| **擅长分析的输入** | 代码文件（.py/.ts/.java 等） | 自然语言文档（.md/.txt/.pdf） |
| **输出的是什么** | 函数调用关系、文件依赖、代码社区 | 概念关系、设计意图、架构叙事 |
| **回答的问题** | 「publish_content 调了什么」 | 「为什么发布链路要加频率保护」 |
| **对代码库接手** | **必需品** | 锦上添花 |
| **对文档库接手** | 不够用（不分析语义） | **必需品** |

### 你应该怎么用

```
场景 A：接手纯代码项目（像 SNS-HR 这种，文档主要在 .planning/ 里十几篇）
  → 只装 Graphify
  → GRAPH_REPORT.md 已经给了 God Nodes + 社区 + Surprising Connections
  → 不需要 GraphRAG

场景 B：接手文档+代码项目（有 50+ 篇设计文档、RFC、会议纪要散落各处）
  → 先装 Graphify 分析代码
  → 再装 GraphRAG，喂入所有文档 → 生成架构叙事
  → 两个图谱互补：Graphify 告诉你代码怎么连的，GraphRAG 告诉你为什么这么连
```

### 更新后的 AGENTS.md 模板（无 GraphRAG 版）

```markdown
## Graphify 知识图谱（强制自动调用）

本项目已运行 `graphify`，知识图谱位于 `graphify-out/`。

### 强制规则

| 场景 | 必须先运行 |
|------|-----------|
| Bug 定位 | `graphify query "<报错函数>" --dfs` |
| 调用链问题 | `graphify query "<问题>"` |
| 跨模块路径 | `graphify path "<A>" "<B>"` |
| 代码实体含义 | `graphify explain "<实体>"` |
| 修改任何文件前 | `graphify query "<实体>" --budget 2000` |
| 改完代码后 | `graphify update .` |

### God Nodes
<!-- 从 GRAPH_REPORT.md 粘贴 -->
```

**有 GraphRAG 才加的额外规则（仅文档密集型项目）：**

```markdown
## GraphRAG 文档图谱（仅全局架构问题）

预生成的架构摘要位于 `docs/architecture/`。
用户问「整体架构」「设计决策」等全局性问题时，先读对应摘要文件。
```

### 一句话总结

> **接手代码 → Graphify 足够。接手代码+大量文档 → Graphify + GraphRAG。不要为了用工具而用工具——Graphify 的 GRAPH_REPORT.md 已经做了 80% 的「全局理解」工作。**

---

## 十四、加新功能时 GraphRAG 的真实价值

### 一个问题定生死

**加新功能时要不要用 GraphRAG？先问自己：**

> 「我要加的这个功能，是『顺着现有架构扩展』，还是『需要改动架构本身』？」

| 你加的功能 | GraphRAG 有用吗 | 你真正需要的 |
|-----------|---------------|------------|
| 在发布模块里加一个「定时发布」 | ❌ 没用 | Graphify 告诉你波及面 + 抄同社区代码模式 |
| 加一个新的通知渠道（飞书/钉钉） | ❌ 没用 | Graphify 告诉你 NotifierBase 在哪、谁实现了它 |
| 把单体发布模块拆成独立微服务 | ✅ 有用 | 需要理解原架构为什么耦合，哪些边界可以切 |
| 从 REST 改成 GraphQL | ✅ 有用 | 需要理解数据模型的全局依赖关系 |

### 为什么通常没用

因为 GraphRAG 做的事——把代码结构翻译成人类语言——Graphify 的 GRAPH_REPORT.md 已经做了一半：

```
GRAPH_REPORT.md 已经给你的：
  ✅ God Nodes → 「碰 JDDocument 要小心，158 条边」
  ✅ Communities → 「Publishing Service 社区管发布」
  ✅ Surprising Connections → 「设计文档引用了 Layout.tsx」

GraphRAG 额外给你的：
  ⚠️ 每个社区的 LLM 摘要 → 「发布链路采用频率保护模式，因为小红书 API 有频率限制」
  
对于加功能，左边两列比右边那一列有用 10 倍。你知道「Publishing Service 管发布」
就够了，不需要 LLM 告诉你它的设计哲学——你加的是功能，不是写论文。
```

### 真正有用的 GraphRAG 场景（运维之外）

| 场景 | GraphRAG 价值 |
|------|-------------|
| **新人接手**（你） | 第一天跑一次，快速理解「这项目到底在干什么」 |
| **跨团队交接** | 生成架构叙事文档，对方不用读代码就能理解系统 |
| **重构决策** | 理解原设计的 trade-off，避免重构时踩坑 |
| **写技术文档** | 自动生成每个模块的概述 |
| **日常修 Bug / 加功能** | **不需要** |

### 结论

> **GraphRAG 是「理解工具」，不是「执行工具」。你接手项目的头两天用它理解全局，之后日常开发用它 = 杀鸡用牛刀。加功能时，Graphify 的 query + GRAPH_REPORT.md 的社区地图就够了。**

---

## 十五、理解模块：Graphify vs GraphRAG 真实对比

### 「这个模块为什么这么写？」——谁回答得更好？

真实答案：**两个都回答不了「为什么」，除非有人把为什么写下来了。** 但它们能帮你推到答案的门口：

**Graphify 给你的推理线索：**

```
你想理解「publisher.py 为什么有频率保护」：

graphify query "check_rate_limit" --dfs
→ check_rate_limit() 被 publish_content() 调
→ publish_content() 被 publish_router.py 的 POST /publish 端点调
→ check_rate_limit 读了 rate_logs 表、Account.last_used_at 字段

推理：rate_logs 表说明频率是持久化的，不是内存计数；
     Account.last_used_at 说明优先用最近没发过的账号。
     → 结论：这是为了多账号轮换 + 跨重启持久化频率计数。
     
你不需要文档，靠调用链 + 数据模型自己就推出来了。
```

**GraphRAG 给你的（假设设计文档里有）：**

```
graphrag query --method local "publisher.py 频率保护的原理"

→ 「根据 design/publishing-rate-limit.md：小红书 API 限制单账号每日发帖 ≤3 篇，
   超限会被标记为营销号。因此 publisher 实现了：
   1. 发布前检查近 24h 发帖数
   2. 优先选低活跃度账号
   3. 如果所有账号都超限，排队等待下一个可用窗口」
```

**差距在哪？** GraphRAG 的答案更「人类友好」，但前提是文档存在。没有文档，它给不出这种答案——LLM 不会凭空知道你项目的设计意图。

### 实战建议：接手后理解模块的 SOP

```
Step 1：graphify query "<模块核心函数>" --budget 3000
        → 拿到调用全景图（谁调它、它调谁）

Step 2：graphify explain "<模块核心函数>"
        → 拿到单节点的边关系（入边/出边类型）

Step 3：读对应的测试文件
        → 测试 = 可执行的设计文档。
        → graphify path "<核心函数>" "test_*.py中该模块的测试"
        → 测试告诉你「这个模块的预期行为边界」

Step 4（仅在有文档时）：读 GraphRAG 缓存
        → docs/architecture/对应的社区摘要
```

**绝大多数情况，Step 1-3 就够你理解模块了。Step 4 是锦上添花。**

### 一句话

> **想理解模块工作流 → Graphify。想知道为什么这么设计 → 读测试。GraphRAG 只在你项目恰好有人写了详细设计文档时有增值。**

---

## 十六、最终简化：一张图说清楚

经过了前面所有讨论，最终的工具边界如下：

```
你接手一个项目
        │
        ├─ 有代码 ──────────────────→ 装 Graphify
        │     ├─ graphify query  → 调用链、工作流
        │     ├─ graphify path   → 跨模块路径
        │     ├─ graphify explain → 节点含义
        │     └─ GRAPH_REPORT.md → God Nodes + 社区地图
        │
        ├─ 有大量文档（50+ 篇设计文档/RFC/会议纪要）→ 再装 GraphRAG
        │     └─ graphrag index  → 文档概念图谱 + 社区摘要
        │        （在全局性问题或写技术文档时读缓存，不实时调）
        │
        └─ 日常开发 → 用 GSD 编排
              ├─ $gsd-debug   → 修 Bug（自动调 Graphify）
              ├─ $gsd-fast    → 小修小补（自动调 Graphify）
              ├─ $gsd-execute-phase → 加功能（自动调 Graphify）
              └─ $gsd-forensics → 复盘（自动调 Graphify）

三句话总结：

1. Graphify = 代码地图（必需品，接手任何项目都装）
2. GraphRAG = 文档地图（奢侈品，有大量文档才装）
3. GSD = 自动驾驶（喊一声，自动调度以上两个）
```

## 十七、AGENTS.md 终极模板（直接用）

接手新项目后，建完图直接复制以下内容到项目根目录 `AGENTS.md`：

```markdown
## Graphify 知识图谱（强制自动调用）

本项目已运行 `graphify`，知识图谱位于 `graphify-out/`。

### 强制规则：以下场景必须先查图谱

| 场景 | 必须先运行 |
|------|-----------|
| Bug 定位（带报错信息） | `graphify query "<报错函数>" --dfs` |
| 问调用链 / 依赖关系 | `graphify query "<问题>"` |
| 问跨模块路径 | `graphify path "<A>" "<B>"` |
| 问代码实体含义 | `graphify explain "<实体>"` |
| 修改任何文件前（影响面分析） | `graphify query "<实体>" --budget 2000` |
| 改完代码后 | `graphify update .` |

### God Nodes（改前必须做影响面分析）
<!-- 从 GRAPH_REPORT.md 的 God Nodes 章节粘贴到这里 -->

### 改代码后强制动作
```bash
graphify update . && pytest -x --tb=short 2>&1 | tail -5
```
两个都通过才算完成。

### GSD 工作流规则
- 每轮只推进一个 bounded slice
- 修改源文件默认不超过 6 个
- 不跳过图谱更新声称完成

---

<!-- 以下仅在有大量文档时启用 -->

## GraphRAG 文档图谱（可选，仅全局架构问题）

预生成的架构摘要位于 `docs/architecture/`。
用户问「整体架构」「设计决策」等全局性问题时，先读对应摘要文件。
```

---

> **全文完。拿到新项目，从这里开始：Phase -1 装工具 → Phase 0 速览 → Phase 1 graphify . → Phase 3 粘贴 AGENTS.md 模板。之后你对 AI 描述需求，一切自动。**

---

## 十八、GSD 项目 + GraphRAG：真正的完美配对

### GSD 自己就是文档生成器

GSD 的每个 phase 都会在 `.planning/` 下产出结构化文档。假设跑了 15 个 phase：

```
.planning/
├── phases/
│   ├── 01-auth/CONTEXT.md, DISCUSSION-LOG.md, PLAN.md, REVIEW.md
│   ├── 02-campaigns/...
│   ├── 05-outreach/...
│   └── ...
├── STATE.md       → 全程状态日志
└── ROADMAP.md     → 路线图演变更
```

这些文档里有代码永远不会告诉你的东西：**决策过程的讨论、被否决的方案、trade-off 分析。**

### 这时候 GraphRAG 真有用

| 你六个月后想问的 | 代码能答吗 | GSD 文档有吗 | GraphRAG 能答吗 |
|---------------|----------|------------|---------------|
| outreach 为什么选评论而不是私信 | ❌ | ✅ DISCUSSION-LOG | ✅ 跨文档摘要 |
| 图片生成换了两次供应商，原因是什么 | ❌ | ✅ 两个 phase 的 SUMMARY | ✅ 时序关联 |
| 全项目有过哪些安全相关的决策 | ❌ | ✅ 分散在多个 phase | ✅ 主题聚类 |
| Phase 10 的重构影响了哪些模块 | ❌ | ✅ PLAN + SUMMARY | ✅ 变更影响摘要 |

### 怎么配

```bash
# 不喂代码，只喂 GSD 文档
graphify .planning/ --mode deep   # 对 .planning/ 目录单独建图

# 然后喂 GraphRAG
graphrag init --root ./graphrag-gsd
cp graphify-out/graph.json ./graphrag-gsd/input/
graphrag index
```

**注意**：这里的 graphify 输入不是代码，是 `.planning/` 下的文档。建出来的图是「设计决策图谱」而不是「代码依赖图谱」。

### 最终完整架构

```
                    ├─ 代码 → Graphify → 代码图谱（调用链/依赖）
接手项目             │
                    ├─ GSD 文档 → Graphify → 设计图谱（决策/讨论）
                    │                  │
                    │                  └→ GraphRAG → 设计意图检索
                    │
                    └─ GSD → 日常开发流程编排
```

**两个图谱，两个 GraphRAG 索引，互不干扰：**

| 图谱 | 输入 | 回答的问题 |
|------|------|-----------|
| 代码图谱 | `src/**/*.py` | 「函数 A 调了谁」「改 X 影响哪些文件」 |
| 设计图谱 | `.planning/**/*.md` | 「为什么选方案 B」「Phase 5 的 trade-off 是什么」 |

### 一句话

> **接手纯代码项目 → GraphRAG 多余。接手 GSD 跑出来的项目 → GraphRAG 完美适配，因为 GSD 替你写了最贵的那部分输入——设计决策文档。**

---

## 十九、两个实战问题

### 问题一：中途接手，从零开始用 GSD？

**完全可行，而且是正确的做法。** 流程不变：

```
项目原开发者留下的代码（无 GSD 文档）
        │
你接手第一天 → graphify . --mode deep → 建图
        │
你开始用 GSD 修第一个 Bug：
  $gsd-debug → 产出 .planning/phases/20-bugfix/CONTEXT.md, PLAN.md, SUMMARY.md
        │
你开始用 GSD 加第一个功能：
  $gsd-execute-phase → 产出 .planning/phases/21-new-feature/...
        │
三个月后 → .planning/ 下积累了 10+ 个 phase 的设计文档
        │
此时 GraphRAG 有意义了：喂 .planning/ 进去 → 你的设计决策可追溯
```

**区别只是**：原作者的代码没有 GSD 文档，GraphRAG 只能分析你接手后的决策。但这也够了——你不需要理解原作者脑子里想什么，你需要理解的是**你自己加的东西和修的东西为什么那么做**。

### 问题二：怎么用图谱分析既存项目？（实战演示）

以下是 SNS-HR 项目的真实分析过程，每一步都对应一条命令和你得到的信息。

#### 第一步：看全景（5 分钟）

```
读 GRAPH_REPORT.md 三个章节：

God Nodes → 这个项目核心是 JDDocument/Account/Candidate/Campaign/AuditLog
            ← 翻译成人话：一个管理「职位 → 账号 → 候选人 → 活动 → 审计」的系统

Communities → 145 个模块群，关键的有：
              Publishing Service（发布）、Candidate Discovery（发现）、
              Outreach Comment Automation（触达）、Candidate Profiling（画像）
            ← 翻译成人话：系统分四大块——发现候选人→画像评分→自动触达→内容发布

Surprising Connections → 设计文档引用了 Layout.tsx 等前端组件
            ← 翻译成人话：设计文档和代码之间有隐含依赖，别只看代码
```

#### 第二步：深入一个模块（10 分钟）

```
你接手后第一个任务是修 outreach 模块的 Bug。

graphify explain "bulk_outreach()" → 返回：

  bulk_outreach() 在 backend/app/services/outreach.py:380
  调了：generate_draft() → execute_outreach() → _check_comment_limit() → _random_delay()
  被谁调：start_outreach()、resume_outreach()
  注释：「批量触达协调器：遍历所有 confirmed 候选人 → 选账号 → 生成话术 → 延时 → 执行」

  你一秒钟就知道：这个函数是入口，下面有 5 个子步骤，被两个地方调用。
  传统方式需要 rg + 人肉读文件，至少 15 分钟。
```

#### 第三步：追踪跨模块数据流（2 分钟）

```
你想知道「发现 → 画像 → 触达」三个阶段怎么串起来的：

graphify path "run_discover_background" "bulk_outreach"

→ 最短路径（3 跳）：
  run_discover_background() → discover_candidates() → _audit() ← bulk_outreach()

  翻译：发现和触达两个模块通过审计日志桥接，不是直接调用。
        这意味着修改任一模块时，另一个不受直接代码依赖影响——
        但它们共享审计日志的数据结构，改 _audit() 会影响两边。
```

#### 第四步：改代码前的影响面分析（1 分钟）

```
你决定改 outreach.py 的 comment_limit 逻辑：

graphify query "outreach" --budget 1500

→ 波及面：
  - services/outreach.py（本文件）
  - services/utils.py 的 write_audit_log()
  - models.py 的 Interaction/InteractionStatus
  - tests/test_outreach.py
  - routers/outreach.py 的 API 端点

  你知道：改 1 个地方，至少测 5 个文件。传统方式可能只测了本文件。
```

#### 总结：分析既存项目的四步法

| 步骤 | 命令 | 你得到的信息 | 耗时 |
|------|------|------------|------|
| 看全景 | 读 GRAPH_REPORT.md | 核心实体 + 模块边界 | 5 分钟 |
| 深入模块 | `graphify explain "<函数>"` | 函数的上下游关系 + 注释 | 每次 10 秒 |
| 追踪流程 | `graphify path "<起点>" "<终点>"` | 跨模块数据流路径 | 每次 2 秒 |
| 影响分析 | `graphify query "<实体>" --budget N` | 改这里会波及哪些文件 | 每次 1 秒 |

> **工具价值 = 把「人肉 grep + 跳转 + 读懂」的 15 分钟压缩到 10 秒。这就是接手项目时最直接的 ROI。**

---

## 二十、完整 SOP 速查卡

拿到新项目后，按顺序执行：

```
┌─ 1. 环境 ──────────────────────────────────────┐
│ npm install -g graphify                         │
│ pip install graphrag   （有大量文档才装）         │
└────────────────────────────────────────────────┘
┌─ 2. 建图 ──────────────────────────────────────┐
│ cd project && graphify . --mode deep            │
│ → 等 5-15 分钟                                  │
└────────────────────────────────────────────────┘
┌─ 3. 读报告 ────────────────────────────────────┐
│ 读 graphify-out/GRAPH_REPORT.md                 │
│ → God Nodes + Communities + Surprising Connections │
└────────────────────────────────────────────────┘
┌─ 4. 写规则 ────────────────────────────────────┐
│ 把第十七章的 AGENTS.md 模板粘贴到项目根目录        │
│ → AI 从此自动调 graphify                         │
└────────────────────────────────────────────────┘
┌─ 5.（可选）GraphRAG ───────────────────────────┐
│ 仅当项目有 50+ 篇文档或你用 GSD 积累了大量文档    │
│ → graphrag init && graphrag index               │
│ → 导出摘要为 .md，放到 docs/architecture/        │
└────────────────────────────────────────────────┘
┌─ 6. 日常开发 ──────────────────────────────────┐
│ $gsd-debug 「Bug 描述」→ 自动修                  │
│ $gsd-fast 「小改动」  → 快速修                   │
│ $gsd-execute-phase   → 加功能                    │
│ $gsd-forensics       → 复盘                      │
└────────────────────────────────────────────────┘
```

---

> **全文完。这份 SOP 是你和 AI 花了 930 行对话迭代出来的，每一条结论都经过真实项目验证。拿到新项目那天，从这里开始。**
