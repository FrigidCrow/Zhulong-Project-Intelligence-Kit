const CATEGORY_ORDER = [
  "接入 / 初始化",
  "Codebase",
  "文档 / RAG",
  "Graphify / 代码地图",
  "Refresh / Mode",
  "Evidence / Trace",
  "Policy / Privacy",
  "Runtime / Skills",
  "Workflow 主循环",
  "Workflow Guard",
  "可视化 / Cockpit",
  "Help / Status",
];

const LOGICAL_NAMES = {
  zl: "统一 CLI 入口",
  "zl-init": "初始化工作台",
  "zl-verify": "初始化完整性检查",
  "zl-map": "轻量结构地图",
  "zl-codebase": "代码基线扫描别名",
  "zl-codebase-scan": "代码基线扫描",
  "zl-codebase-status": "代码基线状态",
  "zl-docs-scan": "文档来源扫描",
  "zl-docs-status": "文档状态查看",
  "zl-docs-normalize": "文档归一化",
  "zl-docs-extract": "文档文本抽取",
  "zl-docs-diff": "文档差分检查",
  "zl-docs-citations": "文档引用检索",
  "zl-docs-index": "GraphRAG 索引入口",
  "zl-docs-query": "本地文档查询",
  "zl-docs-sync": "文档轻量同步",
  "zl-ambiguity-audit": "多语言暧昧表达审计",
  "zl-structure-audit": "关键制品结构审计",
  "zl-answer-audit": "回答依据审计",
  "zl-rag-init-local": "本地 GraphRAG 初始化",
  "zl-rag-golden-add": "RAG Golden 样例追加",
  "zl-rag-golden-run": "RAG Golden 评测",
  "zl-rag-eval": "RAG 质量评估",
  "zl-preflight": "轻量前置检查",
  "zl-refresh-plan": "刷新建议计划",
  "zl-refresh-run": "显式刷新执行",
  "zl-mode-status": "执行模式查看",
  "zl-mode-set": "执行模式切换",
  "zl-citation-audit": "引用证据审计",
  "zl-trace-build": "需求-代码-测试追踪矩阵",
  "zl-trace-query": "追踪矩阵查询",
  "zl-trace-audit": "追踪矩阵审计",
  "zl-policy-list": "策略列表",
  "zl-policy-check": "策略检查",
  "zl-policy-explain": "策略解释",
  "zl-policy-lock": "策略快照锁定",
  "zl-policy-verify": "策略锁验证",
  "zl-policy-diff": "策略漂移差分",
  "zl-help-skills": "场景命令推荐",
  "zl-next": "下一步命令发现",
  "zl-privacy-audit": "本地隐私审计",
  "zl-offline-lock": "离线锁定",
  "zl-outbound-audit": "外发风险审计",
  "zl-license-audit": "License 风险审计",
  "zl-graph-build": "Graphify 构建入口",
  "zl-graph-status": "代码地图状态",
  "zl-graph-query": "代码地图查询",
  "zl-graph-diff": "代码图差分",
  "zl-graph-impact": "代码影响面分析",
  "zl-graph-risk": "代码风险扫描",
  "zl-graph-freshness": "代码图新鲜度检查",
  "zl-evidence-record": "证据记录",
  "zl-evidence-status": "证据状态",
  "zl-runtime-install": "Runtime command pack 安装",
  "zl-runtime-status": "Runtime command pack 状态",
  "zl-context-debug": "Debug 上下文包",
  "zl-context-execute": "实施上下文包",
  "zl-new-milestone": "开启里程碑循环",
  "zl-spec-phase": "需求整理阶段",
  "zl-discuss-phase": "讨论决策阶段",
  "zl-ui-phase": "UI 范围阶段",
  "zl-debug": "缺陷调查工作流",
  "zl-plan-phase": "计划阶段",
  "zl-execute-phase": "实施阶段",
  "zl-code-review": "代码审查工作流",
  "zl-verify-work": "工作验证阶段",
  "zl-complete-milestone": "完成里程碑",
  "zl-workflow-run": "通用 workflow 启动",
  "zl-workflow-status": "workflow 状态查看",
  "zl-workflow-continue": "人工 gate 标记",
  "zl-workflow-audit": "workflow 审计",
  "zl-gate-check": "gate 检查",
  "zl-completion-check": "完成前检查",
  "zl-cockpit-build": "项目驾驶舱生成",
};

