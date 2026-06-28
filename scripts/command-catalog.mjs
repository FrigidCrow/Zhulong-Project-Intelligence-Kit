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
  pik: "统一 CLI 入口",
  "pik-init": "初始化工作台",
  "pik-verify": "初始化完整性检查",
  "pik-map": "轻量结构地图",
  "pik-codebase": "代码基线扫描别名",
  "pik-codebase-scan": "代码基线扫描",
  "pik-codebase-status": "代码基线状态",
  "pik-docs-scan": "文档来源扫描",
  "pik-docs-status": "文档状态查看",
  "pik-docs-normalize": "文档归一化",
  "pik-docs-extract": "文档文本抽取",
  "pik-docs-diff": "文档差分检查",
  "pik-docs-citations": "文档引用检索",
  "pik-docs-index": "GraphRAG 索引入口",
  "pik-docs-query": "本地文档查询",
  "pik-docs-sync": "文档轻量同步",
  "pik-answer-audit": "回答依据审计",
  "pik-rag-init-local": "本地 GraphRAG 初始化",
  "pik-rag-golden-add": "RAG Golden 样例追加",
  "pik-rag-golden-run": "RAG Golden 评测",
  "pik-rag-eval": "RAG 质量评估",
  "pik-preflight": "轻量前置检查",
  "pik-refresh-plan": "刷新建议计划",
  "pik-refresh-run": "显式刷新执行",
  "pik-mode-status": "执行模式查看",
  "pik-mode-set": "执行模式切换",
  "pik-citation-audit": "引用证据审计",
  "pik-trace-build": "仕様-代码-测试追踪矩阵",
  "pik-trace-query": "追踪矩阵查询",
  "pik-trace-audit": "追踪矩阵审计",
  "pik-policy-list": "策略列表",
  "pik-policy-check": "策略检查",
  "pik-policy-explain": "策略解释",
  "pik-policy-lock": "策略快照锁定",
  "pik-policy-verify": "策略锁验证",
  "pik-policy-diff": "策略漂移差分",
  "pik-help-skills": "场景命令推荐",
  "pik-privacy-audit": "本地隐私审计",
  "pik-offline-lock": "离线锁定",
  "pik-outbound-audit": "外发风险审计",
  "pik-license-audit": "License 风险审计",
  "pik-graph-build": "Graphify 构建入口",
  "pik-graph-status": "代码地图状态",
  "pik-graph-query": "代码地图查询",
  "pik-graph-diff": "代码图差分",
  "pik-graph-impact": "代码影响面分析",
  "pik-graph-risk": "代码风险扫描",
  "pik-graph-freshness": "代码图新鲜度检查",
  "pik-evidence-record": "证据记录",
  "pik-evidence-status": "证据状态",
  "pik-runtime-install": "Runtime command pack 安装",
  "pik-runtime-status": "Runtime command pack 状态",
  "pik-context-debug": "Debug 上下文包",
  "pik-context-execute": "实施上下文包",
  "pik-new-milestone": "开启里程碑循环",
  "pik-spec-phase": "仕様整理阶段",
  "pik-discuss-phase": "讨论决策阶段",
  "pik-ui-phase": "UI 范围阶段",
  "pik-debug": "缺陷调查工作流",
  "pik-plan-phase": "计划阶段",
  "pik-execute-phase": "实施阶段",
  "pik-code-review": "代码审查工作流",
  "pik-verify-work": "工作验证阶段",
  "pik-complete-milestone": "完成里程碑",
  "pik-workflow-run": "通用 workflow 启动",
  "pik-workflow-status": "workflow 状态查看",
  "pik-workflow-continue": "人工 gate 标记",
  "pik-workflow-audit": "workflow 审计",
  "pik-gate-check": "gate 检查",
  "pik-completion-check": "完成前检查",
  "pik-cockpit-build": "项目驾驶舱生成",
};

