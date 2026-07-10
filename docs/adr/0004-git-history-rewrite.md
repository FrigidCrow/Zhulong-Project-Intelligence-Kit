# ADR 0004：Git 历史瘦身与 clone 验收边界

- 状态：已接受并执行
- 日期：2026-07-10

## 背景

早期提交包含大量验证截图、图标候选和可再生成报告，导致 Git pack 约 172 MiB。当前仓库没有外部协作者或已发布版本，适合在完整备份和所有者确认后进行一次历史瘦身。

## 决策

使用 `git filter-repo` 从所有本地候选引用中移除以下历史路径，同时保留当前正式文件树：

- `verification/reports`
- `docs/assets/zhulong-icon-variants`
- `docs/assets/zhulong-selected-variants`
- `docs/assets/zhulong-icon-concept.png`

远端只替换 `main` 与 `agent/general-project-modes-motion` 两个可写分支。操作使用精确 `--force-with-lease`，ruleset 只在维护窗口内临时停用并立即恢复。

## 验证结果

- 改写前后 `main^{tree}` 均为 `7837a5583f7e13aec55a8242c589443ac81d52fa`。
- 远端 `main` 从 `c6c7fbbb...` 替换为 `0351dc03...`。
- GitHub 全新普通 clone 的 pack 为 3.30 MiB，低于 20 MiB 门槛。
- Node.js 24 / npm 11.18 的发布级验证为 40/40 PASS。
- 新 SHA 上的 CI、CodeQL 与 Pages 部署均成功。

## 边界

GitHub 的 `refs/pull/*` 是只读引用，旧 PR 可能继续保留改写前对象。因此，20 MiB 门槛定义为普通开发者 clone，不包含拉取全部 PR 引用的 mirror clone。

若未来必须缩小 mirror clone，应另行评估新建干净仓库并迁移仓库名；不得把删除现有仓库作为常规维护操作。

## 回滚

仓库外保留改写前 mirror 与完整 bundle。发生不可接受问题时，使用相反方向的精确 lease 推送恢复两个分支，并立即恢复 ruleset、CI 与 Pages 验证。