const OUTPUTS = {
  zl: "stdout help / command routing",
  "zl-init": "AGENTS.md, project.manifest.yml, .planning/, .planning/INIT_PROFILE.md",
  "zl-verify": "stdout ok/missing 检查结果",
  "zl-map": ".planning/codebase/STRUCTURE.md",
  "zl-codebase": ".planning/codebase/CODEBASE_STATUS.md, STRUCTURE.md, STACK.md, TESTING.md, ARCHITECTURE.md",
  "zl-codebase-scan": ".planning/codebase/CODEBASE_STATUS.md, STRUCTURE.md, STACK.md, TESTING.md, ARCHITECTURE.md",
  "zl-codebase-status": "stdout codebase inventory 和 graph 状态",
  "zl-docs-scan": ".planning/knowledge/RAG_SOURCES.md, DOC_RAG_STATUS.md",
  "zl-docs-status": "stdout document context status",
  "zl-docs-normalize": ".planning/knowledge/normalized/",
  "zl-docs-extract": ".planning/knowledge/DOCUMENT_INDEX.json, DOCUMENT_EXTRACT_REPORT.md, extracted/",
  "zl-docs-diff": ".planning/knowledge/DOCUMENT_DIFF.md",
  "zl-docs-citations": ".planning/knowledge/CITATIONS.md",
  "zl-docs-index": ".planning/knowledge/RAG_INDEX_HANDOFF.md, 可选 RAG_INDEX_RESULT.md",
  "zl-docs-query": ".planning/knowledge/DOCS_QUERY_RESULT.md/json 或 RAG_QUERY_RESULT.md",
  "zl-docs-sync": ".planning/knowledge/DOCS_SYNC.md/json, 可选 RAG_INDEX_RESULT.md",
  "zl-ambiguity-audit": ".planning/quality/AMBIGUITY_AUDIT.md/json",
  "zl-structure-audit": ".planning/quality/STRUCTURE_AUDIT.md/json",
  "zl-answer-audit": ".planning/quality/ANSWER_AUDIT.md/json",
  "zl-rag-init-local": "graphrag-workspace/settings.yaml, graphrag-workspace/input/, .planning/knowledge/LOCAL_RAG_STATUS.md",
  "zl-rag-golden-add": ".planning/knowledge/rag-golden/*.json",
  "zl-rag-golden-run": ".planning/quality/RAG_GOLDEN_RUN.md/json",
  "zl-rag-eval": ".planning/quality/RAG_EVAL.md/json",
  "zl-preflight": ".planning/refresh/PREFLIGHT.md/json",
  "zl-refresh-plan": ".planning/refresh/REFRESH_PLAN.md/json",
  "zl-refresh-run": ".planning/refresh/REFRESH_RUN.md, REFRESH_STATE.json",
  "zl-mode-status": ".planning/refresh/MODE.md",
  "zl-mode-set": ".planning/config.json, .planning/refresh/MODE.md",
  "zl-citation-audit": ".planning/quality/CITATION_AUDIT.md/json",
  "zl-trace-build": ".planning/trace/TRACE_MATRIX.md/json",
  "zl-trace-query": "stdout trace query result",
  "zl-trace-audit": ".planning/trace/TRACE_AUDIT.md/json",
  "zl-policy-list": ".planning/policies/POLICY_LIST.md",
  "zl-policy-check": ".planning/policies/POLICY_CHECK.md/json",
  "zl-policy-explain": ".planning/policies/POLICY_EXPLAIN.md",
  "zl-policy-lock": ".planning/policies/POLICY_LOCK.md/json",
  "zl-policy-verify": ".planning/policies/POLICY_VERIFY.md/json",
  "zl-policy-diff": ".planning/policies/POLICY_DIFF.md/json",
  "zl-help-skills": ".planning/help/HELP_SKILLS.md/json",
  "zl-next": ".planning/help/NEXT.md",
  "zl-privacy-audit": ".planning/knowledge/PRIVACY_AUDIT.md",
  "zl-offline-lock": ".planning/privacy/OFFLINE_LOCK.md/json",
  "zl-outbound-audit": ".planning/privacy/OUTBOUND_AUDIT.md/json",
  "zl-license-audit": "verification/reports/license-audit.md 或 .planning/license-audit.md",
  "zl-graph-build": ".planning/graphs/GRAPH_BUILD_HANDOFF.md, 可选 graph.json / GRAPH_REPORT.md / GRAPH_BUILD_RESULT.md",
  "zl-graph-status": "stdout code map status",
  "zl-graph-query": "stdout code map matches",
  "zl-graph-diff": ".planning/graphs/GRAPH_DIFF.md",
  "zl-graph-impact": ".planning/graphs/GRAPH_IMPACT.md/json",
  "zl-graph-risk": ".planning/graphs/GRAPH_RISK.md/json",
  "zl-graph-freshness": ".planning/graphs/GRAPH_FRESHNESS.md/json",
  "zl-evidence-record": ".planning/evidence/*.md, .planning/evidence/INDEX.md, 可选 writeback",
  "zl-evidence-status": ".planning/evidence/INDEX.md 和 stdout summary",
  "zl-runtime-install": "Codex/Claude Code skills 或 GitHub Copilot prompts",
  "zl-runtime-status": "stdout runtime pack 渲染状态",
  "zl-context-debug": ".planning/context/*debug*.md 和 handoff",
  "zl-context-execute": ".planning/context/*execute*.md 和 handoff",
  "zl-workflow-run": ".planning/workflows/<id>/WORKFLOW_STATE.md/json, WORKFLOW_FACADE.md/json",
  "zl-workflow-status": "stdout gate 状态",
  "zl-workflow-continue": ".planning/workflows/<id>/WORKFLOW_STATE.md/json",
  "zl-workflow-audit": ".planning/workflows/<id>/WORKFLOW_AUDIT.md",
  "zl-gate-check": "stdout gate result",
  "zl-completion-check": "stdout completion allowed/blocked",
  "zl-cockpit-build": ".planning/cockpit/index.html, cockpit-data.json, COCKPIT_REPORT.md, assets/",
};