const OUTPUTS = {
  pik: "stdout help / command routing",
  "pik-init": "AGENTS.md, project.manifest.yml, .planning/, .planning/INIT_PROFILE.md",
  "pik-verify": "stdout ok/missing 检查结果",
  "pik-map": ".planning/codebase/STRUCTURE.md",
  "pik-codebase": ".planning/codebase/CODEBASE_STATUS.md, STRUCTURE.md, STACK.md, TESTING.md, ARCHITECTURE.md",
  "pik-codebase-scan": ".planning/codebase/CODEBASE_STATUS.md, STRUCTURE.md, STACK.md, TESTING.md, ARCHITECTURE.md",
  "pik-codebase-status": "stdout codebase inventory 和 graph 状态",
  "pik-docs-scan": ".planning/knowledge/RAG_SOURCES.md, DOC_RAG_STATUS.md",
  "pik-docs-status": "stdout document context status",
  "pik-docs-normalize": ".planning/knowledge/normalized/",
  "pik-docs-extract": ".planning/knowledge/DOCUMENT_INDEX.json, DOCUMENT_EXTRACT_REPORT.md, extracted/",
  "pik-docs-diff": ".planning/knowledge/DOCUMENT_DIFF.md",
  "pik-docs-citations": ".planning/knowledge/CITATIONS.md",
  "pik-docs-index": ".planning/knowledge/RAG_INDEX_HANDOFF.md, 可选 RAG_INDEX_RESULT.md",
  "pik-docs-query": ".planning/knowledge/DOCS_QUERY_RESULT.md/json 或 RAG_QUERY_RESULT.md",
  "pik-docs-sync": ".planning/knowledge/DOCS_SYNC.md/json, 可选 RAG_INDEX_RESULT.md",
  "pik-answer-audit": ".planning/quality/ANSWER_AUDIT.md/json",
  "pik-rag-init-local": "graphrag-workspace/settings.yaml, graphrag-workspace/input/, .planning/knowledge/LOCAL_RAG_STATUS.md",
  "pik-rag-golden-add": ".planning/knowledge/rag-golden/*.json",
  "pik-rag-golden-run": ".planning/quality/RAG_GOLDEN_RUN.md/json",
  "pik-rag-eval": ".planning/quality/RAG_EVAL.md/json",
  "pik-preflight": ".planning/refresh/PREFLIGHT.md/json",
  "pik-refresh-plan": ".planning/refresh/REFRESH_PLAN.md/json",
  "pik-refresh-run": ".planning/refresh/REFRESH_RUN.md, REFRESH_STATE.json",
  "pik-mode-status": ".planning/refresh/MODE.md",
  "pik-mode-set": ".planning/config.json, .planning/refresh/MODE.md",
  "pik-citation-audit": ".planning/quality/CITATION_AUDIT.md/json",
  "pik-trace-build": ".planning/trace/TRACE_MATRIX.md/json",
  "pik-trace-query": "stdout trace query result",
  "pik-trace-audit": ".planning/trace/TRACE_AUDIT.md/json",
  "pik-policy-list": ".planning/policies/POLICY_LIST.md",
  "pik-policy-check": ".planning/policies/POLICY_CHECK.md/json",
  "pik-policy-explain": ".planning/policies/POLICY_EXPLAIN.md",
  "pik-policy-lock": ".planning/policies/POLICY_LOCK.md/json",
  "pik-policy-verify": ".planning/policies/POLICY_VERIFY.md/json",
  "pik-policy-diff": ".planning/policies/POLICY_DIFF.md/json",
  "pik-help-skills": ".planning/help/HELP_SKILLS.md/json",
  "pik-privacy-audit": ".planning/knowledge/PRIVACY_AUDIT.md",
  "pik-offline-lock": ".planning/privacy/OFFLINE_LOCK.md/json",
  "pik-outbound-audit": ".planning/privacy/OUTBOUND_AUDIT.md/json",
  "pik-license-audit": "verification/reports/license-audit.md 或 .planning/license-audit.md",
  "pik-graph-build": ".planning/graphs/GRAPH_BUILD_HANDOFF.md, 可选 graph.json / GRAPH_REPORT.md / GRAPH_BUILD_RESULT.md",
  "pik-graph-status": "stdout code map status",
  "pik-graph-query": "stdout code map matches",
  "pik-graph-diff": ".planning/graphs/GRAPH_DIFF.md",
  "pik-graph-impact": ".planning/graphs/GRAPH_IMPACT.md/json",
  "pik-graph-risk": ".planning/graphs/GRAPH_RISK.md/json",
  "pik-graph-freshness": ".planning/graphs/GRAPH_FRESHNESS.md/json",
  "pik-evidence-record": ".planning/evidence/*.md, .planning/evidence/INDEX.md, 可选 writeback",
  "pik-evidence-status": ".planning/evidence/INDEX.md 和 stdout summary",
  "pik-runtime-install": "Codex/Claude Code skills 或 GitHub Copilot prompts",
  "pik-runtime-status": "stdout runtime pack 渲染状态",
  "pik-context-debug": ".planning/context/*debug*.md 和 handoff",
  "pik-context-execute": ".planning/context/*execute*.md 和 handoff",
  "pik-workflow-run": ".planning/workflows/<id>/WORKFLOW_STATE.md/json, WORKFLOW_FACADE.md/json",
  "pik-workflow-status": "stdout gate 状态",
  "pik-workflow-continue": ".planning/workflows/<id>/WORKFLOW_STATE.md/json",
  "pik-workflow-audit": ".planning/workflows/<id>/WORKFLOW_AUDIT.md",
  "pik-gate-check": "stdout gate result",
  "pik-completion-check": "stdout completion allowed/blocked",
  "pik-cockpit-build": ".planning/cockpit/index.html, cockpit-data.json, COCKPIT_REPORT.md, assets/",
};

