# 参与 Zhulong 开发

感谢你愿意改进 Zhulong Project Intelligence Kit。提交 Issue 或 Pull Request 前，请先阅读 [行为规范](CODE_OF_CONDUCT.md) 和 [安全政策](SECURITY.md)。

## 开发环境

- Node.js 24。
- npm 11.12.1。
- Git。

```bash
git clone https://github.com/FrigidCrow/Zhulong-Project-Intelligence-Kit.git
cd Zhulong-Project-Intelligence-Kit
npm ci --ignore-scripts
npm run check
```

## 贡献流程

1. 先搜索现有 Issue，避免重复工作。
2. 对较大的功能或行为变更，先创建 Issue 说明问题、边界和验证方式。
3. 从最新 `main` 创建短生命周期分支。
4. 保持修改聚焦，不在同一 Pull Request 中混入无关重构。
5. 为行为变化补充 verifier、fixture 或明确的复现步骤。
6. 更新受影响的 README、命令手册、技术指南和 changelog。
7. 提交 Pull Request，并完成模板中的检查项。

生成命令手册与 cockpit 样例：

```bash
node scripts/render-commands-doc.mjs
npm run build:cockpit-sample
```

最低验证要求：

```bash
npm run check
npm run verify:docs
npm run verify:naming
npm run verify:design
npm run verify:pages
```

涉及 CLI、runtime、workflow、RAG、Graphify、隐私或发布配置时，还需要运行：

```bash
npm run verify:quality
npm run verify:full-command-surface
npm run verify:quality-closure
```

## 提交与许可证

提交信息应使用简短的祈使句，并说明修改目的。向本仓库提交贡献，即表示你同意按照 [Apache License 2.0](LICENSE) 授权该贡献。

不要提交真实客户资料、密钥、token、内部项目 `.planning/` 制品、GraphRAG 工作目录或未经确认许可的第三方内容。