const PUBLIC_WORKFLOW_OUTPUT = ".planning/context/*, .planning/context/handoffs/*, .planning/workflows/<id>/WORKFLOW_FACADE.md/json";
for (const command of [
  "zl-new-milestone",
  "zl-spec-phase",
  "zl-discuss-phase",
  "zl-ui-phase",
  "zl-debug",
  "zl-plan-phase",
  "zl-execute-phase",
  "zl-code-review",
  "zl-verify-work",
  "zl-complete-milestone",
]) {
  OUTPUTS[command] = PUBLIC_WORKFLOW_OUTPUT;
}

function categoryFor(command) {
  if (["zl", "zl-init", "zl-verify", "zl-map"].includes(command)) return "接入 / 初始化";
  if (command.startsWith("zl-codebase")) return "Codebase";
  if (command.startsWith("zl-docs") || command.startsWith("zl-rag") || command === "zl-answer-audit" || command === "zl-ambiguity-audit" || command === "zl-structure-audit" || command === "zl-citation-audit") return "文档 / RAG";
  if (command.startsWith("zl-graph")) return "Graphify / 代码地图";
  if (command.startsWith("zl-refresh") || command.startsWith("zl-mode") || command === "zl-preflight") return "Refresh / Mode";
  if (command.startsWith("zl-evidence") || command.startsWith("zl-trace")) return "Evidence / Trace";
  if (command.startsWith("zl-policy") || command.startsWith("zl-privacy") || command.startsWith("zl-offline") || command.startsWith("zl-outbound") || command.startsWith("zl-license")) return "Policy / Privacy";
  if (command.startsWith("zl-runtime") || command.startsWith("zl-context")) return "Runtime / Skills";
  if (["zl-new-milestone", "zl-spec-phase", "zl-discuss-phase", "zl-ui-phase", "zl-debug", "zl-plan-phase", "zl-execute-phase", "zl-code-review", "zl-verify-work", "zl-complete-milestone"].includes(command)) return "Workflow 主循环";
  if (command.startsWith("zl-workflow") || command === "zl-gate-check" || command === "zl-completion-check") return "Workflow Guard";
  if (command === "zl-cockpit-build") return "可视化 / Cockpit";
  return "Help / Status";
}