const PUBLIC_WORKFLOW_OUTPUT = ".planning/context/*, .planning/context/handoffs/*, .planning/workflows/<id>/WORKFLOW_FACADE.md/json";
for (const command of [
  "pik-new-milestone",
  "pik-spec-phase",
  "pik-discuss-phase",
  "pik-ui-phase",
  "pik-debug",
  "pik-plan-phase",
  "pik-execute-phase",
  "pik-code-review",
  "pik-verify-work",
  "pik-complete-milestone",
]) {
  OUTPUTS[command] = PUBLIC_WORKFLOW_OUTPUT;
}

function categoryFor(command) {
  if (["pik", "pik-init", "pik-verify", "pik-map"].includes(command)) return "接入 / 初始化";
  if (command.startsWith("pik-codebase")) return "Codebase";
  if (command.startsWith("pik-docs") || command.startsWith("pik-rag") || command === "pik-answer-audit" || command === "pik-citation-audit") return "文档 / RAG";
  if (command.startsWith("pik-graph")) return "Graphify / 代码地图";
  if (command.startsWith("pik-refresh") || command.startsWith("pik-mode") || command === "pik-preflight") return "Refresh / Mode";
  if (command.startsWith("pik-evidence") || command.startsWith("pik-trace")) return "Evidence / Trace";
  if (command.startsWith("pik-policy") || command.startsWith("pik-privacy") || command.startsWith("pik-offline") || command.startsWith("pik-outbound") || command.startsWith("pik-license")) return "Policy / Privacy";
  if (command.startsWith("pik-runtime") || command.startsWith("pik-context")) return "Runtime / Skills";
  if (["pik-new-milestone", "pik-spec-phase", "pik-discuss-phase", "pik-ui-phase", "pik-debug", "pik-plan-phase", "pik-execute-phase", "pik-code-review", "pik-verify-work", "pik-complete-milestone"].includes(command)) return "Workflow 主循环";
  if (command.startsWith("pik-workflow") || command === "pik-gate-check" || command === "pik-completion-check") return "Workflow Guard";
  if (command === "pik-cockpit-build") return "可视化 / Cockpit";
  return "Help / Status";
}

function heavyRefreshFor(command) {
  if (command === "pik-docs-sync") return "默认否；只有 --index 才会显式执行 configured GraphRAG index。";
  if (command === "pik-docs-index") return "默认否；只有 --run 才会执行 configured GraphRAG index。";
  if (command === "pik-graph-build") return "默认否；只有 --run 才会执行 configured Graphify / code map build。";
  if (command === "pik-refresh-run") return "是；这是显式刷新命令，只在用户或 policy 明确要求时使用。";
  if (command === "pik-cockpit-build") return "否；只读取已有本地 artifact，生成静态 HTML，不执行 GraphRAG index 或 Graphify build。";
  return "否；只做轻量检查、状态读取、报告写入或 workflow 编排。";
}

