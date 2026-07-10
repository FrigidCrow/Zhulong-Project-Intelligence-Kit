import fs from "node:fs";
import path from "node:path";
import { buildCommandCatalog, CATEGORY_ORDER } from "./command-catalog.mjs";
import { kitRoot } from "./quality-utils.mjs";

const pkg = JSON.parse(fs.readFileSync(path.join(kitRoot, "package.json"), "utf8"));
const catalog = buildCommandCatalog(pkg);

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatInlineCode(value) {
  return escapeHtml(value).replace(/`([^`\n]+)`/g, "<code>$1</code>");
}

function commandLink(command, label = command) {
  return `<a href="#cmd-${escapeHtml(command)}"><code>${escapeHtml(label)}</code></a>`;
}

function rowsForCategory(category) {
  return catalog
    .filter((item) => item.category === category)
    .map((item) => `                <tr>
                  <td>${commandLink(item.command)}</td>
                  <td><a data-logical-command="${escapeHtml(item.command)}" href="#cmd-${escapeHtml(item.command)}">${escapeHtml(item.logicalName)}</a></td>
                  <td>${escapeHtml(item.category)}</td>
                  <td>${escapeHtml(item.heavyRefresh)}</td>
                  <td><code>${escapeHtml(item.outputs)}</code></td>
                </tr>`)
    .join("\n");
}

function detailSection(item) {
  const related = item.related
    .map((command) => catalog.some((entry) => entry.command === command) ? commandLink(command) : `<code>${escapeHtml(command)}</code>`)
    .join(" ");
  return `            <section id="cmd-${escapeHtml(item.command)}" class="command-card command-detail" data-command="${escapeHtml(item.command)}">
              <header>
                <h3>${commandLink(item.command)}</h3>
                <span class="tag">${escapeHtml(item.logicalName)}</span>
              </header>
              <div class="command-body">
                <dl class="detail-list">
                  <div><dt>命令物理名</dt><dd><code>${escapeHtml(item.command)}</code></dd></div>
                  <div><dt>命令逻辑名</dt><dd>${escapeHtml(item.logicalName)}</dd></div>
                  <div><dt>用途</dt><dd>${formatInlineCode(item.purpose)}</dd></div>
                  <div><dt>什么时候用</dt><dd>${formatInlineCode(item.when)}</dd></div>
                  <div><dt>基本语法</dt><dd><pre class="code-block"><code>${escapeHtml(item.usage)}</code></pre></dd></div>
                  <div><dt>参数说明</dt><dd><ul>${item.params.map((param) => `<li>${formatInlineCode(param)}</li>`).join("")}</ul></dd></div>
                  <div><dt>默认行为</dt><dd>${formatInlineCode(item.defaultBehavior)}</dd></div>
                  <div><dt>是否触发 heavy refresh</dt><dd>${escapeHtml(item.heavyRefresh)}</dd></div>
                  <div><dt>输出文件 / 报告路径</dt><dd><code>${escapeHtml(item.outputs)}</code></dd></div>
                  <div><dt>成功示例</dt><dd><pre class="code-block"><code>${escapeHtml(item.successExample)}</code></pre></dd></div>
                  <div><dt>常见失败示例</dt><dd>${formatInlineCode(item.failureExample)}</dd></div>
                  <div><dt>关联命令</dt><dd>${related}</dd></div>
                  <div><dt>适用场景</dt><dd>${formatInlineCode(item.scenario)}</dd></div>
                </dl>
              </div>
            </section>`;
}

const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Zhulong Project Intelligence Kit - 命令使用手册</title>
  <meta name="description" content="Zhulong 全量 zl-* 命令用法、示例、产物和项目接入步骤。">
  <link rel="stylesheet" href="assets/zl-site.css">
</head>
<body>
  <a class="skip-link" href="#main">跳到正文</a>
  <header class="topbar">
    <a class="brand-mark" href="product.html">Zhulong Project Intelligence Kit</a>
    <nav class="nav" aria-label="主导航">
      <a href="product.html">产品</a>
      <a href="commands.html" aria-current="page">命令</a>
      <a href="technical-guide.html">技术教程</a>
      <a href="quality-dashboard.html">QA</a>
      <a href="../verification/reports/latest.md">验证报告</a>
    </nav>
  </header>

  <main id="main">
    <section class="page-title">
      <p class="eyebrow">命令手册</p>
      <h1>${catalog.length} 条命令，一条工作路径。</h1>
      <p>按物理命令和逻辑用途索引全部 CLI 入口。日常只需记住 workflow 主循环，其余能力由本地 gate 串联。</p>
    </section>

    <section class="section">
      <div class="section-header">
        <h2>开发者心智模型</h2>
        <p>新项目先接入，既有项目先建基线；日常通过 workflow 命令启动，文档/RAG、Graphify、policy、evidence 都作为本地 guard 和证据层参与。</p>
      </div>
      <div class="route-map" aria-label="Zhulong 执行管道路径">
        <div class="route-map-header">
          <span>日常执行路径</span>
          <span class="status-pill">local-only 默认</span>
        </div>
        <div class="stage-flow command-flow">
          <code class="active">zl-init</code>
          <code>zl-codebase-scan</code>
          <code>zl-docs-sync</code>
          <code>zl-answer-audit</code>
          <code>zl-preflight</code>
          <code>zl-graph-build</code>
          <code>zl-debug</code>
          <code>zl-evidence-record</code>
          <code>zl-completion-check</code>
        </div>
      </div>
    </section>

    <div class="doc-layout">
      <aside class="toc" aria-label="目录">
        <a href="#rules">通用规则</a>
        <a href="#new-project">新项目接入</a>
        <a href="#existing-project">既有项目接入</a>
        <a href="#daily-loop">日常开发循环</a>
        <a href="#docs-update-loop">文档更新循环</a>
        <a href="#quality-loop">质量验证循环</a>
        <a href="#command-overview">命令分类一览</a>
        <a href="#all-commands">全命令详情</a>
      </aside>

      <div>
        <section id="rules" class="page-section">
          <h2>通用规则</h2>
          <p>安装 bin 后推荐直接使用 <code>zl-*</code>。未安装全局 bin 时，可以在 Zhulong 仓库里使用 <code>node bin/zl.mjs &lt;subcommand&gt;</code>。默认流程必须是 local-only、no hidden heavy refresh；只有显式 <code>--run</code>、<code>--index</code> 或 <code>zl-refresh-run</code> 才允许重任务。</p>
          <pre class="code-block"><code>zl-docs-sync --target /path/to/repo
node bin/zl.mjs docs sync --target /path/to/repo</code></pre>
        </section>

        <section id="new-project" class="page-section">
          <h2>新项目从 0 接入</h2>
          <p>先接入 Zhulong，再安装 runtime pack，然后建立代码、文档、本地 RAG 和 Graphify 基线，最后进入第一次 milestone。</p>
          <pre class="code-block"><code>cd /path/to/new-project

zl-init --target "$PWD" --template greenfield-app --name my_new_project --mode new
zl-runtime-install --runtime codex --dest ~/.codex/skills --force
zl-runtime-install --runtime claude-code --dest ~/.claude/skills --force
zl-runtime-install --runtime github-copilot --dest .github/prompts --force

zl-codebase-scan --target "$PWD"
zl-docs-sync --target "$PWD"
zl-rag-init-local --target "$PWD"
zl-graph-build --target "$PWD" --run

zl-new-milestone --target "$PWD" "MVP1 walking skeleton"
zl-spec-phase --target "$PWD" "整理 MVP1 仕様"
zl-plan-phase --target "$PWD" "MVP1 phase 1"
zl-execute-phase --target "$PWD" "实现第一条纵向链路"
zl-verify-work --target "$PWD" "验证 MVP1 phase 1"
zl-complete-milestone --target "$PWD" "MVP1 walking skeleton"</code></pre>
        </section>

        <section id="existing-project" class="page-section">
          <h2>既有项目接入</h2>
          <p>既有项目不要移动原源码。Zhulong 只叠加 <code>.planning/</code>，先扫描已有代码和文档，再从当前真实改修任务进入第一次 workflow。</p>
          <pre class="code-block"><code>cd /path/to/existing-project

zl-init --target "$PWD" --template brownfield-monorepo --name existing_project --mode existing
zl-codebase-scan --target "$PWD"
zl-codebase-status --target "$PWD"

zl-docs-sync --target "$PWD"
zl-rag-init-local --target "$PWD"
zl-graph-build --target "$PWD" --run
zl-preflight --target "$PWD"

zl-debug --target "$PWD" "生产审批金额异常"</code></pre>
        </section>

        <section id="daily-loop" class="page-section">
          <h2>日常开发循环</h2>
          <p>日常优先使用 workflow 主循环命令。GraphRAG、Graphify、policy、evidence 会作为 guard 和 next command 被串起来，不需要开发者每次手动想一遍。</p>
          <pre class="code-block"><code>zl-new-milestone --target "$PWD" "CR-017 代理承認上限修正"
zl-spec-phase --target "$PWD" "確認仕様と QA"
zl-discuss-phase --target "$PWD" "确认实现策略"
zl-plan-phase --target "$PWD" "拆分实现和验证"
zl-execute-phase --target "$PWD" "实施改修"
zl-verify-work --target "$PWD" "跑测试并记录证据"
zl-complete-milestone --target "$PWD" "CR-017 收口"</code></pre>
        </section>

        <section id="docs-update-loop" class="page-section">
          <h2>文档更新循环</h2>
          <p>文档更新后默认只跑轻量同步，不自动重建 GraphRAG index。需要重索引时必须显式加 <code>--index</code>，并先确认 local-only 配置没有被改坏。</p>
          <pre class="code-block"><code>zl-docs-sync --target "$PWD"
zl-docs-query --target "$PWD" "代理承認 上限"
zl-answer-audit --target "$PWD"

# 只有明确需要重建本地 GraphRAG index 时才运行
zl-privacy-audit --target "$PWD" --strict
zl-docs-sync --target "$PWD" --index</code></pre>
        </section>

        <section id="quality-loop" class="page-section">
          <h2>质量验证循环</h2>
          <p>开发中用轻量 gate，收口时用质量闭环 gate。所有报告都留在本地仓库的 <code>verification/reports/</code> 或目标项目的 <code>.planning/</code> 下。</p>
          <pre class="code-block"><code>npm run verify:quality
npm run verify:full-command-surface
npm run verify:skills-usability
npm run verify:workflow-closure
npm run verify:cockpit-build
npm run verify:docs-completeness
npm run verify:quality-closure</code></pre>
        </section>

        <section id="command-overview" class="page-section">
          <h2>命令分类一览</h2>
          <p>物理名和逻辑名都可以点击跳到详情。heavy refresh 一列用于判断是否可能触发 GraphRAG index、Graphify build 或 refresh-run。</p>
${CATEGORY_ORDER.map((category) => `          <h3>${escapeHtml(category)}</h3>
          <div class="table-wrap">
            <table>
              <thead><tr><th>物理名</th><th>逻辑名</th><th>分类</th><th>heavy refresh</th><th>主要产物</th></tr></thead>
              <tbody>
${rowsForCategory(category)}
              </tbody>
            </table>
          </div>`).join("\n")}
        </section>

        <section id="all-commands" class="page-section">
          <h2>全命令详情</h2>
          <p>下面每个公开命令都有独立锚点和同一套字段，供 README、runtime pack、QA 脚本和人工查阅共同引用。</p>
          <div class="command-catalog">
${catalog.map(detailSection).join("\n\n")}
          </div>
        </section>
      </div>
    </div>
  </main>

  <footer class="footer">
    <p>命令覆盖以 <code>package.json</code> 的 <code>bin</code> 为准；本页由 <code>scripts/render-commands-doc.mjs</code> 生成。</p>
  </footer>
  <script src="assets/zl-site.js"></script>
</body>
</html>
`;

const outPath = path.join(kitRoot, "docs", "commands.html");
fs.writeFileSync(outPath, html);
console.log(`wrote ${outPath}`);