function heavyRefreshFor(command) {
  if (command === "zl-docs-sync") return "默认否；只有 --index 才会显式执行 configured GraphRAG index。";
  if (command === "zl-docs-index") return "默认否；只有 --run 才会执行 configured GraphRAG index。";
  if (command === "zl-graph-build") return "默认否；只有 --run 才会执行 configured Graphify / code map build。";
  if (command === "zl-refresh-run") return "是；这是显式刷新命令，只在用户或 policy 明确要求时使用。";
  if (command === "zl-cockpit-build") return "否；只读取已有本地 artifact，生成静态 HTML，不执行 GraphRAG index 或 Graphify build。";
  return "否；只做轻量检查、状态读取、报告写入或 workflow 编排。";
}

function usageFor(command) {
  const target = '--target "$PWD"';
  const samples = {
    zl: "zl --help\nnode bin/zl.mjs --help",
    "zl-init": `zl-init ${target} --interactive
zl-init ${target} --template brownfield-monorepo --name existing_project --mode existing --doc-policy reference --rag none
zl-init ${target} --template brownfield-monorepo --mode existing --doc-policy strict --rag local --setup-rag skip
zl-init ${target} --doc-policy strict --rag external --allow-external-rag`,
    "zl-verify": `zl-verify ${target}`,
    "zl-map": `zl-map ${target}`,
    "zl-codebase": `zl-codebase ${target}`,
    "zl-codebase-scan": `zl-codebase-scan ${target}`,
    "zl-codebase-status": `zl-codebase-status ${target}`,
    "zl-docs-scan": `zl-docs-scan ${target}`,
    "zl-docs-status": `zl-docs-status ${target}`,
    "zl-docs-normalize": `zl-docs-normalize ${target}`,
    "zl-docs-extract": `zl-docs-extract ${target}`,
    "zl-docs-diff": `zl-docs-diff ${target}`,
    "zl-docs-citations": `zl-docs-citations ${target} "退款 上限"`,
    "zl-docs-index": `zl-docs-index ${target}\nzl-docs-index ${target} --run`,
    "zl-docs-query": `zl-docs-query ${target} "退款 上限"\nzl-docs-query ${target} --rag "退款规则的正式依据是什么？"`,
    "zl-docs-sync": `zl-docs-sync ${target}\nzl-docs-sync ${target} --index`,
    "zl-ambiguity-audit": `zl-ambiguity-audit ${target}\nzl-ambiguity-audit ${target} --strict`,
    "zl-structure-audit": `zl-structure-audit ${target}\nzl-structure-audit ${target} --strict`,
    "zl-answer-audit": `zl-answer-audit ${target}\nzl-answer-audit ${target} --from .planning/knowledge/DOCS_QUERY_RESULT.md`,
    "zl-rag-init-local": `zl-rag-init-local ${target}`,
    "zl-rag-golden-add": `zl-rag-golden-add ${target} --question "退款审批上限是多少？" --expect "30,000" --citation "docs/policy.md:12"`,
    "zl-rag-golden-run": `zl-rag-golden-run ${target}`,
    "zl-rag-eval": `zl-rag-eval ${target}`,
    "zl-preflight": `zl-preflight ${target}`,
    "zl-refresh-plan": `zl-refresh-plan ${target}`,
    "zl-refresh-run": `zl-refresh-run ${target} --graph\nzl-refresh-run ${target} --rag`,
    "zl-mode-status": `zl-mode-status ${target}`,
    "zl-mode-set": `zl-mode-set ${target} docs-reference
zl-mode-set ${target} docs-strict
zl-mode-set ${target} graph-lite`,
    "zl-citation-audit": `zl-citation-audit ${target}`,
    "zl-trace-build": `zl-trace-build ${target}`,
    "zl-trace-query": `zl-trace-query ${target} "退款审批"`,
    "zl-trace-audit": `zl-trace-audit ${target}`,
    "zl-policy-list": `zl-policy-list ${target}`,
    "zl-policy-check": `zl-policy-check ${target}`,
    "zl-policy-explain": `zl-policy-explain ${target} privacy.local_only`,
    "zl-policy-lock": `zl-offline-lock ${target}\nzl-policy-lock ${target}`,
    "zl-policy-verify": `zl-policy-verify ${target}`,
    "zl-policy-diff": `zl-policy-diff ${target}`,
    "zl-help-skills": `zl-help-skills ${target} "文档更新后确认影响面"`,
    "zl-next": `zl-next ${target}`,
    "zl-privacy-audit": `zl-privacy-audit ${target} --strict`,
    "zl-offline-lock": `zl-offline-lock ${target}`,
    "zl-outbound-audit": `zl-outbound-audit ${target}`,
    "zl-license-audit": `zl-license-audit ${target}`,
    "zl-graph-build": `zl-graph-build ${target}\nzl-graph-build ${target} --run`,
    "zl-graph-status": `zl-graph-status ${target}`,
    "zl-graph-query": `zl-graph-query ${target} "PaymentService"`,
    "zl-graph-diff": `zl-graph-diff ${target} --save-baseline\nzl-graph-diff ${target}`,
    "zl-graph-impact": `zl-graph-impact ${target} --files "src/approval.js"`,
    "zl-graph-risk": `zl-graph-risk ${target}`,
    "zl-graph-freshness": `zl-graph-freshness ${target} --strict`,
    "zl-evidence-record": `zl-evidence-record ${target} "退款审批上限修复已验证" --command "npm test" --result "passed" --writeback .planning/issues/CR-017.md`,
    "zl-evidence-status": `zl-evidence-status ${target}`,
    "zl-runtime-install": `zl-runtime-install --runtime codex --dest ~/.codex/skills`,
    "zl-runtime-status": `zl-runtime-status --runtime codex --dest ~/.codex/skills`,
    "zl-context-debug": `zl-context-debug ${target} "退款上限与业务规则不一致"`,
    "zl-context-execute": `zl-context-execute ${target} "实现退款上限检查"`,
    "zl-workflow-run": `zl-workflow-run ${target} debug "生产审批金额异常"`,
    "zl-workflow-status": `zl-workflow-status ${target}`,
    "zl-workflow-continue": `zl-workflow-continue ${target} --gate plan --evidence "PLAN.md reviewed"`,
    "zl-workflow-audit": `zl-workflow-audit ${target}`,
    "zl-gate-check": `zl-gate-check ${target}`,
    "zl-completion-check": `zl-completion-check ${target}`,
    "zl-cockpit-build": `zl-cockpit-build ${target}`,
  };
  if (samples[command]) return samples[command];
  return `${command} ${target} "当前任务说明"`;
}