function usageFor(command) {
  const target = '--target "$PWD"';
  const samples = {
    pik: "pik --help\nnode bin/pik.mjs --help",
    "pik-init": `pik-init ${target} --template brownfield-monorepo --name existing_project --mode existing`,
    "pik-verify": `pik-verify ${target}`,
    "pik-map": `pik-map ${target}`,
    "pik-codebase": `pik-codebase ${target}`,
    "pik-codebase-scan": `pik-codebase-scan ${target}`,
    "pik-codebase-status": `pik-codebase-status ${target}`,
    "pik-docs-scan": `pik-docs-scan ${target}`,
    "pik-docs-status": `pik-docs-status ${target}`,
    "pik-docs-normalize": `pik-docs-normalize ${target}`,
    "pik-docs-extract": `pik-docs-extract ${target}`,
    "pik-docs-diff": `pik-docs-diff ${target}`,
    "pik-docs-citations": `pik-docs-citations ${target} "代理承認 上限"`,
    "pik-docs-index": `pik-docs-index ${target}\npik-docs-index ${target} --run`,
    "pik-docs-query": `pik-docs-query ${target} "代理承認 上限"\npik-docs-query ${target} --rag "代理承認の仕様根拠は？"`,
    "pik-docs-sync": `pik-docs-sync ${target}\npik-docs-sync ${target} --index`,
    "pik-answer-audit": `pik-answer-audit ${target}\npik-answer-audit ${target} --from .planning/knowledge/DOCS_QUERY_RESULT.md`,
    "pik-rag-init-local": `pik-rag-init-local ${target}`,
    "pik-rag-golden-add": `pik-rag-golden-add ${target} --question "代理承認の上限は？" --expect "30,000" --citation "docs/spec.md:12"`,
    "pik-rag-golden-run": `pik-rag-golden-run ${target}`,
    "pik-rag-eval": `pik-rag-eval ${target}`,
    "pik-preflight": `pik-preflight ${target}`,
    "pik-refresh-plan": `pik-refresh-plan ${target}`,
    "pik-refresh-run": `pik-refresh-run ${target} --graph\npik-refresh-run ${target} --rag`,
    "pik-mode-status": `pik-mode-status ${target}`,
    "pik-mode-set": `pik-mode-set ${target} graph-lite\npik-mode-set ${target} full-strict`,
    "pik-citation-audit": `pik-citation-audit ${target}`,
    "pik-trace-build": `pik-trace-build ${target}`,
    "pik-trace-query": `pik-trace-query ${target} "代理承認"`,
    "pik-trace-audit": `pik-trace-audit ${target}`,
    "pik-policy-list": `pik-policy-list ${target}`,
    "pik-policy-check": `pik-policy-check ${target}`,
    "pik-policy-explain": `pik-policy-explain ${target} privacy.local_only`,
    "pik-policy-lock": `pik-offline-lock ${target}\npik-policy-lock ${target}`,
    "pik-policy-verify": `pik-policy-verify ${target}`,
    "pik-policy-diff": `pik-policy-diff ${target}`,
    "pik-help-skills": `pik-help-skills ${target} "文档更新后确认影响面"`,
    "pik-privacy-audit": `pik-privacy-audit ${target} --strict`,
    "pik-offline-lock": `pik-offline-lock ${target}`,
    "pik-outbound-audit": `pik-outbound-audit ${target}`,
    "pik-license-audit": `pik-license-audit ${target}`,
    "pik-graph-build": `pik-graph-build ${target}\npik-graph-build ${target} --run`,
    "pik-graph-status": `pik-graph-status ${target}`,
    "pik-graph-query": `pik-graph-query ${target} "PaymentService"`,
    "pik-graph-diff": `pik-graph-diff ${target} --save-baseline\npik-graph-diff ${target}`,
    "pik-graph-impact": `pik-graph-impact ${target} --files "src/approval.js"`,
    "pik-graph-risk": `pik-graph-risk ${target}`,
    "pik-graph-freshness": `pik-graph-freshness ${target} --strict`,
    "pik-evidence-record": `pik-evidence-record ${target} "代理承認上限修正を検証済み" --command "npm test" --result "passed" --writeback .planning/issues/CR-017.md`,
    "pik-evidence-status": `pik-evidence-status ${target}`,
    "pik-runtime-install": `pik-runtime-install --runtime codex --dest ~/.codex/skills`,
    "pik-runtime-status": `pik-runtime-status --runtime codex --dest ~/.codex/skills`,
    "pik-context-debug": `pik-context-debug ${target} "代理承認上限が仕様と違う"`,
    "pik-context-execute": `pik-context-execute ${target} "承認上限チェックを実装"`,
    "pik-workflow-run": `pik-workflow-run ${target} debug "生产审批金额异常"`,
    "pik-workflow-status": `pik-workflow-status ${target}`,
    "pik-workflow-continue": `pik-workflow-continue ${target} --gate plan --evidence "PLAN.md reviewed"`,
    "pik-workflow-audit": `pik-workflow-audit ${target}`,
    "pik-gate-check": `pik-gate-check ${target}`,
    "pik-completion-check": `pik-completion-check ${target}`,
    "pik-cockpit-build": `pik-cockpit-build ${target}`,
  };
  if (samples[command]) return samples[command];
  return `${command} ${target} "当前任务说明"`;
}

