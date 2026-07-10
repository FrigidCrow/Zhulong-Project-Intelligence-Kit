# Zhulong 开源发布五轮复核

日期：2026-07-10

目标：把 Zhulong Project Intelligence Kit 从私有、未授权状态推进到 Apache 2.0、可公开协作、可发布 npm 包并具有渲染文档站的状态。

## 第一轮：代码、命名与许可证基线

发现：`package.json` 仍为 `private: true` 和 `UNLICENSED`，根目录缺少许可证文件，发布门禁会正确阻断。

增强：

- 加入 Apache License 2.0 标准文本。
- npm SPDX 标识改为 `Apache-2.0`，设置 `private: false`。
- 增加公开 homepage、bugs、publish access 和 provenance。
- tarball 强制包含 `LICENSE` 与 `THIRD_PARTY_LICENSES.md`。
- release readiness 强制检查 Apache-2.0 和公开发布元数据。

证据：`verify:license`、`verify:release-readiness`、Apache 官方文本比对。

## 第二轮：README 与渲染文档

发现：README 的 `.html` 相对链接在 GitHub 仓库文件视图中打开的是源码，不是网页。

增强：

- 新增 GitHub Pages 工作流和站点入口。
- README 的产品、命令与技术指南全部改为 Pages URL。
- 发布 cockpit 样例和验证报告，但不发布源码、runtime 或构建脚本。
- 新增 `verify:pages`，检查允许列表、必需页面、符号链接、图标候选和源码目录边界。

证据：本地 HTTP smoke 返回产品页与 cockpit H1；Pages artifact 检查 PASS。

## 第三轮：公开仓库治理与供应链

发现：缺少贡献、安全、行为规范、支持、Issue/PR 模板和自动依赖更新；公开发布状态没有独立 gate。

增强：

- 增加 `CONTRIBUTING.md`、`SECURITY.md`、`CODE_OF_CONDUCT.md` 和 `SUPPORT.md`。
- 增加 Bug/Feature Issue Form、Pull Request 模板和 Dependabot。
- 新增 `verify:public-release`，检查社区文件、Pages 链接、公开 npm 元数据、常见密钥与本机路径。
- GitHub Actions 全部固定完整 commit SHA。

证据：YAML 全部可解析；npm audit 为 0 漏洞；Git 历史常见密钥模式扫描无命中。

## 第四轮：发布级全量验证

环境：Node.js 24.14.0、npm 11.12.1。

结果：

- `verify:quality:release`：PASS。
- Developer Audit：96 / A。
- Quality Control：99 / A，`RELEASE_OK`。
- Integration：132 PASS、0 FAIL、1 个未启用 live GraphRAG 的预期 WARN。
- 命令面：74 / 74。
- npm bin：75。
- Runtime pack：3。
- 视觉：5 页乘 3 种视图，15 / 15。
- Quality Closure：13 / 13，最后一项重新执行 public-release 路径与密钥扫描。
- npm tarball：103 个文件，包含许可证与第三方说明，不包含报告或截图。

## 第五轮：远端公开发布

完成标准：

- 提交推送后 GitHub CI 为绿色。
- 仓库 visibility 为 `PUBLIC`。
- GitHub Pages 启用并可从 README 打开渲染页面。
- 仓库 description、homepage 和 topics 已配置。
- Private Vulnerability Reporting 已启用。
- 默认分支 ruleset 已应用并通过远端读取确认。

此轮证据以 GitHub API、Actions run 和实际 Pages HTTP 响应为准；只有全部满足后才标记开源发布完成。

## 历史边界

当前工作树和未来 verifier 报告会把本机路径替换为 `<kit-root>`、`<home>` 和 `<tmp>`，未来提交使用 GitHub noreply 邮箱。既有 Git 历史可能仍含早期提交邮箱、旧报告路径和大体积截图；未获得明确授权前不执行破坏性的历史改写或强制推送。
