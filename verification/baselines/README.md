# Zhulong 稳定验证基线

这个目录只保存经过确认、适合长期引用的验证摘要。它与 `verification/reports/` 的职责不同：

- `baselines/` 进入 Git，用于发布说明、Pages 和版本间比较。
- `reports/` 被 Git 忽略，用于本地运行和当次 CI 的详细 Markdown/JSON 报告。
- `.zl-tmp/visual/` 被 Git 忽略，用于 Playwright 截图。
- CI 会把当次文本报告上传为保留 7 天的 artifact，不把截图和临时报告提交到仓库。

稳定基线不得包含生成时间戳、用户主目录、临时路径或全量命令输出。更新 `latest.json` 和 `latest.md` 时，必须记录来源 commit、Node/npm 版本、关键 gate 结果和分发体积。