function paramsFor(command) {
  const params = ["--target <repo>: 指定目标项目目录。"];
  if (command === "pik") return ["--help: 查看命令帮助。"];
  if (command === "pik-init") params.push("--template <name>: 选择初始化模板。", "--name <name>: 写入项目名。", "--mode new|existing: 指定新项目或既存项目。", "--force: 覆盖已有模板文件。");
  if (command.includes("docs-query")) params.push("--rag: 使用 configured RAG query command。");
  if (command === "pik-docs-sync") params.push("--index: 显式允许同步后执行 GraphRAG index。");
  if (command === "pik-docs-index" || command === "pik-graph-build") params.push("--run: 显式执行配置的外部工具命令。");
  if (command === "pik-answer-audit") params.push("--from <file>: 指定回答来源文件。", "--answer <text>: 调试用，直接传入回答文本。");
  if (command === "pik-refresh-run") params.push("--rag: 刷新 RAG。", "--graph: 刷新 Graphify/code map。", "--all: 两者都刷新。", "--force: 忽略普通跳过建议。");
  if (command === "pik-mode-set") params.push("graph-lite|default-local-rag|full-strict: 目标执行 profile。");
  if (command === "pik-graph-impact") params.push("--files <paths>: 逗号分隔的变更文件。");
  if (command === "pik-evidence-record") params.push("--command <cmd>: 记录验证命令。", "--result <text>: 记录验证结果。", "--source <paths>: 记录依据来源。", "--writeback <file>: 回写到工作记录。");
  if (command === "pik-runtime-install" || command === "pik-runtime-status") return ["--runtime codex|claude-code|github-copilot: 目标 runtime。", "--dest <dir>: 安装或检查目录。", "--force: 安装时覆盖已有文件。"];
  if (command === "pik-workflow-continue") params.push("--gate plan|implementation|verification: 标记人工 gate。", "--evidence <text>: gate 证据。");
  if (command.startsWith("pik-policy") || command.startsWith("pik-privacy") || command === "pik-preflight" || command === "pik-graph-freshness") params.push("--strict: 以严格 profile 语义处理失败。");
  return params;
}