function paramsFor(command) {
  const params = ["--target <repo>: 指定目标项目目录。"];
  if (command === "zl") return ["--help: 查看命令帮助。"];
  if (command === "zl-init") params.push(
    "--template <name>: 选择初始化模板。",
    "--name <name>: 写入项目名。",
    "--mode new|existing: 指定新项目或既存项目。",
    "--doc-policy reference|strict: 选择文档是参考资料还是强约束依据。",
    "--rag none|local|external: 选择不启用 RAG、本地 RAG 或外部 RAG。",
    "--setup-rag ask|install|skip: 本地 RAG 依赖处理方式；默认 skip，只写 setup plan。",
    "--allow-external-rag: 显式确认外部 RAG 可能导致文档内容离开本机。",
    "--interactive: 强制进入 init wizard；真实终端只运行 `zl-init --target <repo>` 也会进入向导。",
    "--no-interactive: 在真实终端中也跳过向导，使用显式参数或默认值。",
    "--force: 覆盖已有模板文件。",
  );
  if (command.includes("docs-query")) params.push("--rag: 使用 configured RAG query command。");
  if (command === "zl-docs-sync") params.push("--index: 显式允许同步后执行 GraphRAG index。");
  if (command === "zl-docs-index" || command === "zl-graph-build") params.push("--run: 显式执行配置的外部工具命令。");
  if (command === "zl-answer-audit") params.push("--from <file>: 指定回答来源文件。", "--answer <text>: 调试用，直接传入回答文本。");
  if (command === "zl-ambiguity-audit" || command === "zl-structure-audit") params.push("--strict: 把审计发现升级为阻断失败；默认只报告风险。");
  if (command === "zl-refresh-run") params.push("--rag: 刷新 RAG。", "--graph: 刷新 Graphify/code map。", "--all: 两者都刷新。", "--force: 忽略普通跳过建议。");
  if (command === "zl-mode-set") params.push("docs-reference|docs-strict: 推荐用户语义。", "graph-lite|default-local-rag|full-strict: 兼容旧内部 profile。");
  if (command === "zl-graph-impact") params.push("--files <paths>: 逗号分隔的变更文件。");
  if (command === "zl-evidence-record") params.push("--command <cmd>: 记录验证命令。", "--result <text>: 记录验证结果。", "--source <paths>: 记录依据来源。", "--writeback <file>: 回写到工作记录。");
  if (command === "zl-runtime-install" || command === "zl-runtime-status") return ["--runtime codex|claude-code|github-copilot: 目标 runtime。", "--dest <dir>: 安装或检查目录。", "--force: 安装时覆盖已有文件。"];
  if (command === "zl-workflow-continue") params.push("--gate plan|implementation|verification: 标记人工 gate。", "--evidence <text>: gate 证据。");
  if (command.startsWith("zl-policy") || command.startsWith("zl-privacy") || command === "zl-preflight" || command === "zl-graph-freshness") params.push("--strict: 以严格 profile 语义处理失败。");
  return params;
}