function purposeFor(command) {
  const category = categoryFor(command);
  if (category === "接入 / 初始化") return "把 AI-PIKit 本地 intelligence layer 接入项目，或检查接入状态是否完整。";
  if (category === "Codebase") return "建立或读取代码基线，让后续 AI 修改先知道项目结构、技术栈、测试入口和源码数量。";
  if (category === "文档 / RAG") return "把 仕様書、QA、議事録、设计文档转成本地可查、可引用、可审计的知识证据。";
  if (category === "Graphify / 代码地图") return "读取或更新 Graphify/code map，帮助判断改修影响面、风险模块和 stale 状态。";
  if (category === "Refresh / Mode") return "控制刷新预算和 profile，避免每个任务都重跑 GraphRAG 或 Graphify。";
  if (category === "Evidence / Trace") return "把验证结果、仕様依据、代码影响和测试覆盖写成可追踪证据。";
  if (category === "Policy / Privacy") return "锁定并验证 local-only、offline、policy 和 license 风险边界。";
  if (category === "Runtime / Skills") return "让 Codex、Claude Code、GitHub Copilot 能通过同一套 AI-PIKit 命令工作。";
  if (category === "Workflow 主循环") return "面向日常开发的公开工作流入口，内部会写 context、handoff、workflow facade 和 gate 状态。";
  if (category === "Workflow Guard") return "检查 workflow 是否具备 plan、implementation、verification、evidence、writeback 等完成条件。";
  if (category === "可视化 / Cockpit") return "把 Graphify、GraphRAG/RAG、workflow、quality、privacy 和 evidence 状态聚合成本地静态驾驶舱。";
  return "根据场景给出下一步 AI-PIKit 命令建议或状态入口。";
}

function whenFor(command) {
  if (command === "pik-docs-sync") return "文档第一次导入、仕様/QA/議事録更新、或文档 gate 需要重新确认时。";
  if (command === "pik-answer-audit") return "做完 docs/RAG query 后，或 AI 给出带规格结论的回答后。";
  if (command === "pik-preflight") return "进入 debug、plan、execute 前，确认 RAG/Graphify 是否 stale。";
  if (command === "pik-refresh-run") return "只有 refresh plan 或 strict policy 明确要求刷新时。";
  if (command === "pik-completion-check") return "AI 或开发者准备声明任务完成前。";
  if (command === "pik-cockpit-build") return "需要给自己或 leader 看项目健康度、Graphify 影响面、RAG 证据链和质量闭环状态时。";
  if (command.startsWith("pik-policy")) return "保密项目、交付前、或 `.planning/config.json` 有变更后。";
  if (command.startsWith("pik-runtime")) return "需要在 Codex、Claude Code、GitHub Copilot 中调用 AI-PIKit skills/prompts 时。";
  if (command.startsWith("pik-graph")) return "改修前看影响面、改修后验证结构变化、或 graph gate 报 stale 时。";
  if (command.startsWith("pik-docs") || command.startsWith("pik-rag") || command === "pik-citation-audit") return "需要查询或证明项目文档中的规格依据时。";
  if (command.startsWith("pik-workflow") || command === "pik-gate-check") return "需要调试、恢复或审计当前 workflow gate 时。";
  if (categoryFor(command) === "Workflow 主循环") return "日常改修、新规开发、缺陷调查、审查、验证和收口时。";
  return "项目接入、开发循环或完成前检查需要对应状态时。";
}

function defaultBehaviorFor(command) {
  if (command === "pik-docs-sync") return "默认只跑 scan / diff / extract / citation audit，发现变更只写 STALE_NEEDS_REFRESH，不自动重建 index。";
  if (command === "pik-docs-index") return "默认只写 handoff；带 --run 才执行 configured index_command。";
  if (command === "pik-graph-build") return "默认只写 handoff；带 --run 才执行 configured Graphify/code map command。";
  if (command === "pik-refresh-run") return "显式刷新命令，会根据参数执行 RAG、Graphify 或两者，并更新 REFRESH_STATE。";
  if (command.startsWith("pik-policy")) return "只做轻量 policy/privacy/preflight/citation/freshness 检查，不触发 GraphRAG index 或 Graphify build。";
  if (command === "pik-cockpit-build") return "读取 `templates/cockpit/index.template.html`，注入目标项目的本地 `cockpit-data.json` 和稳定 `cockpit-viewmodel.v1`，生成带搜索、节点详情、legend 过滤和大图聚合的静态 HTML；默认不联网、不调用外部 LLM、不刷新 Graphify/RAG。稳定展示样例见 `templates/cockpit/sample.html`。";
  if (categoryFor(command) === "Workflow 主循环") return "启动 guarded workflow，写 context/handoff/facade，并输出 heavy refresh executed: no。";
  return "读取本地项目状态并写入对应 `.planning/` 报告，不默认执行重刷新。";
}

function failureFor(command) {
  if (command.startsWith("pik-docs")) return "常见失败：缺文档抽取或没有命中。先运行 `pik-docs-sync --target \"$PWD\"`。";
  if (command.startsWith("pik-graph")) return "常见失败：`.planning/graphs/graph.json` 或 `GRAPH_REPORT.md` 缺失。先运行 `pik-graph-build --target \"$PWD\" --run`。";
  if (command.startsWith("pik-policy")) return "常见失败：offline lock 缺失、配置漂移、外部 provider、API key 形态或 stale 在 strict profile 下被阻断。";
  if (command.startsWith("pik-workflow") || command === "pik-completion-check" || command === "pik-gate-check") return "常见失败：缺 plan / implementation / verification / evidence / writeback，按 WORKFLOW_AUDIT.md 的 next command 补齐。";
  if (command.startsWith("pik-runtime")) return "常见失败：目标目录缺文件或模板未渲染。重跑 install 并检查 runtime status。";
  if (command === "pik-cockpit-build") return "常见失败：真实项目 Graphify/RAG artifact 缺失会显示 WAIVED_WITH_RISK。先看 `templates/cockpit/sample.html` 确认目标形态；图过大时 cockpit 会自动使用 aggregated-community 预览；需要最新图时显式运行 `pik-graph-build --target \"$PWD\" --run`。";
  return "常见失败：目标项目未初始化或缺少 `.planning/`。先运行 `pik-init --target \"$PWD\"`。";
}

function relatedFor(command) {
  if (command.startsWith("pik-docs") || command.startsWith("pik-rag") || command === "pik-answer-audit" || command === "pik-citation-audit") return ["pik-docs-sync", "pik-docs-query", "pik-answer-audit", "pik-citation-audit"];
  if (command.startsWith("pik-graph")) return ["pik-graph-build", "pik-graph-status", "pik-graph-query", "pik-graph-freshness"];
  if (command.startsWith("pik-policy") || command.startsWith("pik-privacy") || command.startsWith("pik-offline")) return ["pik-offline-lock", "pik-privacy-audit", "pik-policy-lock", "pik-policy-verify", "pik-policy-diff"];
  if (command.startsWith("pik-runtime")) return ["pik-runtime-install", "pik-runtime-status", "pik-help-skills"];
  if (categoryFor(command).startsWith("Workflow")) return ["pik-workflow-status", "pik-workflow-audit", "pik-evidence-record", "pik-completion-check"];
  if (command === "pik-cockpit-build") return ["pik-graph-status", "pik-docs-sync", "pik-answer-audit", "pik-privacy-audit"];
  return ["pik-verify", "pik-preflight", "pik-help-skills"];
}

function scenarioFor(command) {
  if (command.startsWith("pik-docs") || command.startsWith("pik-rag") || command === "pik-answer-audit") return "文档更新循环、规格依据确认、回答可信度检查。";
  if (command.startsWith("pik-graph")) return "改修影响面、新规设计影响、代码审查前风险确认。";
  if (command.startsWith("pik-policy") || command.startsWith("pik-privacy") || command.startsWith("pik-offline")) return "保密项目、交付前检查、外发风险审计。";
  if (command === "pik-cockpit-build") return "leader 演示、项目状态自查、交付前展示 Graphify/RAG/evidence/quality 状态。";
  if (categoryFor(command) === "Workflow 主循环") return "从需求、调查、计划、实施、验证到完成的开发主循环。";
  if (categoryFor(command) === "Workflow Guard") return "AI 声称完成前、接手中断任务、或 gate 失败排查。";
  return "项目接入、日常状态确认和质量闭环。";
}

export function buildCommandCatalog(pkg) {
  const commands = Object.keys(pkg.bin || {})
    .filter((name) => name === "pik" || name.startsWith("pik-"));
  return commands.map((command, index) => ({
    index,
    command,
    logicalName: LOGICAL_NAMES[command] || command.replace(/^pik-?/, "").replace(/-/g, " "),
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