function purposeFor(command) {
  if (command === "zl-ui-phase") return "读取项目设计证据，定义 UI 状态与数据合同，并在 preserve、evolve、create、system 间选择条件化 Taste 权限。";
  const category = categoryFor(command);
  if (category === "接入 / 初始化") return "把 Zhulong 本地 intelligence layer 接入项目，或检查接入状态是否完整。";
  if (category === "Codebase") return "建立或读取代码基线，让后续 AI 修改先知道项目结构、技术栈、测试入口和源码数量。";
  if (category === "文档 / RAG") return "按需把需求、ADR、QA、会议记录、设计和运行文档转成本地可查、可引用、可审计的知识证据；`rag none` 项目无需建立 RAG 索引。";
  if (category === "Graphify / 代码地图") return "读取或更新 Graphify/code map，帮助判断改修影响面、风险模块和 stale 状态。";
  if (category === "Refresh / Mode") return "控制刷新预算和 profile，避免每个任务都重跑 GraphRAG 或 Graphify。";
  if (category === "Evidence / Trace") return "把验证结果、需求或决策依据、代码影响和测试覆盖写成可追踪证据。";
  if (category === "Policy / Privacy") return "锁定并验证 local-only、offline、policy 和 license 风险边界。";
  if (category === "Runtime / Skills") return "让 Codex、Claude Code、GitHub Copilot 能通过同一套 Zhulong 命令工作。";
  if (category === "Workflow 主循环") return "面向日常开发的公开工作流入口，内部会写 context、handoff、workflow facade 和 gate 状态。";
  if (category === "Workflow Guard") return "检查 workflow 是否具备 plan、implementation、verification、evidence、writeback 等完成条件。";
  if (category === "可视化 / Cockpit") return "把 Graphify、GraphRAG/RAG、workflow、quality、privacy 和 evidence 状态聚合成本地静态驾驶舱。";
  return "根据场景给出下一步 Zhulong 命令建议或状态入口。";
}

function whenFor(command) {
  if (command === "zl-ui-phase") return "创建前端、自然演进、重设计或修改既有 UI 前；必须先确定是否继承现有设计以及 Taste 的权限。";
  if (command === "zl-docs-sync") return "文档第一次导入、需求/ADR/QA/运行资料更新，或文档 gate 需要重新确认时。";
  if (command === "zl-answer-audit") return "做完 docs/RAG query 后，或 AI 给出带规格结论的回答后。";
  if (command === "zl-ambiguity-audit") return "规格、验收条件、QA 或会议结论更新后。";
  if (command === "zl-structure-audit") return "需要确认关键 planning 制品完整，或任务准备完成时。";
  if (command === "zl-next") return "不知道当前该运行哪条命令，或接手一个已有项目时。";
  if (command === "zl-preflight") return "进入 debug、plan、execute 前，确认 RAG/Graphify 是否 stale。";
  if (command === "zl-refresh-run") return "只有 refresh plan 或 strict policy 明确要求刷新时。";
  if (command === "zl-completion-check") return "AI 或开发者准备声明任务完成前。";
  if (command === "zl-cockpit-build") return "需要给自己或 leader 看项目健康度、Graphify 影响面、RAG 证据链和质量闭环状态时。";
  if (command.startsWith("zl-policy")) return "保密项目、交付前、或 `.planning/config.json` 有变更后。";
  if (command.startsWith("zl-runtime")) return "需要在 Codex、Claude Code、GitHub Copilot 中调用 Zhulong skills/prompts 时。";
  if (command.startsWith("zl-graph")) return "改修前看影响面、改修后验证结构变化、或 graph gate 报 stale 时。";
  if (command.startsWith("zl-docs") || command.startsWith("zl-rag") || command === "zl-citation-audit") return "需要查询或证明项目文档中的规格依据时。";
  if (command.startsWith("zl-workflow") || command === "zl-gate-check") return "需要调试、恢复或审计当前 workflow gate 时。";
  if (categoryFor(command) === "Workflow 主循环") return "日常改修、新规开发、缺陷调查、审查、验证和收口时。";
  return "项目接入、开发循环或完成前检查需要对应状态时。";
}

function defaultBehaviorFor(command) {
  if (command === "zl-ui-phase") return "默认读取 manifest、依赖、设计资料、token、组件和现有页面，生成 Frontend Design Decision；不自动安装 Taste，不改变既有设计，不触发 heavy refresh。";
  if (command === "zl-docs-sync") return "默认只跑 scan / diff / extract / citation audit，发现变更只写 STALE_NEEDS_REFRESH，不自动重建 index。";
  if (command === "zl-ambiguity-audit" || command === "zl-structure-audit") return "默认使用纯 Node 确定性规则生成报告，不联网、不调用 LLM、不阻断；--strict 才硬失败。";
  if (command === "zl-next") return "只读取本地状态并给出 2-3 条命令，不自动执行建议，也不运行重型刷新。";
  if (command === "zl-init") return "真实终端默认进入 init wizard；CI/非 TTY 默认使用 `reference + rag none + local_only`。只叠加 `.planning/` 和配置，不安装 RAG、不执行 GraphRAG index、不执行 Graphify build；strict 必须显式选择 local/external RAG。";
  if (command === "zl-docs-index") return "默认只写 handoff；带 --run 才执行 configured index_command。";
  if (command === "zl-graph-build") return "默认只写 handoff；带 --run 才执行 configured Graphify/code map command。";
  if (command === "zl-refresh-run") return "显式刷新命令，会根据参数执行 RAG、Graphify 或两者，并更新 REFRESH_STATE。";
  if (command.startsWith("zl-policy")) return "只做轻量 policy/privacy/preflight/citation/freshness 检查，不触发 GraphRAG index 或 Graphify build。";
  if (command === "zl-cockpit-build") return "读取 `templates/cockpit/index.template.html`，注入目标项目的本地 `cockpit-data.json` 和稳定 `cockpit-viewmodel.v1`，生成带搜索、节点详情、legend 过滤和大图聚合的静态 HTML；默认不联网、不调用外部 LLM、不刷新 Graphify/RAG。稳定展示样例见 `templates/cockpit/sample.html`。";
  if (categoryFor(command) === "Workflow 主循环") return "启动 guarded workflow，写 context/handoff/facade，并输出 heavy refresh executed: no。";
  return "读取本地项目状态并写入对应 `.planning/` 报告，不默认执行重刷新。";
}

function failureFor(command) {
  if (command === "zl-ui-phase") return "常见失败：缺少足以区分 preserve/evolve/create/system 的设计证据。只有模式差异会实质影响结果时才询问一个设计方向问题。";
  if (command.startsWith("zl-docs") || command === "zl-ambiguity-audit" || command === "zl-structure-audit") return "常见失败：缺文档抽取、关键制品缺失，或 --strict 下发现不合规。按审计报告中的 artifact 路径补齐。";
  if (command.startsWith("zl-graph")) return "常见失败：`.planning/graphs/graph.json` 或 `GRAPH_REPORT.md` 缺失。先运行 `zl-graph-build --target \"$PWD\" --run`。";
  if (command.startsWith("zl-policy")) return "常见失败：offline lock 缺失、配置漂移、外部 provider、API key 形态或 stale 在 strict profile 下被阻断。";
  if (command.startsWith("zl-workflow") || command === "zl-completion-check" || command === "zl-gate-check") return "常见失败：缺 plan / implementation / verification / evidence / writeback，按 WORKFLOW_AUDIT.md 的 next command 补齐。";
  if (command.startsWith("zl-runtime")) return "常见失败：目标目录缺文件或模板未渲染。重跑 install 并检查 runtime status。";
  if (command === "zl-cockpit-build") return "常见失败：真实项目 Graphify/RAG artifact 缺失会显示 WAIVED_WITH_RISK。先看 `templates/cockpit/sample.html` 确认目标形态；图过大时 cockpit 会自动使用 aggregated-community 预览；需要最新图时显式运行 `zl-graph-build --target \"$PWD\" --run`。";
  return "常见失败：目标项目未初始化或缺少 `.planning/`。先运行 `zl-init --target \"$PWD\"`。";
}

function relatedFor(command) {
  if (command.startsWith("zl-docs") || command.startsWith("zl-rag") || command === "zl-answer-audit" || command === "zl-ambiguity-audit" || command === "zl-structure-audit" || command === "zl-citation-audit") return ["zl-docs-sync", "zl-ambiguity-audit", "zl-docs-query", "zl-answer-audit", "zl-structure-audit"];
  if (command.startsWith("zl-graph")) return ["zl-graph-build", "zl-graph-status", "zl-graph-query", "zl-graph-freshness"];
  if (command.startsWith("zl-policy") || command.startsWith("zl-privacy") || command.startsWith("zl-offline")) return ["zl-offline-lock", "zl-privacy-audit", "zl-policy-lock", "zl-policy-verify", "zl-policy-diff"];
  if (command.startsWith("zl-runtime")) return ["zl-runtime-install", "zl-runtime-status", "zl-help-skills"];
  if (categoryFor(command).startsWith("Workflow")) return ["zl-workflow-status", "zl-workflow-audit", "zl-evidence-record", "zl-completion-check"];
  if (command === "zl-cockpit-build") return ["zl-graph-status", "zl-docs-sync", "zl-answer-audit", "zl-privacy-audit"];
  return ["zl-verify", "zl-preflight", "zl-help-skills"];
}

function scenarioFor(command) {
  if (command === "zl-ui-phase") return "greenfield 营销页、自然演进前端、既存设计维护、Dashboard 与管理后台的设计权限路由。";
  if (command.startsWith("zl-docs") || command.startsWith("zl-rag") || command === "zl-answer-audit" || command === "zl-ambiguity-audit" || command === "zl-structure-audit") return "文档更新循环、机械质量审计、规格依据确认和回答可信度检查。";
  if (command.startsWith("zl-graph")) return "改修影响面、新规设计影响、代码审查前风险确认。";
  if (command.startsWith("zl-policy") || command.startsWith("zl-privacy") || command.startsWith("zl-offline")) return "保密项目、交付前检查、外发风险审计。";
  if (command === "zl-cockpit-build") return "leader 演示、项目状态自查、交付前展示 Graphify/RAG/evidence/quality 状态。";
  if (categoryFor(command) === "Workflow 主循环") return "从需求、调查、计划、实施、验证到完成的开发主循环。";
  if (categoryFor(command) === "Workflow Guard") return "AI 声称完成前、接手中断任务、或 gate 失败排查。";
  return "项目接入、日常状态确认和质量闭环。";
}

export function buildCommandCatalog(pkg) {
  const commands = Object.keys(pkg.bin || {})
    .filter((name) => name === "zl" || name.startsWith("zl-"));
  return commands.map((command, index) => ({
    index,
    command,
    logicalName: LOGICAL_NAMES[command] || command.replace(/^zl-?/, "").replace(/-/g, " "),
    category: categoryFor(command),
    categoryOrder: CATEGORY_ORDER.indexOf(categoryFor(command)),
    purpose: purposeFor(command),
    when: whenFor(command),
    usage: usageFor(command),
    params: paramsFor(command),
    defaultBehavior: defaultBehaviorFor(command),
    heavyRefresh: heavyRefreshFor(command),
    outputs: OUTPUTS[command] || ".planning/ 或 stdout 本地报告",
    successExample: usageFor(command),
    failureExample: failureFor(command),
    related: relatedFor(command).filter((item, idx, arr) => arr.indexOf(item) === idx),
    scenario: scenarioFor(command),
  })).sort((a, b) => {
    if (a.categoryOrder !== b.categoryOrder) return a.categoryOrder - b.categoryOrder;
    return a.index - b.index;
  });
}

export { CATEGORY_ORDER };
